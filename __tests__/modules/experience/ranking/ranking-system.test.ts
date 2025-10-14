/**
 * @fileoverview Comprehensive Integration Tests for Redis Ranking System
 * @author Catto Bot Team
 */

import { ExperienceRankingService } from '../../../../src/modules/experience/ExperienceRankingService';
import RedisService from '../../../../src/services/RedisService';

describe('ExperienceRankingService - Comprehensive Tests', () => {
    let redisService: RedisService;
    let rankingService: ExperienceRankingService;
    const testGuildId = 'test-guild-123';

    beforeAll(async () => {
        redisService = RedisService.getInstance();
        await redisService.connect();
        rankingService = new ExperienceRankingService(redisService);
    });

    afterAll(async () => {
        await redisService.disconnect();
    });

    beforeEach(async () => {
        // Clear test data before each test
        await rankingService.clearLeaderboard(testGuildId);
    });

    afterEach(async () => {
        // Clean up after each test
        await rankingService.clearLeaderboard(testGuildId);
    });

    // ============================================================================
    // BASIC OPERATIONS
    // ============================================================================

    describe('Basic Score Operations', () => {
        test('should add a user with score', async () => {
            await rankingService.updateUserScore(testGuildId, 'user1', 100);
            
            const score = await rankingService.getUserScore(testGuildId, 'user1');
            expect(score).toBe(100);
        });

        test('should update existing user score', async () => {
            await rankingService.updateUserScore(testGuildId, 'user1', 100);
            await rankingService.updateUserScore(testGuildId, 'user1', 200);
            
            const score = await rankingService.getUserScore(testGuildId, 'user1');
            expect(score).toBe(200);
        });

        test('should increment user score', async () => {
            await rankingService.updateUserScore(testGuildId, 'user1', 100);
            const newScore = await rankingService.incrementUserScore(testGuildId, 'user1', 50);
            
            expect(newScore).toBe(150);
            
            const score = await rankingService.getUserScore(testGuildId, 'user1');
            expect(score).toBe(150);
        });

        test('should handle zero score', async () => {
            await rankingService.updateUserScore(testGuildId, 'user1', 0);
            
            const score = await rankingService.getUserScore(testGuildId, 'user1');
            expect(score).toBe(0);
        });

        test('should handle very large scores (billions)', async () => {
            const largeScore = 9_999_999_999;
            await rankingService.updateUserScore(testGuildId, 'user1', largeScore);
            
            const score = await rankingService.getUserScore(testGuildId, 'user1');
            expect(score).toBe(largeScore);
        });

        test('should return null for non-existent user', async () => {
            const score = await rankingService.getUserScore(testGuildId, 'nonexistent');
            expect(score).toBeNull();
        });
    });

    // ============================================================================
    // RANKING OPERATIONS
    // ============================================================================

    describe('Ranking Queries', () => {
        beforeEach(async () => {
            // Setup test data: 10 users with decreasing scores
            const users = [
                { id: 'user1', xp: 1000 },
                { id: 'user2', xp: 900 },
                { id: 'user3', xp: 800 },
                { id: 'user4', xp: 700 },
                { id: 'user5', xp: 600 },
                { id: 'user6', xp: 500 },
                { id: 'user7', xp: 400 },
                { id: 'user8', xp: 300 },
                { id: 'user9', xp: 200 },
                { id: 'user10', xp: 100 },
            ];

            await rankingService.batchUpdateScores(
                testGuildId,
                users.map(u => ({ userId: u.id, totalXp: u.xp }))
            );
        });

        test('should get correct rank for #1 user', async () => {
            const rank = await rankingService.getUserRank(testGuildId, 'user1');
            expect(rank).toBe(1);
        });

        test('should get correct rank for middle user', async () => {
            const rank = await rankingService.getUserRank(testGuildId, 'user5');
            expect(rank).toBe(5);
        });

        test('should get correct rank for last user', async () => {
            const rank = await rankingService.getUserRank(testGuildId, 'user10');
            expect(rank).toBe(10);
        });

        test('should return null for non-ranked user', async () => {
            const rank = await rankingService.getUserRank(testGuildId, 'nonexistent');
            expect(rank).toBeNull();
        });

        test('should get top 3 users', async () => {
            const topUsers = await rankingService.getTopUsers(testGuildId, 3);
            
            expect(topUsers).toHaveLength(3);
            expect(topUsers[0].userId).toBe('user1');
            expect(topUsers[0].totalXp).toBe(1000);
            expect(topUsers[0].rank).toBe(1);
            
            expect(topUsers[1].userId).toBe('user2');
            expect(topUsers[1].totalXp).toBe(900);
            expect(topUsers[1].rank).toBe(2);
            
            expect(topUsers[2].userId).toBe('user3');
            expect(topUsers[2].totalXp).toBe(800);
            expect(topUsers[2].rank).toBe(3);
        });

        test('should get top 10 users with pagination', async () => {
            const topUsers = await rankingService.getTopUsers(testGuildId, 10, 0);
            expect(topUsers).toHaveLength(10);
            expect(topUsers[9].rank).toBe(10);
        });

        test('should handle offset in pagination', async () => {
            const pageTwo = await rankingService.getTopUsers(testGuildId, 5, 5);
            
            expect(pageTwo).toHaveLength(5);
            expect(pageTwo[0].userId).toBe('user6');
            expect(pageTwo[0].rank).toBe(6);
        });

        test('should get total ranked users', async () => {
            const total = await rankingService.getTotalRankedUsers(testGuildId);
            expect(total).toBe(10);
        });
    });

    // ============================================================================
    // TIED SCORES
    // ============================================================================

    describe('Tied Score Handling', () => {
        test('should handle tied scores correctly', async () => {
            await rankingService.batchUpdateScores(testGuildId, [
                { userId: 'user1', totalXp: 1000 },
                { userId: 'user2', totalXp: 1000 },
                { userId: 'user3', totalXp: 1000 },
                { userId: 'user4', totalXp: 500 },
            ]);

            const rank1 = await rankingService.getUserRank(testGuildId, 'user1');
            const rank2 = await rankingService.getUserRank(testGuildId, 'user2');
            const rank3 = await rankingService.getUserRank(testGuildId, 'user3');
            const rank4 = await rankingService.getUserRank(testGuildId, 'user4');

            // Redis ZSET assigns different ranks to tied scores based on lexicographical order
            // All three tied users should have ranks 1-3
            expect([rank1, rank2, rank3].sort()).toEqual([1, 2, 3]);
            expect(rank4).toBe(4);
        });
    });

    // ============================================================================
    // MASSIVE DATASET TESTS (100K+ users)
    // ============================================================================

    describe('Large Scale Performance Tests', () => {
        test('should handle 100,000 users efficiently', async () => {
            const userCount = 100_000;
            const batchSize = 1000;
            
            console.log(`Adding ${userCount} users in batches of ${batchSize}...`);
            
            const startTime = Date.now();

            // Add users in batches
            for (let i = 0; i < userCount; i += batchSize) {
                const batch = [];
                for (let j = 0; j < batchSize && (i + j) < userCount; j++) {
                    batch.push({
                        userId: `user${i + j}`,
                        totalXp: Math.floor(Math.random() * 1_000_000),
                    });
                }
                await rankingService.batchUpdateScores(testGuildId, batch);
            }

            const insertTime = Date.now() - startTime;
            console.log(`✅ Inserted ${userCount} users in ${insertTime}ms`);

            // Verify total count
            const total = await rankingService.getTotalRankedUsers(testGuildId);
            expect(total).toBe(userCount);

            // Test rank lookup performance
            const rankStartTime = Date.now();
            await rankingService.getUserRank(testGuildId, 'user50000');
            const rankTime = Date.now() - rankStartTime;
            
            console.log(`✅ Rank lookup in ${rankTime}ms for 100K users`);
            expect(rankTime).toBeLessThan(100); // Should be < 100ms

            // Test leaderboard query performance
            const leaderboardStartTime = Date.now();
            const topUsers = await rankingService.getTopUsers(testGuildId, 10);
            const leaderboardTime = Date.now() - leaderboardStartTime;
            
            console.log(`✅ Top 10 query in ${leaderboardTime}ms for 100K users`);
            expect(leaderboardTime).toBeLessThan(100); // Should be < 100ms
            expect(topUsers).toHaveLength(10);

        }, 120000); // 2 minute timeout for this test

        test('should handle 250,000 users', async () => {
            const userCount = 250_000;
            const batchSize = 5000;
            
            console.log(`Adding ${userCount} users...`);
            const startTime = Date.now();

            for (let i = 0; i < userCount; i += batchSize) {
                const batch = [];
                for (let j = 0; j < batchSize && (i + j) < userCount; j++) {
                    batch.push({
                        userId: `user${i + j}`,
                        totalXp: userCount - (i + j), // Descending order
                    });
                }
                await rankingService.batchUpdateScores(testGuildId, batch);
                
                if (i % 25000 === 0) {
                    console.log(`Progress: ${i}/${userCount}`);
                }
            }

            const insertTime = Date.now() - startTime;
            console.log(`✅ Inserted ${userCount} users in ${insertTime}ms (${(userCount / insertTime * 1000).toFixed(0)} users/sec)`);

            const total = await rankingService.getTotalRankedUsers(testGuildId);
            expect(total).toBe(userCount);

            // Test various positions
            const rank1 = await rankingService.getUserRank(testGuildId, 'user0');
            const rank100k = await rankingService.getUserRank(testGuildId, 'user100000');
            const rankLast = await rankingService.getUserRank(testGuildId, `user${userCount - 1}`);

            expect(rank1).toBe(1);
            expect(rank100k).toBe(100001);
            expect(rankLast).toBe(userCount);

        }, 300000); // 5 minute timeout
    });

    // ============================================================================
    // BATCH OPERATIONS
    // ============================================================================

    describe('Batch Update Operations', () => {
        test('should batch update 1000 users', async () => {
            const users = Array.from({ length: 1000 }, (_, i) => ({
                userId: `user${i}`,
                totalXp: i * 100,
            }));

            await rankingService.batchUpdateScores(testGuildId, users);

            const total = await rankingService.getTotalRankedUsers(testGuildId);
            expect(total).toBe(1000);

            const rank = await rankingService.getUserRank(testGuildId, 'user999');
            expect(rank).toBe(1); // Highest XP
        });

        test('should handle empty batch', async () => {
            await rankingService.batchUpdateScores(testGuildId, []);
            const total = await rankingService.getTotalRankedUsers(testGuildId);
            expect(total).toBe(0);
        });

        test('should handle batch with duplicate users (last wins)', async () => {
            await rankingService.batchUpdateScores(testGuildId, [
                { userId: 'user1', totalXp: 100 },
                { userId: 'user1', totalXp: 200 },
                { userId: 'user1', totalXp: 300 },
            ]);

            const score = await rankingService.getUserScore(testGuildId, 'user1');
            expect(score).toBe(300);
        });
    });

    // ============================================================================
    // CONTEXT QUERIES
    // ============================================================================

    describe('Context Queries (Around Rank)', () => {
        beforeEach(async () => {
            const users = Array.from({ length: 100 }, (_, i) => ({
                userId: `user${i}`,
                totalXp: (100 - i) * 10, // Descending
            }));
            await rankingService.batchUpdateScores(testGuildId, users);
        });

        test('should get users around rank #50', async () => {
            const context = await rankingService.getUsersAroundRank(testGuildId, 'user49', 5);
            
            expect(context.length).toBeGreaterThan(0);
            expect(context.length).toBeLessThanOrEqual(11); // 5 before + user + 5 after
            
            // Find the target user in results
            const targetUser = context.find(u => u.userId === 'user49');
            expect(targetUser).toBeDefined();
            expect(targetUser?.rank).toBe(50);
        });

        test('should handle context at rank #1', async () => {
            const context = await rankingService.getUsersAroundRank(testGuildId, 'user0', 5);
            
            const targetUser = context.find(u => u.userId === 'user0');
            expect(targetUser?.rank).toBe(1);
            
            // Should only have users after, not before
            const allRanks = context.map(u => u.rank);
            expect(Math.min(...allRanks)).toBe(1);
        });

        test('should handle context at last rank', async () => {
            const context = await rankingService.getUsersAroundRank(testGuildId, 'user99', 5);
            
            const targetUser = context.find(u => u.userId === 'user99');
            expect(targetUser?.rank).toBe(100);
            
            // Should only have users before, not after
            const allRanks = context.map(u => u.rank);
            expect(Math.max(...allRanks)).toBe(100);
        });
    });

    // ============================================================================
    // SCORE RANGE QUERIES
    // ============================================================================

    describe('Score Range Queries', () => {
        beforeEach(async () => {
            const users = Array.from({ length: 50 }, (_, i) => ({
                userId: `user${i}`,
                totalXp: i * 100, // 0, 100, 200, ..., 4900
            }));
            await rankingService.batchUpdateScores(testGuildId, users);
        });

        test('should get users in score range 1000-2000', async () => {
            const users = await rankingService.getUsersByScoreRange(testGuildId, 1000, 2000);
            
            expect(users.length).toBe(11); // 1000, 1100, ..., 2000
            
            for (const user of users) {
                expect(user.totalXp).toBeGreaterThanOrEqual(1000);
                expect(user.totalXp).toBeLessThanOrEqual(2000);
            }
        });

        test('should get users above 4500', async () => {
            const users = await rankingService.getUsersByScoreRange(testGuildId, 4500, Infinity);
            
            expect(users.length).toBeGreaterThan(0);
            
            for (const user of users) {
                expect(user.totalXp).toBeGreaterThanOrEqual(4500);
            }
        });

        test('should limit results in score range', async () => {
            const users = await rankingService.getUsersByScoreRange(testGuildId, 0, 5000, 5);
            
            expect(users.length).toBeLessThanOrEqual(5);
        });
    });

    // ============================================================================
    // REMOVAL OPERATIONS
    // ============================================================================

    describe('User Removal', () => {
        beforeEach(async () => {
            await rankingService.batchUpdateScores(testGuildId, [
                { userId: 'user1', totalXp: 1000 },
                { userId: 'user2', totalXp: 900 },
                { userId: 'user3', totalXp: 800 },
            ]);
        });

        test('should remove user from leaderboard', async () => {
            await rankingService.removeUser(testGuildId, 'user2');
            
            const rank = await rankingService.getUserRank(testGuildId, 'user2');
            expect(rank).toBeNull();
            
            const total = await rankingService.getTotalRankedUsers(testGuildId);
            expect(total).toBe(2);
        });

        test('should update ranks after removal', async () => {
            await rankingService.removeUser(testGuildId, 'user2');
            
            const rank1 = await rankingService.getUserRank(testGuildId, 'user1');
            const rank3 = await rankingService.getUserRank(testGuildId, 'user3');
            
            expect(rank1).toBe(1);
            expect(rank3).toBe(2); // Moved up from #3 to #2
        });
    });

    // ============================================================================
    // MULTI-GUILD ISOLATION
    // ============================================================================

    describe('Multi-Guild Isolation', () => {
        const guild1 = 'guild-1';
        const guild2 = 'guild-2';

        afterEach(async () => {
            await rankingService.clearLeaderboard(guild1);
            await rankingService.clearLeaderboard(guild2);
        });

        test('should keep guild leaderboards separate', async () => {
            await rankingService.updateUserScore(guild1, 'user1', 1000);
            await rankingService.updateUserScore(guild2, 'user1', 500);

            const score1 = await rankingService.getUserScore(guild1, 'user1');
            const score2 = await rankingService.getUserScore(guild2, 'user1');

            expect(score1).toBe(1000);
            expect(score2).toBe(500);
        });

        test('should maintain separate rankings per guild', async () => {
            // Guild 1: user1 is #1
            await rankingService.batchUpdateScores(guild1, [
                { userId: 'user1', totalXp: 1000 },
                { userId: 'user2', totalXp: 500 },
            ]);

            // Guild 2: user2 is #1
            await rankingService.batchUpdateScores(guild2, [
                { userId: 'user1', totalXp: 500 },
                { userId: 'user2', totalXp: 1000 },
            ]);

            const rank1Guild1 = await rankingService.getUserRank(guild1, 'user1');
            const rank1Guild2 = await rankingService.getUserRank(guild2, 'user1');

            expect(rank1Guild1).toBe(1);
            expect(rank1Guild2).toBe(2);
        });

        test('should clear only specified guild', async () => {
            await rankingService.updateUserScore(guild1, 'user1', 1000);
            await rankingService.updateUserScore(guild2, 'user1', 1000);

            await rankingService.clearLeaderboard(guild1);

            const total1 = await rankingService.getTotalRankedUsers(guild1);
            const total2 = await rankingService.getTotalRankedUsers(guild2);

            expect(total1).toBe(0);
            expect(total2).toBe(1);
        });
    });

    // ============================================================================
    // EDGE CASES
    // ============================================================================

    describe('Edge Cases', () => {
        test('should handle user IDs with special characters', async () => {
            const specialIds = [
                'user:with:colons',
                'user-with-dashes',
                'user_with_underscores',
                'user.with.dots',
                'user@with@at',
            ];

            for (const userId of specialIds) {
                await rankingService.updateUserScore(testGuildId, userId, 100);
            }

            for (const userId of specialIds) {
                const score = await rankingService.getUserScore(testGuildId, userId);
                expect(score).toBe(100);
            }
        });

        test('should handle very long user IDs', async () => {
            const longId = 'u'.repeat(100);
            await rankingService.updateUserScore(testGuildId, longId, 500);

            const score = await rankingService.getUserScore(testGuildId, longId);
            expect(score).toBe(500);
        });

        test('should handle negative XP values', async () => {
            await rankingService.updateUserScore(testGuildId, 'user1', -100);

            const score = await rankingService.getUserScore(testGuildId, 'user1');
            expect(score).toBe(-100);
        });

        test('should handle decimal XP values', async () => {
            await rankingService.updateUserScore(testGuildId, 'user1', 123.45);

            const score = await rankingService.getUserScore(testGuildId, 'user1');
            expect(score).toBeCloseTo(123.45, 2);
        });
    });

    // ============================================================================
    // STRESS TESTS
    // ============================================================================

    describe('Stress Tests', () => {
        test('should handle rapid consecutive updates', async () => {
            const updates = [];
            for (let i = 0; i < 100; i++) {
                updates.push(
                    rankingService.updateUserScore(testGuildId, 'user1', i)
                );
            }

            await Promise.all(updates);

            const score = await rankingService.getUserScore(testGuildId, 'user1');
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThan(100);
        });

        test('should handle concurrent batch updates', async () => {
            const batches = [];
            
            for (let batch = 0; batch < 10; batch++) {
                const users = Array.from({ length: 100 }, (_, i) => ({
                    userId: `user${batch * 100 + i}`,
                    totalXp: Math.random() * 10000,
                }));
                
                batches.push(rankingService.batchUpdateScores(testGuildId, users));
            }

            await Promise.all(batches);

            const total = await rankingService.getTotalRankedUsers(testGuildId);
            expect(total).toBe(1000);
        });
    });
});
