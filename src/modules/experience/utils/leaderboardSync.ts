/**
 * @fileoverview Leaderboard Sync Utility
 * @author Catto Bot Team
 * 
 * Utility to sync XP rankings from PostgreSQL to Redis
 */

import type { PrismaClient } from '#/generated/prisma';
import { ExperienceRankingService } from '../services/ExperienceRankingService';
import logger from '#/utils/logger';

/**
 * Sync all guild leaderboards from database to Redis
 * Should be called on bot startup or periodically
 */
export async function syncAllLeaderboards(
    prisma: PrismaClient,
    rankingService: ExperienceRankingService
): Promise<void> {
    logger.info('Starting leaderboard sync from database to Redis...');

    try {
        // Get all guilds with at least one member with XP
        const guilds = await prisma.guild.findMany({
            where: {
                members: {
                    some: {
                        textTotalXp: {
                            gt: 0,
                        },
                    },
                },
            },
            select: {
                id: true,
                discordId: true,
            },
        });

        logger.info(`Found ${guilds.length} guilds with XP data to sync`);

        // Sync each guild's leaderboard
        for (const guild of guilds) {
            await syncGuildLeaderboard(prisma, rankingService, guild.discordId);
        }

        logger.success(`✅ Leaderboard sync completed for ${guilds.length} guilds`);
    } catch (error) {
        logger.error('Failed to sync leaderboards:', error);
        throw error;
    }
}

/**
 * Sync a single guild's leaderboard from database to Redis
 */
export async function syncGuildLeaderboard(
    prisma: PrismaClient,
    rankingService: ExperienceRankingService,
    guildId: string
): Promise<void> {
    try {
        // Get all members with XP in this guild
        const members = await prisma.guildMember.findMany({
            where: {
                guild: {
                    discordId: guildId,
                },
                textTotalXp: {
                    gt: 0,
                },
            },
            select: {
                userDiscordId: true,
                textTotalXp: true,
            },
        });

        if (members.length === 0) {
            logger.debug(`No members with XP found for guild ${guildId}`);
            return;
        }

        // Batch update Redis sorted set
        await rankingService.batchUpdateScores(
            guildId,
            members.map((m) => ({
                userId: m.userDiscordId,
                totalXp: m.textTotalXp,
            }))
        );

        logger.debug(`Synced ${members.length} users for guild ${guildId}`);
    } catch (error) {
        logger.error(`Failed to sync leaderboard for guild ${guildId}:`, error);
        throw error;
    }
}

/**
 * Schedule periodic leaderboard syncs
 * Ensures Redis rankings stay in sync with database
 * 
 * @param prisma - Prisma client
 * @param rankingService - Ranking service
 * @param intervalMinutes - How often to sync (default: 60 minutes)
 */
export function scheduleLeaderboardSync(
    prisma: PrismaClient,
    rankingService: ExperienceRankingService,
    intervalMinutes: number = 60
): NodeJS.Timeout {
    logger.info(`Scheduling leaderboard sync every ${intervalMinutes} minutes`);

    const intervalMs = intervalMinutes * 60 * 1000;

    return setInterval(async () => {
        logger.info('Running scheduled leaderboard sync...');
        try {
            await syncAllLeaderboards(prisma, rankingService);
        } catch (error) {
            logger.error('Scheduled leaderboard sync failed:', error);
        }
    }, intervalMs);
}
