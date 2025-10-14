/**
 * @fileoverview Experience Cache Service
 * @author Catto Bot Team
 */

import type RedisService from '../../services/RedisService';
import type { ExperienceConfigCache, LeaderboardEntry } from './types';
import { CacheKeys, CacheTTL } from './types';

/**
 * Service for handling all experience-related Redis caching operations
 */
export class ExperienceCacheService {
    constructor(private readonly redis: RedisService) {}

    // ============================================================================
    // CONFIG CACHE
    // ============================================================================

    /**
     * Get cached configuration for a guild
     */
    async getConfig(guildId: string): Promise<ExperienceConfigCache | null> {
        const key = CacheKeys.CONFIG(guildId);
        return await this.redis.get<ExperienceConfigCache>(key);
    }

    /**
     * Cache guild configuration
     */
    async setConfig(
        guildId: string,
        config: ExperienceConfigCache,
        ttl: number = CacheTTL.CONFIG
    ): Promise<void> {
        const key = CacheKeys.CONFIG(guildId);
        await this.redis.set(key, config, ttl);
    }

    /**
     * Invalidate configuration cache
     */
    async invalidateConfig(guildId: string): Promise<void> {
        const key = CacheKeys.CONFIG(guildId);
        await this.redis.del(key);
    }

    // ============================================================================
    // COOLDOWN CACHE
    // ============================================================================

    /**
     * Check if user is on cooldown
     */
    async isOnCooldown(guildId: string, userId: string): Promise<boolean> {
        const key = CacheKeys.COOLDOWN(guildId, userId);
        return await this.redis.exists(key);
    }

    /**
     * Get remaining cooldown time in seconds
     */
    async getCooldownTTL(guildId: string, userId: string): Promise<number> {
        const key = CacheKeys.COOLDOWN(guildId, userId);
        return await this.redis.ttl(key);
    }

    /**
     * Set cooldown for user
     */
    async setCooldown(
        guildId: string,
        userId: string,
        seconds: number
    ): Promise<void> {
        const key = CacheKeys.COOLDOWN(guildId, userId);
        await this.redis.set(key, Date.now(), seconds);
    }

    /**
     * Clear cooldown for user (admin bypass)
     */
    async clearCooldown(guildId: string, userId: string): Promise<void> {
        const key = CacheKeys.COOLDOWN(guildId, userId);
        await this.redis.del(key);
    }

    // ============================================================================
    // MULTIPLIERS CACHE
    // ============================================================================

    /**
     * Get cached multipliers for guild
     */
    async getMultipliers<T = any>(guildId: string): Promise<T[] | null> {
        const key = CacheKeys.MULTIPLIERS(guildId);
        return await this.redis.get<T[]>(key);
    }

    /**
     * Cache guild multipliers
     */
    async setMultipliers<T = any>(
        guildId: string,
        multipliers: T[],
        ttl: number = CacheTTL.MULTIPLIERS
    ): Promise<void> {
        const key = CacheKeys.MULTIPLIERS(guildId);
        await this.redis.set(key, multipliers, ttl);
    }

    /**
     * Invalidate multipliers cache
     */
    async invalidateMultipliers(guildId: string): Promise<void> {
        const key = CacheKeys.MULTIPLIERS(guildId);
        await this.redis.del(key);
    }

    // ============================================================================
    // USER LEVEL CACHE
    // ============================================================================

    /**
     * Get cached user level
     */
    async getUserLevel(guildId: string, userId: string): Promise<number | null> {
        const key = CacheKeys.USER_LEVEL(guildId, userId);
        const level = await this.redis.get<number>(key);
        return level;
    }

    /**
     * Cache user level
     */
    async setUserLevel(
        guildId: string,
        userId: string,
        level: number,
        ttl: number = CacheTTL.USER_LEVEL
    ): Promise<void> {
        const key = CacheKeys.USER_LEVEL(guildId, userId);
        await this.redis.set(key, level, ttl);
    }

    /**
     * Invalidate user level cache
     */
    async invalidateUserLevel(guildId: string, userId: string): Promise<void> {
        const key = CacheKeys.USER_LEVEL(guildId, userId);
        await this.redis.del(key);
    }

    // ============================================================================
    // LEADERBOARD CACHE
    // ============================================================================

    /**
     * Get cached leaderboard
     */
    async getLeaderboard(
        guildId: string,
        period: string,
        limit: number,
        offset: number
    ): Promise<LeaderboardEntry[] | null> {
        const key = CacheKeys.LEADERBOARD(guildId, `${period}:${limit}:${offset}`);
        return await this.redis.get<LeaderboardEntry[]>(key);
    }

    /**
     * Cache leaderboard
     */
    async setLeaderboard(
        guildId: string,
        period: string,
        limit: number,
        offset: number,
        entries: LeaderboardEntry[],
        ttl: number = CacheTTL.LEADERBOARD
    ): Promise<void> {
        const key = CacheKeys.LEADERBOARD(guildId, `${period}:${limit}:${offset}`);
        await this.redis.set(key, entries, ttl);
    }

    /**
     * Invalidate all leaderboard cache for guild
     */
    async invalidateLeaderboard(guildId: string): Promise<void> {
        const pattern = CacheKeys.LEADERBOARD(guildId, '*');
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
            await this.redis.delMany(keys);
        }
    }

    /**
     * Invalidate specific leaderboard period
     */
    async invalidateLeaderboardPeriod(guildId: string, period: string): Promise<void> {
        const pattern = CacheKeys.LEADERBOARD(guildId, `${period}:*`);
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
            await this.redis.delMany(keys);
        }
    }

    // ============================================================================
    // BULK OPERATIONS
    // ============================================================================

    /**
     * Invalidate all experience cache for a guild
     */
    async invalidateAllGuildCache(guildId: string): Promise<void> {
        await Promise.all([
            this.invalidateConfig(guildId),
            this.invalidateMultipliers(guildId),
            this.invalidateLeaderboard(guildId),
        ]);
    }

    /**
     * Clear all cooldowns for a guild (useful for testing or resets)
     */
    async clearAllCooldowns(guildId: string): Promise<void> {
        const pattern = CacheKeys.COOLDOWN(guildId, '*');
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
            await this.redis.delMany(keys);
        }
    }
}
