/**
 * @fileoverview Voice Experience Configuration Service
 * @author Catto Bot Team
 */

import { PrismaClient } from '../../../../generated/prisma';
import { Redis } from 'ioredis';
import { VoiceExpConfig, VoiceChannelConfig } from './types';
import logger from '../../../utils/logger';

/**
 * Manages voice experience configuration with caching
 */
export class VoiceExpConfigService {
    private readonly CONFIG_CACHE_PREFIX = 'voice:config:';
    private readonly CHANNEL_CONFIG_PREFIX = 'voice:channel:';
    private readonly CACHE_TTL = 3600; // 1 hour

    constructor(
        private prisma: PrismaClient,
        private redis: Redis
    ) {}

    /**
     * Get voice experience configuration for a guild
     */
    async getConfig(guildId: string): Promise<VoiceExpConfig> {
        // Try cache first
        const cacheKey = `${this.CONFIG_CACHE_PREFIX}${guildId}`;
        const cached = await this.redis.get(cacheKey);

        if (cached) {
            try {
                return JSON.parse(cached) as VoiceExpConfig;
            } catch (error) {
                logger.error('Failed to parse cached voice config:', error);
            }
        }

        // Fetch configuration from database
        const guild = await this.prisma.guild.findUnique({
            where: { discordId: guildId },
        });

        if (!guild) {
            logger.warn(`Guild ${guildId} not found in database`);
            return this.getDefaultConfig();
        }

        const config: VoiceExpConfig = {
            enabled: guild.voiceExpEnabled,
            baseExpPerMinute: guild.voiceBaseExpPerMinute,
            minDuration: 60000, // 1 minute
            updateInterval: guild.voicePeriodicInterval,
            mutedPenalty: guild.voiceMutedPenalty,
            deafenedPenalty: guild.voiceDeafenedPenalty,
            streamingBonus: guild.voiceStreamingBonus,
            videoBonus: guild.voiceVideoBonus,
            minMembersInChannel: guild.voiceMinMembers,
            ignoreAFKChannels: true,
            afkTimeout: guild.voiceAfkPenalty === 1.0 ? 0 : 600000,
            peakHours: guild.voicePeakStartHour !== null && guild.voicePeakEndHour !== null ? {
                start: guild.voicePeakStartHour,
                end: guild.voicePeakEndHour,
                multiplier: guild.voicePeakMultiplier ?? 1.0,
            } : undefined,
        };

        // Cache the config
        await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(config));

        return config;
    }

    /**
     * Get default configuration
     */
    private getDefaultConfig(): VoiceExpConfig {
        return {
            enabled: true,
            baseExpPerMinute: 5,
            minDuration: 60000, // 1 minute
            updateInterval: 300000, // 5 minutes
            mutedPenalty: 0.5, // 50% penalty
            deafenedPenalty: 0.7, // 70% penalty
            streamingBonus: 0.2, // 20% bonus
            videoBonus: 0.15, // 15% bonus
            minMembersInChannel: 2,
            ignoreAFKChannels: true,
            afkTimeout: 600000, // 10 minutes
        };
    }

    /**
     * Update voice experience configuration
     */
    async updateConfig(
        guildId: string,
        updates: Partial<Omit<VoiceExpConfig, 'peakHours'>> & {
            peakHours?: VoiceExpConfig['peakHours'];
        }
    ): Promise<VoiceExpConfig> {
        // Update database
        await this.prisma.guild.update({
            where: { discordId: guildId },
            data: {
                voiceExpEnabled: updates.enabled,
                voiceBaseExpPerMinute: updates.baseExpPerMinute,
                voicePeriodicInterval: updates.updateInterval,
                voiceMinMembers: updates.minMembersInChannel,
                voiceMutedPenalty: updates.mutedPenalty,
                voiceDeafenedPenalty: updates.deafenedPenalty,
                voiceAfkPenalty: updates.afkTimeout === 0 ? 1.0 : 1.0, // Keep afk penalty logic
                voiceStreamingBonus: updates.streamingBonus,
                voiceVideoBonus: updates.videoBonus,
                voicePeakStartHour: updates.peakHours?.start,
                voicePeakEndHour: updates.peakHours?.end,
                voicePeakMultiplier: updates.peakHours?.multiplier,
            },
        });

        // Clear cache
        await this.clearCache(guildId);

        // Get updated config
        const newConfig = await this.getConfig(guildId);

        logger.info(`Updated voice experience config for guild ${guildId}`);

        return newConfig;
    }

    /**
     * Get channel-specific configuration
     */
    async getChannelConfig(guildId: string, channelId: string): Promise<VoiceChannelConfig | null> {
        // Try cache
        const cacheKey = `${this.CHANNEL_CONFIG_PREFIX}${guildId}:${channelId}`;
        const cached = await this.redis.get(cacheKey);

        if (cached) {
            try {
                return JSON.parse(cached) as VoiceChannelConfig;
            } catch (error) {
                logger.error('Failed to parse cached channel config:', error);
            }
        }

        // Fetch from database
        const dbConfig = await this.prisma.voiceChannelConfig.findUnique({
            where: {
                guildId_channelId: {
                    guildId: guildId,
                    channelId: channelId,
                },
            },
        });

        if (!dbConfig) {
            return null;
        }

        const config: VoiceChannelConfig = {
            guildId: dbConfig.guildId,
            channelId: dbConfig.channelId,
            enabled: dbConfig.enabled,
            multiplier: dbConfig.expMultiplier,
            minMembers: dbConfig.minMembers ?? undefined,
            ignoreAFK: true, // Default behavior
        };

        // Cache it
        await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(config));

        return config;
    }

    /**
     * Set channel-specific configuration
     */
    async setChannelConfig(config: VoiceChannelConfig): Promise<void> {
        // Upsert in database
        await this.prisma.voiceChannelConfig.upsert({
            where: {
                guildId_channelId: {
                    guildId: config.guildId,
                    channelId: config.channelId,
                },
            },
            create: {
                guildId: config.guildId,
                channelId: config.channelId,
                enabled: config.enabled,
                expMultiplier: config.multiplier ?? 1.0,
                minMembers: config.minMembers ?? null,
            },
            update: {
                enabled: config.enabled,
                expMultiplier: config.multiplier ?? 1.0,
                minMembers: config.minMembers ?? null,
            },
        });

        // Clear cache
        const cacheKey = `${this.CHANNEL_CONFIG_PREFIX}${config.guildId}:${config.channelId}`;
        await this.redis.del(cacheKey);

        logger.info(`Updated channel config for ${config.channelId} in guild ${config.guildId}`);
    }

    /**
     * Delete channel configuration
     */
    async deleteChannelConfig(guildId: string, channelId: string): Promise<void> {
        // Delete from database
        await this.prisma.voiceChannelConfig.deleteMany({
            where: {
                guildId,
                channelId,
            },
        });

        // Delete from cache
        const cacheKey = `${this.CHANNEL_CONFIG_PREFIX}${guildId}:${channelId}`;
        await this.redis.del(cacheKey);

        logger.info(`Deleted channel config for ${channelId} in guild ${guildId}`);
    }

    /**
     * Clear all caches for a guild
     */
    async clearCache(guildId: string): Promise<void> {
        const configKey = `${this.CONFIG_CACHE_PREFIX}${guildId}`;
        await this.redis.del(configKey);

        // Clear all channel configs for this guild
        const pattern = `${this.CHANNEL_CONFIG_PREFIX}${guildId}:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
            await this.redis.del(...keys);
        }

        logger.debug(`Cleared voice config cache for guild ${guildId}`);
    }
}
