/**
 * @fileoverview Integration Tests: Database ↔ Redis Sync
 * @author Catto Bot Team
 */

import { PrismaClient } from '../../../../generated/prisma';
import { ExperienceRankingService } from '../../../../src/modules/experience/ExperienceRankingService';
import { syncGuildLeaderboard, syncAllLeaderboards } from '../../../../src/modules/experience/utils/leaderboardSync';
import RedisService from '../../../../src/services/RedisService';

describe('Database-Redis Integration Tests', () => {
    let prisma: PrismaClient;
    let redisService: RedisService;
    let rankingService: ExperienceRankingService;
    const testGuildDiscordId = `test-guild-${Date.now()}`;
    let testGuildDbId: string;

    beforeAll(async () => {
        prisma = new PrismaClient();
        redisService = RedisService.getInstance();
        await redisService.connect();
        rankingService = new ExperienceRankingService(redisService);

        // Create test guild
        const guild = await prisma.guild.create({
            data: {
                discordId: testGuildDiscordId,
                name: 'Test Guild',
                isPremium: false,
            },
        });
        testGuildDbId = guild.id;
    });

    afterAll(async () => {
        // Clean up test data
        await prisma.guildMember.deleteMany({
            where: { guildId: testGuildDbId },
        });
        await prisma.guild.delete({
            where: { id: testGuildDbId },
        });
        await rankingService.clearLeaderboard(testGuildDiscordId);
        await prisma.$disconnect();
        await redisService.disconnect();
    });

    afterEach(async () => {
        // Clear Redis after each test
        await rankingService.clearLeaderboard(testGuildDiscordId);
    });

    // ============================================================================
    // BASIC SYNC TESTS
    // ============================================================================

    describe('Basic Synchronization', () => {
        test('should sync single user from database to Redis', async () => {
            // Create user and guild member in database
            const user = await prisma.user.create({
                data: {
                    discordId: `user-${Date.now()}`,
                    globalExperience: 0,
                    globalLevel: 1,
                    totalMessagesCount: 0,
                    totalVoiceTimeSeconds: 0,
                },
            });

            const member = await prisma.guildMember.create({
                data: {
                    userId: user.id,
                    userDiscordId: user.discordId,
                    guildId: testGuildDbId,
                    textTotalXp: 500,
                    textLevel: 5,
                },
            });

            // Sync to Redis
            await syncGuildLeaderboard(prisma, rankingService, testGuildDiscordId);

            // Verify in Redis
            const rank = await rankingService.getUserRank(testGuildDiscordId, user.discordId);
            const score = await rankingService.getUserScore(testGuildDiscordId, user.discordId);

            expect(rank).toBe(1);
            expect(score).toBe(500);

            // Clean up
            await prisma.guildMember.delete({ where: { id: member.id } });
            await prisma.user.delete({ where: { id: user.id } });
        });

        test('should sync 1000 users from database to Redis', async () => {
            const users = [];
            const members = [];

            // Create 1000 users in database
            for (let i = 0; i < 1000; i++) {
                const user = await prisma.user.create({
                    data: {
                        discordId: `bulk-user-${Date.now()}-${i}`,
                        globalExperience: 0,
                        globalLevel: 1,
                        totalMessagesCount: 0,
                        totalVoiceTimeSeconds: 0,
                    },
                });
                users.push(user);

                const member = await prisma.guildMember.create({
                    data: {
                        userId: user.id,
                        userDiscordId: user.discordId,
                        guildId: testGuildDbId,
                        textTotalXp: 1000 - i, // Descending XP
                        textLevel: 1,
                    },
                });
                members.push(member);
            }

            // Sync to Redis
            const startTime = Date.now();
            await syncGuildLeaderboard(prisma, rankingService, testGuildDiscordId);
            const syncTime = Date.now() - startTime;

            console.log(`✅ Synced 1000 users in ${syncTime}ms`);

            // Verify counts
            const totalRanked = await rankingService.getTotalRankedUsers(testGuildDiscordId);
            expect(totalRanked).toBe(1000);

            // Verify top user
            const topUser = users[0];
            const rank = await rankingService.getUserRank(testGuildDiscordId, topUser.discordId);
            expect(rank).toBe(1);

            // Verify last user
            const lastUser = users[999];
            const lastRank = await rankingService.getUserRank(testGuildDiscordId, lastUser.discordId);
            expect(lastRank).toBe(1000);

            // Clean up
            await prisma.guildMember.deleteMany({
                where: { id: { in: members.map(m => m.id) } },
            });
            await prisma.user.deleteMany({
                where: { id: { in: users.map(u => u.id) } },
            });
        }, 60000); // 1 minute timeout

        test('should handle empty guild (no users)', async () => {
            await syncGuildLeaderboard(prisma, rankingService, testGuildDiscordId);

            const total = await rankingService.getTotalRankedUsers(testGuildDiscordId);
            expect(total).toBe(0);
        });

        test('should only sync users with XP > 0', async () => {
            const usersWithXp = [];
            const usersWithoutXp = [];

            // Create 5 users with XP
            for (let i = 0; i < 5; i++) {
                const user = await prisma.user.create({
                    data: {
                        discordId: `user-with-xp-${Date.now()}-${i}`,
                        globalExperience: 0,
                        globalLevel: 1,
                        totalMessagesCount: 0,
                        totalVoiceTimeSeconds: 0,
                    },
                });
                usersWithXp.push(user);

                await prisma.guildMember.create({
                    data: {
                        userId: user.id,
                        userDiscordId: user.discordId,
                        guildId: testGuildDbId,
                        textTotalXp: 100,
                        textLevel: 1,
                    },
                });
            }

            // Create 5 users without XP
            for (let i = 0; i < 5; i++) {
                const user = await prisma.user.create({
                    data: {
                        discordId: `user-no-xp-${Date.now()}-${i}`,
                        globalExperience: 0,
                        globalLevel: 1,
                        totalMessagesCount: 0,
                        totalVoiceTimeSeconds: 0,
                    },
                });
                usersWithoutXp.push(user);

                await prisma.guildMember.create({
                    data: {
                        userId: user.id,
                        userDiscordId: user.discordId,
                        guildId: testGuildDbId,
                        textTotalXp: 0, // No XP
                        textLevel: 1,
                    },
                });
            }

            // Sync to Redis
            await syncGuildLeaderboard(prisma, rankingService, testGuildDiscordId);

            // Verify only 5 users in Redis
            const total = await rankingService.getTotalRankedUsers(testGuildDiscordId);
            expect(total).toBe(5);

            // Verify users with XP are ranked
            for (const user of usersWithXp) {
                const rank = await rankingService.getUserRank(testGuildDiscordId, user.discordId);
                expect(rank).not.toBeNull();
            }

            // Verify users without XP are not ranked
            for (const user of usersWithoutXp) {
                const rank = await rankingService.getUserRank(testGuildDiscordId, user.discordId);
                expect(rank).toBeNull();
            }

            // Clean up
            await prisma.guildMember.deleteMany({ where: { guildId: testGuildDbId } });
            await prisma.user.deleteMany({
                where: {
                    id: {
                        in: [...usersWithXp, ...usersWithoutXp].map(u => u.id),
                    },
                },
            });
        });
    });

    // ============================================================================
    // DATA CONSISTENCY TESTS
    // ============================================================================

    describe('Data Consistency', () => {
        test('should maintain correct order after sync', async () => {
            const testData = [
                { discordId: 'user-a', xp: 1000 },
                { discordId: 'user-b', xp: 500 },
                { discordId: 'user-c', xp: 750 },
                { discordId: 'user-d', xp: 250 },
                { discordId: 'user-e', xp: 900 },
            ];

            const users = [];
            for (const data of testData) {
                const user = await prisma.user.create({
                    data: {
                        discordId: `${data.discordId}-${Date.now()}`,
                        globalExperience: 0,
                        globalLevel: 1,
                        totalMessagesCount: 0,
                        totalVoiceTimeSeconds: 0,
                    },
                });
                users.push(user);

                await prisma.guildMember.create({
                    data: {
                        userId: user.id,
                        userDiscordId: user.discordId,
                        guildId: testGuildDbId,
                        textTotalXp: data.xp,
                        textLevel: 1,
                    },
                });
            }

            // Sync to Redis
            await syncGuildLeaderboard(prisma, rankingService, testGuildDiscordId);

            // Expected order: user-a (1000), user-e (900), user-c (750), user-b (500), user-d (250)
            const topUsers = await rankingService.getTopUsers(testGuildDiscordId, 5);

            expect(topUsers[0].totalXp).toBe(1000);
            expect(topUsers[1].totalXp).toBe(900);
            expect(topUsers[2].totalXp).toBe(750);
            expect(topUsers[3].totalXp).toBe(500);
            expect(topUsers[4].totalXp).toBe(250);

            // Clean up
            await prisma.guildMember.deleteMany({ where: { guildId: testGuildDbId } });
            await prisma.user.deleteMany({
                where: { id: { in: users.map(u => u.id) } },
            });
        });

        test('should match database XP values exactly', async () => {
            const user = await prisma.user.create({
                data: {
                    discordId: `exact-match-${Date.now()}`,
                    globalExperience: 0,
                    globalLevel: 1,
                    totalMessagesCount: 0,
                    totalVoiceTimeSeconds: 0,
                },
            });

            const member = await prisma.guildMember.create({
                data: {
                    userId: user.id,
                    userDiscordId: user.discordId,
                    guildId: testGuildDbId,
                    textTotalXp: 12345,
                    textLevel: 10,
                },
            });

            await syncGuildLeaderboard(prisma, rankingService, testGuildDiscordId);

            const redisScore = await rankingService.getUserScore(testGuildDiscordId, user.discordId);
            expect(redisScore).toBe(12345);

            // Clean up
            await prisma.guildMember.delete({ where: { id: member.id } });
            await prisma.user.delete({ where: { id: user.id } });
        });
    });

    // ============================================================================
    // RE-SYNC TESTS
    // ============================================================================

    describe('Re-synchronization', () => {
        test('should update Redis when database changes', async () => {
            const user = await prisma.user.create({
                data: {
                    discordId: `resync-user-${Date.now()}`,
                    globalExperience: 0,
                    globalLevel: 1,
                    totalMessagesCount: 0,
                    totalVoiceTimeSeconds: 0,
                },
            });

            const member = await prisma.guildMember.create({
                data: {
                    userId: user.id,
                    userDiscordId: user.discordId,
                    guildId: testGuildDbId,
                    textTotalXp: 100,
                    textLevel: 1,
                },
            });

            // Initial sync
            await syncGuildLeaderboard(prisma, rankingService, testGuildDiscordId);
            let score = await rankingService.getUserScore(testGuildDiscordId, user.discordId);
            expect(score).toBe(100);

            // Update database
            await prisma.guildMember.update({
                where: { id: member.id },
                data: { textTotalXp: 500 },
            });

            // Re-sync
            await syncGuildLeaderboard(prisma, rankingService, testGuildDiscordId);
            score = await rankingService.getUserScore(testGuildDiscordId, user.discordId);
            expect(score).toBe(500);

            // Clean up
            await prisma.guildMember.delete({ where: { id: member.id } });
            await prisma.user.delete({ where: { id: user.id } });
        });

        test('should handle user removal from database', async () => {
            const user = await prisma.user.create({
                data: {
                    discordId: `removal-user-${Date.now()}`,
                    globalExperience: 0,
                    globalLevel: 1,
                    totalMessagesCount: 0,
                    totalVoiceTimeSeconds: 0,
                },
            });

            const member = await prisma.guildMember.create({
                data: {
                    userId: user.id,
                    userDiscordId: user.discordId,
                    guildId: testGuildDbId,
                    textTotalXp: 100,
                    textLevel: 1,
                },
            });

            // Initial sync
            await syncGuildLeaderboard(prisma, rankingService, testGuildDiscordId);
            let rank = await rankingService.getUserRank(testGuildDiscordId, user.discordId);
            expect(rank).toBe(1);

            // Remove from database
            await prisma.guildMember.delete({ where: { id: member.id } });

            // Re-sync
            await syncGuildLeaderboard(prisma, rankingService, testGuildDiscordId);
            rank = await rankingService.getUserRank(testGuildDiscordId, user.discordId);
            expect(rank).toBeNull(); // Should not exist in Redis anymore

            // Clean up
            await prisma.user.delete({ where: { id: user.id } });
        });
    });

    // ============================================================================
    // MULTI-GUILD SYNC TESTS
    // ============================================================================

    describe('Multi-Guild Synchronization', () => {
        test('should sync all guilds independently', async () => {
            // Create two more test guilds
            const guild2 = await prisma.guild.create({
                data: {
                    discordId: `test-guild-2-${Date.now()}`,
                    name: 'Test Guild 2',
                    isPremium: false,
                },
            });

            const guild3 = await prisma.guild.create({
                data: {
                    discordId: `test-guild-3-${Date.now()}`,
                    name: 'Test Guild 3',
                    isPremium: false,
                },
            });

            // Create users in each guild
            const user1 = await prisma.user.create({
                data: {
                    discordId: `multi-guild-user1-${Date.now()}`,
                    globalExperience: 0,
                    globalLevel: 1,
                    totalMessagesCount: 0,
                    totalVoiceTimeSeconds: 0,
                },
            });

            await prisma.guildMember.create({
                data: {
                    userId: user1.id,
                    userDiscordId: user1.discordId,
                    guildId: testGuildDbId,
                    textTotalXp: 100,
                    textLevel: 1,
                },
            });

            await prisma.guildMember.create({
                data: {
                    userId: user1.id,
                    userDiscordId: user1.discordId,
                    guildId: guild2.id,
                    textTotalXp: 200,
                    textLevel: 1,
                },
            });

            await prisma.guildMember.create({
                data: {
                    userId: user1.id,
                    userDiscordId: user1.discordId,
                    guildId: guild3.id,
                    textTotalXp: 300,
                    textLevel: 1,
                },
            });

            // Sync all guilds
            await syncAllLeaderboards(prisma, rankingService);

            // Verify independent scores
            const score1 = await rankingService.getUserScore(testGuildDiscordId, user1.discordId);
            const score2 = await rankingService.getUserScore(guild2.discordId, user1.discordId);
            const score3 = await rankingService.getUserScore(guild3.discordId, user1.discordId);

            expect(score1).toBe(100);
            expect(score2).toBe(200);
            expect(score3).toBe(300);

            // Clean up
            await rankingService.clearLeaderboard(guild2.discordId);
            await rankingService.clearLeaderboard(guild3.discordId);
            await prisma.guildMember.deleteMany({
                where: { userId: user1.id },
            });
            await prisma.user.delete({ where: { id: user1.id } });
            await prisma.guild.delete({ where: { id: guild2.id } });
            await prisma.guild.delete({ where: { id: guild3.id } });
        });
    });
});
