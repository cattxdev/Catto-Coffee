/**
 * @fileoverview Experience Ranking Service using Redis Sorted Sets
 * @author Catto Bot Team
 */

import type RedisService from '../../services/RedisService';
import logger from '../../utils/logger';

/**
 * Leaderboard entry with ranking information
 */
export interface RankedUser {
    userId: string;
    totalXp: number;
    rank: number;
}

/**
 * Service for maintaining real-time experience rankings in Redis
 * Uses Redis Sorted Sets (ZSET) for O(log N) operations
 */
export class ExperienceRankingService {
    constructor(private readonly redis: RedisService) {}

    /**
     * Get the Redis key for guild leaderboard
     */
    private getLeaderboardKey(guildId: string): string {
        return `leaderboard:${guildId}`;
    }

    // ============================================================================
    // SCORE UPDATES
    // ============================================================================

    /**
     * Update a user's XP score in the leaderboard
     * This should be called whenever a user gains XP
     */
    async updateUserScore(guildId: string, userId: string, totalXp: number): Promise<void> {
        const key = this.getLeaderboardKey(guildId);
        try {
            await this.redis.zadd(key, totalXp, userId);
        } catch (error) {
            logger.error('Failed to update user score in leaderboard:', error);
            throw error;
        }
    }

    /**
     * Increment a user's XP score by a specific amount
     * More efficient than fetching + updating when you only know the delta
     */
    async incrementUserScore(guildId: string, userId: string, xpDelta: number): Promise<number> {
        const key = this.getLeaderboardKey(guildId);
        try {
            const newScore = await this.redis.zincrby(key, xpDelta, userId);
            return newScore;
        } catch (error) {
            logger.error('Failed to increment user score in leaderboard:', error);
            throw error;
        }
    }

    /**
     * Batch update multiple users' scores
     * Useful for syncing from database
     */
    async batchUpdateScores(guildId: string, scores: Array<{ userId: string; totalXp: number }>): Promise<void> {
        const key = this.getLeaderboardKey(guildId);
        try {
            // Build array of score-member pairs for ZADD
            const pairs: Array<number | string> = [];
            for (const { totalXp, userId } of scores) {
                pairs.push(totalXp, userId);
            }
            
            if (pairs.length > 0) {
                await this.redis.zadd(key, ...pairs);
            }
        } catch (error) {
            logger.error('Failed to batch update leaderboard scores:', error);
            throw error;
        }
    }

    // ============================================================================
    // RANKING QUERIES
    // ============================================================================

    /**
     * Get a user's rank in the guild (1-based)
     * Returns null if user is not ranked
     */
    async getUserRank(guildId: string, userId: string): Promise<number | null> {
        const key = this.getLeaderboardKey(guildId);
        try {
            // ZREVRANK returns 0-based rank (highest score = 0)
            const rank = await this.redis.zrevrank(key, userId);
            return rank !== null ? rank + 1 : null;
        } catch (error) {
            logger.error('Failed to get user rank:', error);
            throw error;
        }
    }

    /**
     * Get a user's score
     */
    async getUserScore(guildId: string, userId: string): Promise<number | null> {
        const key = this.getLeaderboardKey(guildId);
        try {
            return await this.redis.zscore(key, userId);
        } catch (error) {
            logger.error('Failed to get user score:', error);
            throw error;
        }
    }

    /**
     * Get top N users by rank
     */
    async getTopUsers(guildId: string, limit: number = 10, offset: number = 0): Promise<RankedUser[]> {
        const key = this.getLeaderboardKey(guildId);
        try {
            // ZREVRANGE with WITHSCORES (highest to lowest)
            const results = await this.redis.zrevrange(key, offset, offset + limit - 1, true);
            
            return this.parseRankedResults(results, offset);
        } catch (error) {
            logger.error('Failed to get top users:', error);
            throw error;
        }
    }

    /**
     * Get users around a specific rank (context view)
     * Useful for showing "you are rank X" with nearby users
     */
    async getUsersAroundRank(
        guildId: string,
        userId: string,
        context: number = 5
    ): Promise<RankedUser[]> {
        const key = this.getLeaderboardKey(guildId);
        try {
            const rank = await this.redis.zrevrank(key, userId);
            if (rank === null) {
                return [];
            }

            // Get users before and after
            const start = Math.max(0, rank - context);
            const end = rank + context;

            const results = await this.redis.zrevrange(key, start, end, true);
            return this.parseRankedResults(results, start);
        } catch (error) {
            logger.error('Failed to get users around rank:', error);
            throw error;
        }
    }

    /**
     * Get total number of ranked users in guild
     */
    async getTotalRankedUsers(guildId: string): Promise<number> {
        const key = this.getLeaderboardKey(guildId);
        try {
            return await this.redis.zcard(key);
        } catch (error) {
            logger.error('Failed to get total ranked users:', error);
            throw error;
        }
    }

    /**
     * Get users within a specific score range
     */
    async getUsersByScoreRange(
        guildId: string,
        minScore: number,
        maxScore: number,
        limit?: number
    ): Promise<RankedUser[]> {
        const key = this.getLeaderboardKey(guildId);
        try {
            const results = await this.redis.zrevrangebyscore(
                key,
                maxScore,
                minScore,
                true,
                limit ? { offset: 0, count: limit } : undefined
            );

            // Need to get ranks separately for these users
            const users: RankedUser[] = [];
            for (let i = 0; i < results.length; i += 2) {
                const userId = results[i];
                const totalXp = parseFloat(results[i + 1]);
                const rank = await this.getUserRank(guildId, userId);
                
                users.push({
                    userId,
                    totalXp,
                    rank: rank || 0,
                });
            }

            return users;
        } catch (error) {
            logger.error('Failed to get users by score range:', error);
            throw error;
        }
    }

    // ============================================================================
    // MAINTENANCE
    // ============================================================================

    /**
     * Remove a user from the leaderboard
     */
    async removeUser(guildId: string, userId: string): Promise<void> {
        const key = this.getLeaderboardKey(guildId);
        try {
            await this.redis.zrem(key, userId);
        } catch (error) {
            logger.error('Failed to remove user from leaderboard:', error);
            throw error;
        }
    }

    /**
     * Clear entire leaderboard for a guild
     * Use with caution!
     */
    async clearLeaderboard(guildId: string): Promise<void> {
        const key = this.getLeaderboardKey(guildId);
        try {
            await this.redis.del(key);
            logger.info(`Cleared leaderboard for guild ${guildId}`);
        } catch (error) {
            logger.error('Failed to clear leaderboard:', error);
            throw error;
        }
    }

    /**
     * Sync leaderboard from database
     * This should be called periodically or on bot startup to ensure consistency
     */
    async syncFromDatabase(
        guildId: string,
        getUserScores: () => Promise<Array<{ userId: string; totalXp: number }>>
    ): Promise<void> {
        try {
            logger.info(`Syncing leaderboard from database for guild ${guildId}...`);
            
            const scores = await getUserScores();
            await this.batchUpdateScores(guildId, scores);
            
            logger.info(`Synced ${scores.length} user scores for guild ${guildId}`);
        } catch (error) {
            logger.error('Failed to sync leaderboard from database:', error);
            throw error;
        }
    }

    // ============================================================================
    // HELPERS
    // ============================================================================

    /**
     * Parse Redis ZREVRANGE results into RankedUser objects
     */
    private parseRankedResults(results: string[], startRank: number): RankedUser[] {
        const users: RankedUser[] = [];
        
        // Results come in pairs: [userId, score, userId, score, ...]
        for (let i = 0; i < results.length; i += 2) {
            const userId = results[i];
            const totalXp = parseFloat(results[i + 1]);
            const rank = startRank + (i / 2) + 1; // 1-based rank

            users.push({
                userId,
                totalXp,
                rank,
            });
        }

        return users;
    }
}
