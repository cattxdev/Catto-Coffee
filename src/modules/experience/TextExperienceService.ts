/**
 * @fileoverview Text Experience Service
 * @author Catto Bot Team
 */

import type { PrismaClient } from '../../../generated/prisma';
import { ExperienceType, AuditLogAction } from '../../../generated/prisma';
import logger from '../../utils/logger';
import { ExperienceCalculator } from './services/ExperienceCalculator';
import { ExperienceCacheService } from './services/ExperienceCacheService';
import {
    type ExperienceCalculation,
    type ExperienceGainResult,
    type CooldownResult,
    type ExperienceConfigCache,
    type LeaderboardEntry,
    type LeaderboardOptions,
    type ExperienceStats,
    type AppliedMultiplier,
} from './types';

/**
 * Text Experience Service
 * Orchestrates experience operations using calculator and cache services
 */
export class TextExperienceService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly cache: ExperienceCacheService
    ) {}

    // ============================================================================
    // CORE EXPERIENCE METHODS
    // ============================================================================

    /**
     * Award experience to a user for sending a message
     * @param userId - Discord user ID
     * @param guildId - Discord guild ID
     * @returns Experience gain result or null if XP disabled/on cooldown
     */
    async awardExperience(
        userId: string,
        guildId: string
    ): Promise<ExperienceGainResult | null> {
        try {
            // 1. Check if experience is enabled
            const config = await this.getConfig(guildId);
            if (!config.enabled) {
                return null;
            }

            // 2. Check cooldown
            const cooldown = await this.checkCooldown(userId, guildId);
            if (cooldown.onCooldown) {
                return null;
            }

            // 3. Calculate XP with multipliers
            const calculation = await this.calculateExperience(
                config.minXp,
                config.maxXp,
                userId,
                guildId
            );

            // 4. Get or create user and guild member
            const { user, guild, member } = await this.ensureUserAndGuild(userId, guildId);

            // 5. Update XP and check for level up
            const oldLevel = member.textLevel;
            const newTotalXp = member.textTotalXp + calculation.finalXp;
            const newLevel = ExperienceCalculator.calculateLevel(newTotalXp);
            const leveledUp = newLevel > oldLevel;

            // 6. Update database
            const updatedMember = await this.prisma.guildMember.update({
                where: {
                    guildId_userDiscordId: {
                        guildId: guild.id,
                        userDiscordId: user.discordId,
                    },
                },
                data: {
                    textXp: calculation.finalXp,
                    textTotalXp: newTotalXp,
                    textLevel: newLevel,
                    textMessageCount: { increment: 1 },
                    dailyTextMessages: { increment: 1 },
                    weeklyTextMessages: { increment: 1 },
                    monthlyTextMessages: { increment: 1 },
                },
            });

            // 7. Update global user stats
            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    globalExperience: { increment: calculation.finalXp },
                    totalMessagesCount: { increment: 1 },
                    lastSeenAt: new Date(),
                },
            });

            // 8. Set cooldown
            await this.cache.setCooldown(guildId, userId, config.cooldownSeconds);

            // 9. Handle level up rewards
            const rewards: string[] = [];
            if (leveledUp) {
                const levelRewards = await this.handleLevelUp(
                    user.discordId,
                    guild.id,
                    oldLevel,
                    newLevel
                );
                rewards.push(...levelRewards);

                // Invalidate level cache
                await this.cache.invalidateUserLevel(guildId, userId);
            }

            // 10. Return result
            return {
                calculation,
                levelUp: {
                    leveledUp,
                    oldLevel,
                    newLevel,
                    rewards,
                },
                totalXp: updatedMember.textTotalXp,
                currentLevel: updatedMember.textLevel,
                currentLevelXp: ExperienceCalculator.getXpForCurrentLevel(updatedMember.textTotalXp),
                xpForNextLevel: ExperienceCalculator.getXpRequiredForLevel(newLevel + 1),
            };
        } catch (error) {
            logger.error('Error awarding experience:', error);
            throw error;
        }
    }

    /**
     * Calculate experience with multipliers applied
     */
    private async calculateExperience(
        minXp: number,
        maxXp: number,
        userId: string,
        guildId: string
    ): Promise<ExperienceCalculation> {
        // Generate random base XP
        const baseXp = ExperienceCalculator.generateBaseXp(minXp, maxXp);

        // Get active multipliers
        const multipliers = await this.getActiveMultipliers(userId, guildId);

        // Calculate total multiplier
        let totalMultiplier = 1.0;
        const appliedMultipliers: AppliedMultiplier[] = [];

        for (const mult of multipliers) {
            const decimal = ExperienceCalculator.basisPointsToDecimal(mult.multiplierBps);
            totalMultiplier *= decimal;

            appliedMultipliers.push({
                id: mult.id,
                name: mult.name || 'Multiplier',
                basisPoints: mult.multiplierBps,
                decimal: decimal,
                targetType: mult.targetType,
                targetId: mult.targetId || undefined,
            });
        }

        // Apply multiplier
        const finalXp = Math.floor(baseXp * totalMultiplier);

        return {
            baseXp,
            multiplier: totalMultiplier,
            finalXp,
            appliedMultipliers,
        };
    }

    // ============================================================================
    // COOLDOWN METHODS
    // ============================================================================

    /**
     * Check if user is on cooldown
     */
    async checkCooldown(userId: string, guildId: string): Promise<CooldownResult> {
        const isOnCooldown = await this.cache.isOnCooldown(guildId, userId);
        
        if (!isOnCooldown) {
            return {
                onCooldown: false,
                remainingTime: 0,
                expiresAt: null,
            };
        }

        const ttl = await this.cache.getCooldownTTL(guildId, userId);
        return {
            onCooldown: true,
            remainingTime: ttl * 1000,
            expiresAt: new Date(Date.now() + ttl * 1000),
        };
    }

    // ============================================================================
    // CONFIG METHODS
    // ============================================================================

    /**
     * Get experience configuration (with caching)
     */
    async getConfig(guildId: string): Promise<ExperienceConfigCache> {
        // Try cache first
        const cached = await this.cache.getConfig(guildId);
        if (cached) {
            return cached;
        }

        // Get from database
        const guild = await this.prisma.guild.findUnique({
            where: { discordId: guildId },
            include: {
                experienceConfigs: {
                    where: { type: ExperienceType.TEXT },
                },
            },
        });

        if (!guild || guild.experienceConfigs.length === 0) {
            // Return default config
            const defaultConfig: ExperienceConfigCache = {
                enabled: true,
                minXp: 15,
                maxXp: 25,
                cooldownSeconds: 60,
                type: ExperienceType.TEXT,
                announcementChannelId: null,
                sendLevelUpMessages: true,
                cachedAt: Date.now(),
            };

            // Cache for shorter time since it's default
            await this.cache.setConfig(guildId, defaultConfig, 60);
            return defaultConfig;
        }

        const config = guild.experienceConfigs[0];
        const configCache: ExperienceConfigCache = {
            enabled: config.isEnabled,
            minXp: config.minXp,
            maxXp: config.maxXp,
            cooldownSeconds: config.cooldownSeconds,
            type: config.type,
            announcementChannelId: config.announceChannelId,
            sendLevelUpMessages: config.announceLevel,
            cachedAt: Date.now(),
        };

        // Cache config
        await this.cache.setConfig(guildId, configCache);
        return configCache;
    }

    /**
     * Invalidate config cache
     */
    async invalidateConfigCache(guildId: string): Promise<void> {
        await this.cache.invalidateConfig(guildId);
    }

    // ============================================================================
    // MULTIPLIER METHODS
    // ============================================================================

    /**
     * Get active multipliers for guild (with caching)
     */
    private async getActiveMultipliers(_userId: string, guildId: string) {
        // Try cache first
        const cached = await this.cache.getMultipliers(guildId);
        if (cached) {
            return cached;
        }

        // Get from database
        const guild = await this.prisma.guild.findUnique({
            where: { discordId: guildId },
        });

        if (!guild) {
            return [];
        }

        const now = new Date();
        const multipliers = await this.prisma.experienceMultiplier.findMany({
            where: {
                guildId: guild.id,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: now } },
                ],
            },
        });

        // Cache multipliers
        await this.cache.setMultipliers(guildId, multipliers);
        return multipliers;
    }

    /**
     * Invalidate multipliers cache
     */
    async invalidateMultipliersCache(guildId: string): Promise<void> {
        await this.cache.invalidateMultipliers(guildId);
    }



    // ============================================================================
    // USER/GUILD MANAGEMENT
    // ============================================================================

    /**
     * Ensure user and guild exist in database
     */
    private async ensureUserAndGuild(userId: string, guildId: string) {
        // Upsert user
        const user = await this.prisma.user.upsert({
            where: { discordId: userId },
            create: {
                discordId: userId,
                globalExperience: 0,
                globalLevel: 1,
                totalMessagesCount: 0,
                totalVoiceTimeSeconds: 0,
            },
            update: {},
        });

        // Upsert guild
        const guild = await this.prisma.guild.upsert({
            where: { discordId: guildId },
            create: {
                discordId: guildId,
                name: 'Unknown',
                isPremium: false,
            },
            update: {},
        });

        // Upsert guild member
        const member = await this.prisma.guildMember.upsert({
            where: {
                guildId_userDiscordId: {
                    guildId: guild.id,
                    userDiscordId: user.discordId,
                },
            },
            create: {
                guildId: guild.id,
                userId: user.id,
                userDiscordId: user.discordId,
                textXp: 0,
                textLevel: 1,
                textTotalXp: 0,
                textMessageCount: 0,
            },
            update: {},
        });

        return { user, guild, member };
    }

    // ============================================================================
    // LEVEL UP & REWARDS
    // ============================================================================

    /**
     * Handle level up rewards
     */
    private async handleLevelUp(
        userDiscordId: string,
        guildDbId: string,
        oldLevel: number,
        newLevel: number
    ): Promise<string[]> {
        const rewards: string[] = [];

        // Get rewards for levels between old and new
        const levelRewards = await this.prisma.levelReward.findMany({
            where: {
                guildId: guildDbId,
                level: {
                    gt: oldLevel,
                    lte: newLevel,
                },
            },
            orderBy: { level: 'asc' },
        });

        for (const reward of levelRewards) {
            rewards.push(reward.roleId);

            // Create audit log
            await this.prisma.auditLog.create({
                data: {
                    guildId: guildDbId,
                    userId: userDiscordId,
                    action: AuditLogAction.ROLE_REWARDED,
                    metadata: {
                        level: reward.level,
                        roleId: reward.roleId,
                    },
                },
            }).catch(() => {
                // Ignore audit log errors
            });
        }

        return rewards;
    }

    // ============================================================================
    // LEADERBOARD METHODS
    // ============================================================================

    /**
     * Get leaderboard (with caching)
     */
    async getLeaderboard(
        options: LeaderboardOptions
    ): Promise<LeaderboardEntry[]> {
        const { guildId, period = 'ALL_TIME', limit = 10, offset = 0 } = options;

        // Try cache first
        const cached = await this.cache.getLeaderboard(guildId, period, limit, offset);
        if (cached) {
            return cached;
        }

        // Get from database
        const guild = await this.prisma.guild.findUnique({
            where: { discordId: guildId },
        });

        if (!guild) {
            return [];
        }

        // Build query based on period
        const orderBy = this.getLeaderboardOrderBy(period);

        const members = await this.prisma.guildMember.findMany({
            where: { guildId: guild.id },
            orderBy,
            take: limit,
            skip: offset,
            include: {
                user: {
                    select: {
                        discordId: true,
                    },
                },
            },
        });

        // Format results
        const entries: LeaderboardEntry[] = members.map((member, index) => ({
            id: member.id,
            discordId: member.user.discordId,
            totalXp: member.textTotalXp,
            level: member.textLevel,
            rank: offset + index + 1,
            messageCount: this.getMessageCountForPeriod(member, period),
        }));

        // Cache leaderboard
        await this.cache.setLeaderboard(guildId, period, limit, offset, entries);

        return entries;
    }

    /**
     * Get order by clause for leaderboard query
     */
    private getLeaderboardOrderBy(period: string) {
        switch (period) {
            case 'DAILY':
                return { dailyTextMessages: 'desc' as const };
            case 'WEEKLY':
                return { weeklyTextMessages: 'desc' as const };
            case 'MONTHLY':
                return { monthlyTextMessages: 'desc' as const };
            default:
                return { textTotalXp: 'desc' as const };
        }
    }

    /**
     * Get message count for period
     */
    private getMessageCountForPeriod(member: any, period: string): number {
        switch (period) {
            case 'DAILY':
                return member.dailyTextMessages;
            case 'WEEKLY':
                return member.weeklyTextMessages;
            case 'MONTHLY':
                return member.monthlyTextMessages;
            default:
                return member.textMessageCount;
        }
    }

    /**
     * Invalidate leaderboard cache
     */
    async invalidateLeaderboardCache(guildId: string): Promise<void> {
        await this.cache.invalidateLeaderboard(guildId);
    }

    // ============================================================================
    // STATS METHODS
    // ============================================================================

    /**
     * Get user experience statistics
     */
    async getUserStats(userId: string, guildId: string): Promise<ExperienceStats | null> {
        const { guild, member } = await this.getUserAndGuild(userId, guildId);

        if (!guild || !member) {
            return null;
        }

        return {
            totalXp: member.textTotalXp,
            level: member.textLevel,
            totalMessages: member.textMessageCount,
            dailyMessages: member.dailyTextMessages,
            weeklyMessages: member.weeklyTextMessages,
            monthlyMessages: member.monthlyTextMessages,
            xpToNextLevel: ExperienceCalculator.getXpForNextLevel(member.textTotalXp),
            levelProgress: ExperienceCalculator.calculateLevelProgress(member.textTotalXp),
        };
    }

    /**
     * Get user and guild (helper method)
     */
    private async getUserAndGuild(userId: string, guildId: string) {
        const guild = await this.prisma.guild.findUnique({
            where: { discordId: guildId },
        });

        if (!guild) {
            return { guild: null, member: null };
        }

        const member = await this.prisma.guildMember.findUnique({
            where: {
                guildId_userDiscordId: {
                    guildId: guild.id,
                    userDiscordId: userId,
                },
            },
        });

        return { guild, member };
    }
}
