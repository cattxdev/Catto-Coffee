/**
 * @fileoverview Experience Leaderboard Service
 * @author Catto Bot Team
 */

import type { PrismaClient } from '#/generated/prisma';
import { ExperienceCacheService } from '#/modules/experience/services/ExperienceCacheService';
import type { LeaderboardEntry, LeaderboardOptions } from '#/modules/experience/types';
import logger from '#/utils/logger';

/**
 * Service for handling experience leaderboard queries
 */
export class ExperienceLeaderboardService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly cache: ExperienceCacheService
    ) {}

    /**
     * Get leaderboard with caching
     */
    async getLeaderboard(options: LeaderboardOptions): Promise<LeaderboardEntry[]> {
        const { guildId, period = 'ALL_TIME', limit = 10, offset = 0 } = options;

        try {
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
            const orderBy = this.getOrderByClause(period);

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
                messageCount: this.getMessageCount(member, period),
            }));

            // Cache leaderboard
            await this.cache.setLeaderboard(guildId, period, limit, offset, entries);

            return entries;
        } catch (error) {
            logger.error('Error fetching leaderboard:', error);
            return [];
        }
    }

    /**
     * Get user's rank in leaderboard
     */
    async getUserRank(userId: string, guildId: string, period: string = 'ALL_TIME'): Promise<number | null> {
        try {
            const guild = await this.prisma.guild.findUnique({
                where: { discordId: guildId },
            });

            if (!guild) {
                return null;
            }

            const orderBy = this.getOrderByClause(period);

            // Get all members sorted
            const members = await this.prisma.guildMember.findMany({
                where: { guildId: guild.id },
                orderBy,
                select: {
                    userDiscordId: true,
                    textTotalXp: true,
                    dailyTextMessages: true,
                    weeklyTextMessages: true,
                    monthlyTextMessages: true,
                },
            });

            // Find user's position
            const userIndex = members.findIndex((m: any) => m.userDiscordId === userId);
            return userIndex === -1 ? null : userIndex + 1;
        } catch (error) {
            logger.error('Error fetching user rank:', error);
            return null;
        }
    }

    /**
     * Invalidate leaderboard cache
     */
    async invalidateCache(guildId: string): Promise<void> {
        await this.cache.invalidateLeaderboard(guildId);
    }

    /**
     * Invalidate specific period cache
     */
    async invalidatePeriodCache(guildId: string, period: string): Promise<void> {
        await this.cache.invalidateLeaderboardPeriod(guildId, period);
    }

    /**
     * Get order by clause based on period
     */
    private getOrderByClause(period: string) {
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
     * Get message count based on period
     */
    private getMessageCount(member: any, period: string): number {
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
}
