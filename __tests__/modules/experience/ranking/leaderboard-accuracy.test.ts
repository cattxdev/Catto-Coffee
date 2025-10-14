/**
 * @fileoverview Leaderboard Accuracy Test - Verifies 100% accurate ranking
 * @author Catto Bot Team
 */

import { ExperienceRankingService } from '../../../../src/modules/experience/ExperienceRankingService';
import { ExperienceCalculator } from '../../../../src/modules/experience/ExperienceCalculator';
import RedisService from '../../../../src/services/RedisService';

describe('Leaderboard Accuracy Test', () => {
    let redisService: RedisService;
    let rankingService: ExperienceRankingService;
    const testGuildId = `accuracy-test-${Date.now()}`;

    beforeAll(async () => {
        redisService = RedisService.getInstance();
        await redisService.connect();
        rankingService = new ExperienceRankingService(redisService);
    });

    afterAll(async () => {
        await rankingService.clearLeaderboard(testGuildId);
        await redisService.disconnect();
    });

    afterEach(async () => {
        await rankingService.clearLeaderboard(testGuildId);
    });

    describe('Realistic User Leaderboard - 100% Accuracy', () => {
        test('should rank users accurately by total XP across different levels', async () => {
            // Create realistic test users with varying XP and levels
            // Formula: XP for level = (level - 1)^2 * 100
            const testUsers = [
                {
                    id: '266571914372186114',
                    name: 'Alice',
                    level: 50,
                    totalXp: 240100, // (50-1)^2 * 100
                    expectedRank: 1,
                },
                {
                    id: '123456789012345678',
                    name: 'Bob',
                    level: 45,
                    totalXp: 193700, // (45-1)^2 * 100 + 100
                    expectedRank: 2,
                },
                {
                    id: '987654321098765432',
                    name: 'Charlie',
                    level: 40,
                    totalXp: 152100, // (40-1)^2 * 100
                    expectedRank: 3,
                },
                {
                    id: '111222333444555666',
                    name: 'Diana',
                    level: 35,
                    totalXp: 115700, // (35-1)^2 * 100 + 100
                    expectedRank: 4,
                },
                {
                    id: '777888999000111222',
                    name: 'Eve',
                    level: 30,
                    totalXp: 84100, // (30-1)^2 * 100
                    expectedRank: 5,
                },
                {
                    id: '333444555666777888',
                    name: 'Frank',
                    level: 25,
                    totalXp: 57700, // (25-1)^2 * 100 + 100
                    expectedRank: 6,
                },
                {
                    id: '999000111222333444',
                    name: 'Grace',
                    level: 20,
                    totalXp: 36100, // (20-1)^2 * 100
                    expectedRank: 7,
                },
                {
                    id: '555666777888999000',
                    name: 'Henry',
                    level: 15,
                    totalXp: 19700, // (15-1)^2 * 100 + 100
                    expectedRank: 8,
                },
                {
                    id: '222333444555666777',
                    name: 'Ivy',
                    level: 10,
                    totalXp: 8100, // (10-1)^2 * 100
                    expectedRank: 9,
                },
                {
                    id: '888999000111222333',
                    name: 'Jack',
                    level: 5,
                    totalXp: 1700, // (5-1)^2 * 100 + 100
                    expectedRank: 10,
                },
            ];

            console.log('\n📊 Test Users:');
            testUsers.forEach(user => {
                const calculatedLevel = ExperienceCalculator.calculateLevel(user.totalXp);
                console.log(`  ${user.name}: Level ${user.level} (${user.totalXp.toLocaleString()} XP) - Expected Rank #${user.expectedRank}`);
                expect(calculatedLevel).toBe(user.level); // Verify level calculation is correct
            });

            // Insert users in random order to test sorting
            const shuffledUsers = [...testUsers].sort(() => Math.random() - 0.5);
            console.log('\n🔀 Inserting users in random order...');

            const startInsert = Date.now();
            await rankingService.batchUpdateScores(
                testGuildId,
                shuffledUsers.map(u => ({ userId: u.id, totalXp: u.totalXp }))
            );
            const insertTime = Date.now() - startInsert;
            console.log(`✅ Inserted ${testUsers.length} users in ${insertTime}ms`);

            // Verify ranking accuracy
            console.log('\n🎯 Verifying Rankings:');
            for (const user of testUsers) {
                const startRank = Date.now();
                const actualRank = await rankingService.getUserRank(testGuildId, user.id);
                const rankTime = Date.now() - startRank;

                console.log(`  ${user.name}: Expected #${user.expectedRank}, Got #${actualRank} (${rankTime}ms)`);
                
                expect(actualRank).toBe(user.expectedRank);
                expect(rankTime).toBeLessThan(100); // Should be fast
            }

            // Verify score accuracy
            console.log('\n💎 Verifying XP Scores:');
            for (const user of testUsers) {
                const score = await rankingService.getUserScore(testGuildId, user.id);
                expect(score).toBe(user.totalXp);
                console.log(`  ${user.name}: ${user.totalXp.toLocaleString()} XP ✓`);
            }

            // Get full leaderboard
            console.log('\n📋 Full Leaderboard:');
            const startLeaderboard = Date.now();
            const leaderboard = await rankingService.getTopUsers(testGuildId, 10);
            const leaderboardTime = Date.now() - startLeaderboard;
            console.log(`✅ Retrieved leaderboard in ${leaderboardTime}ms`);

            expect(leaderboard).toHaveLength(10);
            expect(leaderboardTime).toBeLessThan(100);

            // Verify leaderboard order
            leaderboard.forEach((entry, index) => {
                const expectedUser = testUsers[index];
                expect(entry.userId).toBe(expectedUser.id);
                expect(entry.totalXp).toBe(expectedUser.totalXp);
                expect(entry.rank).toBe(expectedUser.expectedRank);
                console.log(`  #${entry.rank} - ${expectedUser.name}: ${entry.totalXp.toLocaleString()} XP`);
            });

            console.log('\n✅ All rankings are 100% accurate!');
        });

        test('should handle very close XP values accurately', async () => {
            // Test users with XP very close to each other
            const closeUsers = [
                { id: 'user1', name: 'User1', totalXp: 10000, expectedRank: 1 },
                { id: 'user2', name: 'User2', totalXp: 9999, expectedRank: 2 },
                { id: 'user3', name: 'User3', totalXp: 9998, expectedRank: 3 },
                { id: 'user4', name: 'User4', totalXp: 9997, expectedRank: 4 },
                { id: 'user5', name: 'User5', totalXp: 9996, expectedRank: 5 },
            ];

            console.log('\n🔬 Testing Close XP Values:');
            await rankingService.batchUpdateScores(
                testGuildId,
                closeUsers.map(u => ({ userId: u.id, totalXp: u.totalXp }))
            );

            for (const user of closeUsers) {
                const rank = await rankingService.getUserRank(testGuildId, user.id);
                console.log(`  ${user.name} (${user.totalXp} XP): Rank #${rank}`);
                expect(rank).toBe(user.expectedRank);
            }

            console.log('✅ Close XP rankings are accurate!');
        });

        test('should maintain accuracy after dynamic updates', async () => {
            // Initial state
            const users = [
                { id: 'alice', name: 'Alice', totalXp: 5000 },
                { id: 'bob', name: 'Bob', totalXp: 3000 },
                { id: 'charlie', name: 'Charlie', totalXp: 4000 },
            ];

            await rankingService.batchUpdateScores(
                testGuildId,
                users.map(u => ({ userId: u.id, totalXp: u.totalXp }))
            );

            console.log('\n📈 Initial Rankings:');
            let aliceRank = await rankingService.getUserRank(testGuildId, 'alice');
            let bobRank = await rankingService.getUserRank(testGuildId, 'bob');
            let charlieRank = await rankingService.getUserRank(testGuildId, 'charlie');

            console.log(`  Alice (5000 XP): #${aliceRank}`);
            console.log(`  Charlie (4000 XP): #${charlieRank}`);
            console.log(`  Bob (3000 XP): #${bobRank}`);

            expect(aliceRank).toBe(1);
            expect(charlieRank).toBe(2);
            expect(bobRank).toBe(3);

            // Bob gains XP and overtakes everyone
            console.log('\n⬆️ Bob gains 3000 XP (3000 → 6000):');
            await rankingService.updateUserScore(testGuildId, 'bob', 6000);

            aliceRank = await rankingService.getUserRank(testGuildId, 'alice');
            bobRank = await rankingService.getUserRank(testGuildId, 'bob');
            charlieRank = await rankingService.getUserRank(testGuildId, 'charlie');

            console.log(`  Bob (6000 XP): #${bobRank} ⭐`);
            console.log(`  Alice (5000 XP): #${aliceRank}`);
            console.log(`  Charlie (4000 XP): #${charlieRank}`);

            expect(bobRank).toBe(1);
            expect(aliceRank).toBe(2);
            expect(charlieRank).toBe(3);

            // Charlie gains XP and gets between Bob and Alice
            console.log('\n⬆️ Charlie gains 1500 XP (4000 → 5500):');
            await rankingService.updateUserScore(testGuildId, 'charlie', 5500);

            aliceRank = await rankingService.getUserRank(testGuildId, 'alice');
            bobRank = await rankingService.getUserRank(testGuildId, 'bob');
            charlieRank = await rankingService.getUserRank(testGuildId, 'charlie');

            console.log(`  Bob (6000 XP): #${bobRank}`);
            console.log(`  Charlie (5500 XP): #${charlieRank} ⭐`);
            console.log(`  Alice (5000 XP): #${aliceRank}`);

            expect(bobRank).toBe(1);
            expect(charlieRank).toBe(2);
            expect(aliceRank).toBe(3);

            console.log('\n✅ Rankings updated accurately after dynamic changes!');
        });

        test('should handle 1000 users with varying XP accurately', async () => {
            console.log('\n🎲 Testing 1000 users with random XP...');

            // Generate 1000 users with random but predictable XP
            const largeUserSet: Array<{ id: string; totalXp: number; expectedRank: number }> = [];
            
            for (let i = 0; i < 1000; i++) {
                largeUserSet.push({
                    id: `user-${i.toString().padStart(4, '0')}`,
                    totalXp: 1000000 - (i * 1000), // Descending: 1M, 999K, 998K, ...
                    expectedRank: i + 1,
                });
            }

            // Insert in random order
            const shuffled = [...largeUserSet].sort(() => Math.random() - 0.5);
            
            const startInsert = Date.now();
            await rankingService.batchUpdateScores(
                testGuildId,
                shuffled.map(u => ({ userId: u.id, totalXp: u.totalXp }))
            );
            const insertTime = Date.now() - startInsert;
            console.log(`✅ Inserted 1000 users in ${insertTime}ms (${(1000 / insertTime * 1000).toFixed(0)} users/sec)`);

            // Verify random sample of rankings
            const samplesToCheck = [0, 99, 249, 499, 749, 999];
            console.log('\n🔍 Checking sample rankings:');

            for (const index of samplesToCheck) {
                const user = largeUserSet[index];
                const startRank = Date.now();
                const rank = await rankingService.getUserRank(testGuildId, user.id);
                const rankTime = Date.now() - startRank;
                
                console.log(`  User #${index + 1} (${user.totalXp.toLocaleString()} XP): Rank #${rank} (${rankTime}ms)`);
                expect(rank).toBe(user.expectedRank);
                expect(rankTime).toBeLessThan(100);
            }

            // Get top 10
            const startTop = Date.now();
            const top10 = await rankingService.getTopUsers(testGuildId, 10);
            const topTime = Date.now() - startTop;
            
            console.log(`\n🏆 Top 10 Leaderboard (retrieved in ${topTime}ms):`);
            top10.forEach((entry, idx) => {
                const expectedUser = largeUserSet[idx];
                expect(entry.userId).toBe(expectedUser.id);
                expect(entry.totalXp).toBe(expectedUser.totalXp);
                expect(entry.rank).toBe(expectedUser.expectedRank);
                console.log(`  #${entry.rank} - ${entry.userId}: ${entry.totalXp.toLocaleString()} XP`);
            });

            expect(topTime).toBeLessThan(100);
            console.log('\n✅ 1000 users ranked with 100% accuracy!');
        });

        test('should handle level boundaries accurately', async () => {
            // Test users at exact level boundaries
            // Formula: XP for level = (level - 1)^2 * 100
            const boundaryUsers = [
                { id: 'lvl1', level: 1, totalXp: 0, expectedRank: 10 },
                { id: 'lvl2', level: 2, totalXp: 100, expectedRank: 9 },
                { id: 'lvl3', level: 3, totalXp: 400, expectedRank: 8 },
                { id: 'lvl5', level: 5, totalXp: 1600, expectedRank: 7 },
                { id: 'lvl10', level: 10, totalXp: 8100, expectedRank: 6 },
                { id: 'lvl15', level: 15, totalXp: 19600, expectedRank: 5 },
                { id: 'lvl20', level: 20, totalXp: 36100, expectedRank: 4 },
                { id: 'lvl30', level: 30, totalXp: 84100, expectedRank: 3 },
                { id: 'lvl50', level: 50, totalXp: 240100, expectedRank: 2 },
                { id: 'lvl100', level: 100, totalXp: 980100, expectedRank: 1 },
            ];

            console.log('\n🎯 Testing Level Boundaries:');
            
            for (const user of boundaryUsers) {
                const calculatedLevel = ExperienceCalculator.calculateLevel(user.totalXp);
                console.log(`  Level ${user.level}: ${user.totalXp.toLocaleString()} XP (Calculated: ${calculatedLevel})`);
                expect(calculatedLevel).toBe(user.level);
            }

            await rankingService.batchUpdateScores(
                testGuildId,
                boundaryUsers.map(u => ({ userId: u.id, totalXp: u.totalXp }))
            );

            console.log('\n📊 Verifying Boundary Rankings:');
            for (const user of boundaryUsers) {
                const rank = await rankingService.getUserRank(testGuildId, user.id);
                console.log(`  Level ${user.level} (${user.totalXp.toLocaleString()} XP): Rank #${rank}`);
                expect(rank).toBe(user.expectedRank);
            }

            console.log('✅ Level boundary rankings are 100% accurate!');
        });

        test('should maintain accuracy with concurrent rank checks', async () => {
            // Add users
            const users = Array.from({ length: 100 }, (_, i) => ({
                id: `concurrent-${i}`,
                totalXp: (100 - i) * 1000, // Descending
            }));

            await rankingService.batchUpdateScores(
                testGuildId,
                users.map(u => ({ userId: u.id, totalXp: u.totalXp }))
            );

            console.log('\n⚡ Testing concurrent rank lookups...');
            const startConcurrent = Date.now();

            // Check all ranks simultaneously
            const rankPromises = users.map((user, idx) =>
                rankingService.getUserRank(testGuildId, user.id).then(rank => ({
                    userId: user.id,
                    expectedRank: idx + 1,
                    actualRank: rank,
                }))
            );

            const results = await Promise.all(rankPromises);
            const concurrentTime = Date.now() - startConcurrent;

            console.log(`✅ Checked 100 ranks concurrently in ${concurrentTime}ms`);
            console.log(`   Average: ${(concurrentTime / 100).toFixed(2)}ms per lookup`);

            // Verify all are correct
            let allCorrect = true;
            for (const result of results) {
                if (result.actualRank !== result.expectedRank) {
                    console.error(`  ❌ ${result.userId}: Expected #${result.expectedRank}, Got #${result.actualRank}`);
                    allCorrect = false;
                }
                expect(result.actualRank).toBe(result.expectedRank);
            }

            if (allCorrect) {
                console.log('✅ All 100 concurrent rank checks are 100% accurate!');
            }
        });
    });
});
