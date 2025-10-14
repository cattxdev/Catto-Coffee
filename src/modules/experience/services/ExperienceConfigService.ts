/**
 * @fileoverview Experience Configuration Service
 * @author Catto Bot Team
 */

import type { PrismaClient } from '#/generated/prisma';
import { ExperienceType } from '#/generated/prisma';
import { ExperienceCacheService } from '#/modules/experience/ExperienceCacheService';
import type { ExperienceConfigCache } from '#/modules/experience/types';
import logger from '#/utils/logger';

/**
 * Service for managing experience configuration
 */
export class ExperienceConfigService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly cache: ExperienceCacheService
    ) {}

    /**
     * Get experience configuration with caching
     */
    async getConfig(guildId: string): Promise<ExperienceConfigCache> {
        try {
            // Try cache first
            const cached = await this.cache.getConfig(guildId);
            if (cached) {
                return cached;
            }

            // Get from database
            const config = await this.fetchConfigFromDb(guildId);

            // Cache and return
            await this.cache.setConfig(guildId, config);
            return config;
        } catch (error) {
            logger.error('Error fetching config:', error);
            return this.getDefaultConfig();
        }
    }

    /**
     * Fetch configuration from database
     */
    private async fetchConfigFromDb(guildId: string): Promise<ExperienceConfigCache> {
        const guild = await this.prisma.guild.findUnique({
            where: { discordId: guildId },
            include: {
                experienceConfigs: {
                    where: { type: ExperienceType.TEXT },
                },
            },
        });

        if (!guild || guild.experienceConfigs.length === 0) {
            return this.getDefaultConfig();
        }

        const config = guild.experienceConfigs[0];
        return {
            enabled: config.isEnabled,
            minXp: config.minXp,
            maxXp: config.maxXp,
            cooldownSeconds: config.cooldownSeconds,
            type: config.type,
            announcementChannelId: config.announceChannelId,
            sendLevelUpMessages: config.announceLevel,
            cachedAt: Date.now(),
        };
    }

    /**
     * Get default configuration
     */
    private getDefaultConfig(): ExperienceConfigCache {
        return {
            enabled: true,
            minXp: 15,
            maxXp: 25,
            cooldownSeconds: 60,
            type: ExperienceType.TEXT,
            announcementChannelId: null,
            sendLevelUpMessages: true,
            cachedAt: Date.now(),
        };
    }

    /**
     * Invalidate configuration cache
     */
    async invalidateCache(guildId: string): Promise<void> {
        await this.cache.invalidateConfig(guildId);
    }

    /**
     * Check if experience is enabled for guild
     */
    async isEnabled(guildId: string): Promise<boolean> {
        const config = await this.getConfig(guildId);
        return config.enabled;
    }
}
