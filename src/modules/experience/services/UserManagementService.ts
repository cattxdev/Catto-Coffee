/**
 * @fileoverview User Management Service for Experience System
 * @author Catto Bot Team
 */

import type { PrismaClient } from '#/generated/prisma';
import logger from '#/utils/logger';

/**
 * Service for managing users and guild members in the experience system
 */
export class UserManagementService {
    constructor(private readonly prisma: PrismaClient) {}

    /**
     * Ensure user and guild member exist in database
     * Creates if not exists, returns existing if found
     */
    async ensureUserAndGuild(userId: string, guildId: string) {
        try {
            // Upsert user
            const user = await this.upsertUser(userId);

            // Upsert guild
            const guild = await this.upsertGuild(guildId);

            // Upsert guild member
            const member = await this.upsertGuildMember(user.id, user.discordId, guild.id);

            return { user, guild, member };
        } catch (error) {
            logger.error('Error ensuring user and guild:', error);
            throw error;
        }
    }

    /**
     * Upsert user
     */
    private async upsertUser(userId: string) {
        return await this.prisma.user.upsert({
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
    }

    /**
     * Upsert guild
     */
    private async upsertGuild(guildId: string) {
        return await this.prisma.guild.upsert({
            where: { discordId: guildId },
            create: {
                discordId: guildId,
                name: 'Unknown',
                isPremium: false,
            },
            update: {},
        });
    }

    /**
     * Upsert guild member
     */
    private async upsertGuildMember(
        userId: string,
        userDiscordId: string,
        guildId: string
    ) {
        return await this.prisma.guildMember.upsert({
            where: {
                guildId_userDiscordId: {
                    guildId: guildId,
                    userDiscordId: userDiscordId,
                },
            },
            create: {
                guildId: guildId,
                userId: userId,
                userDiscordId: userDiscordId,
                textXp: 0,
                textLevel: 1,
                textTotalXp: 0,
                textMessageCount: 0,
            },
            update: {},
        });
    }

    /**
     * Update user's global statistics
     */
    async updateGlobalStats(userId: string, xpGained: number) {
        try {
            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    globalExperience: { increment: xpGained },
                    totalMessagesCount: { increment: 1 },
                    lastSeenAt: new Date(),
                },
            });
        } catch (error) {
            logger.error('Error updating global stats:', error);
        }
    }

    /**
     * Update guild member's experience and level
     */
    async updateMemberExperience(
        guildId: string,
        userDiscordId: string,
        xpGained: number,
        newTotalXp: number,
        newLevel: number
    ) {
        return await this.prisma.guildMember.update({
            where: {
                guildId_userDiscordId: {
                    guildId,
                    userDiscordId,
                },
            },
            data: {
                textXp: xpGained,
                textTotalXp: newTotalXp,
                textLevel: newLevel,
                textMessageCount: { increment: 1 },
                dailyTextMessages: { increment: 1 },
                weeklyTextMessages: { increment: 1 },
                monthlyTextMessages: { increment: 1 },
            },
        });
    }
}
