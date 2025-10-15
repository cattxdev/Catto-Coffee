/**
 * @fileoverview Experience Multiplier Service
 * @author Catto Bot Team
 */

import type { PrismaClient } from '#/generated/prisma';
import { ExperienceCacheService } from '#/modules/experience/services/ExperienceCacheService';
import logger from '#/utils/logger';

/**
 * Service for managing experience multipliers
 */
export class ExperienceMultiplierService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly cache: ExperienceCacheService
    ) {}

    /**
     * Get active multipliers for a guild with caching
     */
    async getActiveMultipliers(guildId: string) {
        try {
            // Try cache first
            const cached = await this.cache.getMultipliers(guildId);
            if (cached) {
                return cached;
            }

            // Get from database
            const multipliers = await this.fetchMultipliersFromDb(guildId);

            // Cache and return
            await this.cache.setMultipliers(guildId, multipliers);
            return multipliers;
        } catch (error) {
            logger.error('Error fetching multipliers:', error);
            return [];
        }
    }

    /**
     * Fetch multipliers from database
     */
    private async fetchMultipliersFromDb(guildId: string) {
        const guild = await this.prisma.guild.findUnique({
            where: { discordId: guildId },
        });

        if (!guild) {
            return [];
        }

        const now = new Date();
        return await this.prisma.experienceMultiplier.findMany({
            where: {
                guildId: guild.id,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: now } },
                ],
            },
        });
    }

    /**
     * Get multipliers for specific target (user/role/channel)
     */
    async getTargetMultipliers(
        guildId: string,
        targetType: string,
        targetId: string
    ) {
        try {
            const allMultipliers = await this.getActiveMultipliers(guildId);
            return allMultipliers.filter(
                m => m.targetType === targetType && m.targetId === targetId
            );
        } catch (error) {
            logger.error('Error fetching target multipliers:', error);
            return [];
        }
    }

    /**
     * Invalidate multipliers cache
     */
    async invalidateCache(guildId: string): Promise<void> {
        await this.cache.invalidateMultipliers(guildId);
    }
}
