/**
 * @fileoverview Experience Reward Service
 * @author Catto Bot Team
 */

import type { PrismaClient } from '#/generated/prisma';
import { AuditLogAction } from '#/generated/prisma';
import logger from '#/utils/logger';

/**
 * Service for handling level-up rewards and role assignments
 */
export class ExperienceRewardService {
    constructor(private readonly prisma: PrismaClient) {}

    /**
     * Get and process level up rewards for a user
     * 
     * @param userDiscordId - Discord user ID
     * @param guildDbId - Database guild ID
     * @param oldLevel - Previous level
     * @param newLevel - New level achieved
     * @returns Array of role IDs to be awarded
     */
    async handleLevelUp(
        userDiscordId: string,
        guildDbId: string,
        oldLevel: number,
        newLevel: number
    ): Promise<string[]> {
        try {
            const rewards: string[] = [];

            // Get rewards for levels between old and new
            const levelRewards = await this.getLevelRewards(
                guildDbId,
                oldLevel,
                newLevel
            );

            // Process each reward
            for (const reward of levelRewards) {
                rewards.push(reward.roleId);

                // Create audit log entry
                await this.createRewardAuditLog(
                    guildDbId,
                    userDiscordId,
                    reward.level,
                    reward.roleId
                );
            }

            return rewards;
        } catch (error) {
            logger.error('Error handling level up rewards:', error);
            return [];
        }
    }

    /**
     * Get level rewards between two levels
     */
    private async getLevelRewards(
        guildDbId: string,
        oldLevel: number,
        newLevel: number
    ) {
        return await this.prisma.levelReward.findMany({
            where: {
                guildId: guildDbId,
                level: {
                    gt: oldLevel,
                    lte: newLevel,
                },
            },
            orderBy: { level: 'asc' },
        });
    }

    /**
     * Create audit log for reward assignment
     */
    private async createRewardAuditLog(
        guildDbId: string,
        userDiscordId: string,
        level: number,
        roleId: string
    ): Promise<void> {
        try {
            await this.prisma.auditLog.create({
                data: {
                    guildId: guildDbId,
                    userId: userDiscordId,
                    action: AuditLogAction.ROLE_REWARDED,
                    metadata: {
                        level,
                        roleId,
                    },
                },
            });
        } catch (error) {
            // Ignore audit log errors to not block rewards
            logger.error('Error creating reward audit log:', error);
        }
    }

    /**
     * Get all rewards configured for a guild
     */
    async getGuildRewards(guildDbId: string) {
        return await this.prisma.levelReward.findMany({
            where: { guildId: guildDbId },
            orderBy: { level: 'asc' },
        });
    }

    /**
     * Get reward for specific level
     */
    async getRewardForLevel(guildDbId: string, level: number) {
        return await this.prisma.levelReward.findFirst({
            where: {
                guildId: guildDbId,
                level,
            },
        });
    }
}
