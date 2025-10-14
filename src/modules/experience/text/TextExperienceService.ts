/**
 * @fileoverview Refactored Text Experience Service (Orchestrator)
 * @author Catto Bot Team
 */

import type { PrismaClient } from '#/generated/prisma';
import { ExperienceCacheService } from '#/modules/experience/ExperienceCacheService';
import { ExperienceCalculator } from '#/modules/experience/ExperienceCalculator';
import { ExperienceConfigService } from '../services/ExperienceConfigService';
import { ExperienceMultiplierService } from '../services/ExperienceMultiplierService';
import { ExperienceRewardService } from '../services/ExperienceRewardService';
import { UserManagementService } from '../services/UserManagementService';
import {
    type ExperienceCalculation,
    type ExperienceGainResult,
    type CooldownResult,
    type AppliedMultiplier,
} from '#/modules/experience/types';
import logger from '#/utils/logger';

/**
 * Text Experience Service (Orchestrator)
 * Coordinates smaller services to handle experience operations
 */
export class TextExperienceService {
    private readonly configService: ExperienceConfigService;
    private readonly multiplierService: ExperienceMultiplierService;
    private readonly rewardService: ExperienceRewardService;
    private readonly userService: UserManagementService;

    constructor(
        private readonly prisma: PrismaClient,
        private readonly cache: ExperienceCacheService
    ) {
        // Initialize sub-services
        this.configService = new ExperienceConfigService(prisma, cache);
        this.multiplierService = new ExperienceMultiplierService(prisma, cache);
        this.rewardService = new ExperienceRewardService(prisma);
        this.userService = new UserManagementService(prisma);
    }

    // ============================================================================
    // CORE EXPERIENCE AWARDING
    // ============================================================================

    /**
     * Award experience to a user for sending a message
     * 
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
            const config = await this.configService.getConfig(guildId);
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
            const { user, guild, member } = await this.userService.ensureUserAndGuild(
                userId,
                guildId
            );

            // 5. Calculate new level
            const oldLevel = member.textLevel;
            const newTotalXp = member.textTotalXp + calculation.finalXp;
            const newLevel = ExperienceCalculator.calculateLevel(newTotalXp);
            const leveledUp = newLevel > oldLevel;

            // 6. Update database
            const updatedMember = await this.userService.updateMemberExperience(
                guild.id,
                user.discordId,
                calculation.finalXp,
                newTotalXp,
                newLevel
            );

            // 7. Update global user stats
            await this.userService.updateGlobalStats(user.id, calculation.finalXp);

            // 8. Set cooldown
            await this.cache.setCooldown(guildId, userId, config.cooldownSeconds);

            // 9. Handle level up rewards
            const rewards: string[] = [];
            if (leveledUp) {
                const levelRewards = await this.rewardService.handleLevelUp(
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
                currentLevelXp: ExperienceCalculator.getXpForCurrentLevel(
                    updatedMember.textTotalXp
                ),
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
        _userId: string,
        guildId: string
    ): Promise<ExperienceCalculation> {
        // Generate random base XP
        const baseXp = ExperienceCalculator.generateBaseXp(minXp, maxXp);

        // Get active multipliers
        const multipliers = await this.multiplierService.getActiveMultipliers(guildId);

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
    // PUBLIC API - Delegate to sub-services
    // ============================================================================

    /**
     * Get experience configuration
     */
    async getConfig(guildId: string) {
        return await this.configService.getConfig(guildId);
    }

    /**
     * Invalidate configuration cache
     */
    async invalidateConfigCache(guildId: string): Promise<void> {
        await this.configService.invalidateCache(guildId);
    }

    /**
     * Invalidate multipliers cache
     */
    async invalidateMultipliersCache(guildId: string): Promise<void> {
        await this.multiplierService.invalidateCache(guildId);
    }

    /**
     * Get database client (for direct access from MessageExperienceHandler)
     */
    get prismaClient(): PrismaClient {
        return this.prisma;
    }
}
