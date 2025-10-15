/**
 * @fileoverview Experience Statistics Service
 * @author Catto Bot Team
 */

import type { PrismaClient } from '#/generated/prisma';
import { ExperienceCalculator } from '#/modules/experience/services/ExperienceCalculator';
import type { ExperienceStats } from '#/modules/experience/types';
import logger from '#/utils/logger';

/**
 * Service for handling experience statistics and user progress
 */
export class ExperienceStatsService {
    constructor(private readonly prisma: PrismaClient) {}

    /**
     * Get complete user experience statistics
     */
    async getUserStats(userId: string, guildId: string): Promise<ExperienceStats | null> {
        try {
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
        } catch (error) {
            logger.error('Error fetching user stats:', error);
            return null;
        }
    }

    /**
     * Get user's current level
     */
    async getUserLevel(userId: string, guildId: string): Promise<number | null> {
        try {
            const { member } = await this.getUserAndGuild(userId, guildId);
            return member?.textLevel ?? null;
        } catch (error) {
            logger.error('Error fetching user level:', error);
            return null;
        }
    }

    /**
     * Get user's total XP
     */
    async getUserTotalXp(userId: string, guildId: string): Promise<number | null> {
        try {
            const { member } = await this.getUserAndGuild(userId, guildId);
            return member?.textTotalXp ?? null;
        } catch (error) {
            logger.error('Error fetching user XP:', error);
            return null;
        }
    }

    /**
     * Get user's message counts
     */
    async getUserMessageCounts(userId: string, guildId: string) {
        try {
            const { member } = await this.getUserAndGuild(userId, guildId);
            
            if (!member) {
                return null;
            }

            return {
                total: member.textMessageCount,
                daily: member.dailyTextMessages,
                weekly: member.weeklyTextMessages,
                monthly: member.monthlyTextMessages,
            };
        } catch (error) {
            logger.error('Error fetching message counts:', error);
            return null;
        }
    }

    /**
     * Get guild-wide statistics
     */
    async getGuildStats(guildId: string) {
        try {
            const guild = await this.prisma.guild.findUnique({
                where: { discordId: guildId },
            });

            if (!guild) {
                return null;
            }

            const members = await this.prisma.guildMember.findMany({
                where: { guildId: guild.id },
                select: {
                    textTotalXp: true,
                    textLevel: true,
                    textMessageCount: true,
                },
            });

            const totalMessages = members.reduce((sum, m) => sum + m.textMessageCount, 0);
            const totalXp = members.reduce((sum, m) => sum + m.textTotalXp, 0);
            const averageLevel = members.length > 0 
                ? members.reduce((sum, m) => sum + m.textLevel, 0) / members.length 
                : 0;

            return {
                totalMembers: members.length,
                totalMessages,
                totalXp,
                averageLevel: Math.round(averageLevel * 100) / 100,
            };
        } catch (error) {
            logger.error('Error fetching guild stats:', error);
            return null;
        }
    }

    /**
     * Helper: Get user and guild from database
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
