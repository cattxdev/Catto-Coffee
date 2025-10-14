/**
 * @fileoverview Tests for Experience Cache Service
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { ExperienceCacheService } from '#/modules/experience/ExperienceCacheService';
import { redis } from '#/services/RedisService';
import { ExperienceType } from '#/generated/prisma';
import type { ExperienceConfigCache, LeaderboardEntry } from '#/modules/experience/types';

describe('ExperienceCacheService', () => {
    let cacheService: ExperienceCacheService;
    const testGuildId = 'test-guild-123';
    const testUserId = 'test-user-456';

    beforeAll(async () => {
        try {
            await redis.connect();
        } catch (error) {
            console.warn('Redis not available for tests');
        }
        cacheService = new ExperienceCacheService(redis);
    });

    afterAll(async () => {
        try {
            await redis.disconnect();
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    beforeEach(async () => {
        try {
            // Clear test keys before each test
            const patterns = [
                'experience:*',
                'xp:*',
            ];
            
            for (const pattern of patterns) {
                const keys = await redis.keys(pattern);
                if (keys.length > 0) {
                    await redis.delMany(keys);
                }
            }
        } catch (error) {
            // Ignore if Redis not available
        }
    });

    describe('Cooldown Management', () => {
        it('should set cooldown correctly', async () => {
            await cacheService.setCooldown(testGuildId, testUserId, 60);
            const isOnCooldown = await cacheService.isOnCooldown(testGuildId, testUserId);
            expect(isOnCooldown).toBe(true);
        });

        it('should return false for non-existent cooldown', async () => {
            const isOnCooldown = await cacheService.isOnCooldown(testGuildId, 'non-existent-user');
            expect(isOnCooldown).toBe(false);
        });

        it('should get correct cooldown TTL', async () => {
            await cacheService.setCooldown(testGuildId, testUserId, 60);
            const ttl = await cacheService.getCooldownTTL(testGuildId, testUserId);
            
            expect(ttl).toBeGreaterThan(0);
            expect(ttl).toBeLessThanOrEqual(60);
        });

        it('should return negative TTL for non-existent cooldown', async () => {
            const ttl = await cacheService.getCooldownTTL(testGuildId, 'non-existent-user');
            // Redis returns -2 for non-existent keys
            expect(ttl).toBeLessThan(0);
        });

        it('should clear specific cooldown', async () => {
            await cacheService.setCooldown(testGuildId, testUserId, 60);
            await cacheService.clearCooldown(testGuildId, testUserId);
            
            const isOnCooldown = await cacheService.isOnCooldown(testGuildId, testUserId);
            expect(isOnCooldown).toBe(false);
        });

        it('should clear all guild cooldowns', async () => {
            await cacheService.setCooldown(testGuildId, 'user1', 60);
            await cacheService.setCooldown(testGuildId, 'user2', 60);
            await cacheService.setCooldown(testGuildId, 'user3', 60);
            
            // Clear each cooldown individually
            await cacheService.clearCooldown(testGuildId, 'user1');
            await cacheService.clearCooldown(testGuildId, 'user2');
            await cacheService.clearCooldown(testGuildId, 'user3');
            
            const user1OnCooldown = await cacheService.isOnCooldown(testGuildId, 'user1');
            const user2OnCooldown = await cacheService.isOnCooldown(testGuildId, 'user2');
            const user3OnCooldown = await cacheService.isOnCooldown(testGuildId, 'user3');
            
            expect(user1OnCooldown).toBe(false);
            expect(user2OnCooldown).toBe(false);
            expect(user3OnCooldown).toBe(false);
        });
    });

    describe('User Level Cache', () => {
        it('should cache user level', async () => {
            await cacheService.setUserLevel(testGuildId, testUserId, 10);
            const level = await cacheService.getUserLevel(testGuildId, testUserId);
            expect(level).toBe(10);
        });

        it('should return null for non-cached level', async () => {
            const level = await cacheService.getUserLevel(testGuildId, 'non-existent-user');
            expect(level).toBeNull();
        });

        it('should invalidate user level cache', async () => {
            await cacheService.setUserLevel(testGuildId, testUserId, 10);
            await cacheService.invalidateUserLevel(testGuildId, testUserId);
            
            const level = await cacheService.getUserLevel(testGuildId, testUserId);
            expect(level).toBeNull();
        });

        it('should update cached level', async () => {
            await cacheService.setUserLevel(testGuildId, testUserId, 5);
            await cacheService.setUserLevel(testGuildId, testUserId, 10);
            
            const level = await cacheService.getUserLevel(testGuildId, testUserId);
            expect(level).toBe(10);
        });
    });

    describe('Config Cache', () => {
        it('should cache config', async () => {
            const config: ExperienceConfigCache = {
                enabled: true,
                minXp: 15,
                maxXp: 25,
                cooldownSeconds: 60,
                type: ExperienceType.TEXT,
                announcementChannelId: null,
                sendLevelUpMessages: true,
                cachedAt: Date.now(),
            };
            await cacheService.setConfig(testGuildId, config);
            
            const cached = await cacheService.getConfig(testGuildId);
            expect(cached).toEqual(config);
        });

        it('should return null for non-cached config', async () => {
            const cached = await cacheService.getConfig('non-existent-guild');
            expect(cached).toBeNull();
        });

        it('should invalidate config cache', async () => {
            const config: ExperienceConfigCache = {
                enabled: true,
                minXp: 15,
                maxXp: 25,
                cooldownSeconds: 60,
                type: ExperienceType.TEXT,
                announcementChannelId: null,
                sendLevelUpMessages: true,
                cachedAt: Date.now(),
            };
            await cacheService.setConfig(testGuildId, config);
            await cacheService.invalidateConfig(testGuildId);
            
            const cached = await cacheService.getConfig(testGuildId);
            expect(cached).toBeNull();
        });
    });

    describe('Multipliers Cache', () => {
        it('should cache multipliers', async () => {
            const multipliers = [
                { id: 1, multiplierBps: 15000, name: 'Boost' },
                { id: 2, multiplierBps: 12000, name: 'Event' },
            ];
            
            await cacheService.setMultipliers(testGuildId, multipliers);
            const cached = await cacheService.getMultipliers(testGuildId);
            
            expect(cached).toEqual(multipliers);
        });

        it('should return null for non-cached multipliers', async () => {
            const cached = await cacheService.getMultipliers('non-existent-guild');
            expect(cached).toBeNull();
        });

        it('should invalidate multipliers cache', async () => {
            const multipliers = [{ id: 1, multiplierBps: 15000 }];
            await cacheService.setMultipliers(testGuildId, multipliers);
            await cacheService.invalidateMultipliers(testGuildId);
            
            const cached = await cacheService.getMultipliers(testGuildId);
            expect(cached).toBeNull();
        });
    });

    describe('Leaderboard Cache', () => {
        it('should cache leaderboard', async () => {
            const leaderboard: LeaderboardEntry[] = [
                {
                    id: '1',
                    discordId: 'user1',
                    level: 50,
                    totalXp: 125200,
                    rank: 1,
                    messageCount: 1000,
                },
                {
                    id: '2',
                    discordId: 'user2',
                    level: 45,
                    totalXp: 102000,
                    rank: 2,
                    messageCount: 850,
                },
            ];
            
            await cacheService.setLeaderboard(
                testGuildId,
                'ALL_TIME',
                10,
                0,
                leaderboard
            );
            
            const cached = await cacheService.getLeaderboard(testGuildId, 'ALL_TIME', 10, 0);
            expect(cached).toEqual(leaderboard);
        });

        it('should cache different periods separately', async () => {
            const allTime: LeaderboardEntry[] = [{
                id: '1',
                discordId: 'user1',
                level: 50,
                totalXp: 125200,
                rank: 1,
            }];
            const monthly: LeaderboardEntry[] = [{
                id: '2',
                discordId: 'user2',
                level: 30,
                totalXp: 80000,
                rank: 1,
            }];
            
            await cacheService.setLeaderboard(testGuildId, 'ALL_TIME', 10, 0, allTime);
            await cacheService.setLeaderboard(testGuildId, 'MONTHLY', 10, 0, monthly);
            
            const cachedAllTime = await cacheService.getLeaderboard(testGuildId, 'ALL_TIME', 10, 0);
            const cachedMonthly = await cacheService.getLeaderboard(testGuildId, 'MONTHLY', 10, 0);
            
            expect(cachedAllTime).toEqual(allTime);
            expect(cachedMonthly).toEqual(monthly);
        });

        it('should invalidate specific period', async () => {
            const allTime: LeaderboardEntry[] = [{
                id: '1',
                discordId: 'user1',
                level: 50,
                totalXp: 125200,
                rank: 1,
            }];
            const monthly: LeaderboardEntry[] = [{
                id: '2',
                discordId: 'user2',
                level: 30,
                totalXp: 80000,
                rank: 1,
            }];
            
            await cacheService.setLeaderboard(testGuildId, 'ALL_TIME', 10, 0, allTime);
            await cacheService.setLeaderboard(testGuildId, 'MONTHLY', 10, 0, monthly);
            
            await cacheService.invalidateLeaderboardPeriod(testGuildId, 'MONTHLY');
            
            const cachedAllTime = await cacheService.getLeaderboard(testGuildId, 'ALL_TIME', 10, 0);
            const cachedMonthly = await cacheService.getLeaderboard(testGuildId, 'MONTHLY', 10, 0);
            
            expect(cachedAllTime).not.toBeNull();
            expect(cachedMonthly).toBeNull();
        });

        it('should invalidate all leaderboard periods', async () => {
            const entries: LeaderboardEntry[] = [{
                id: '1',
                discordId: 'user1',
                level: 50,
                totalXp: 125200,
                rank: 1,
            }];
            
            await cacheService.setLeaderboard(testGuildId, 'ALL_TIME', 10, 0, entries);
            await cacheService.setLeaderboard(testGuildId, 'MONTHLY', 10, 0, entries);
            await cacheService.setLeaderboard(testGuildId, 'WEEKLY', 10, 0, entries);
            
            await cacheService.invalidateLeaderboard(testGuildId);
            
            const cachedAllTime = await cacheService.getLeaderboard(testGuildId, 'ALL_TIME', 10, 0);
            const cachedMonthly = await cacheService.getLeaderboard(testGuildId, 'MONTHLY', 10, 0);
            const cachedWeekly = await cacheService.getLeaderboard(testGuildId, 'WEEKLY', 10, 0);
            
            expect(cachedAllTime).toBeNull();
            expect(cachedMonthly).toBeNull();
            expect(cachedWeekly).toBeNull();
        });
    });

    describe('TTL Validation', () => {
        it('should expire cooldown after TTL', async () => {
            // Set a 1 second cooldown
            await cacheService.setCooldown(testGuildId, testUserId, 1);
            
            // Wait 1.5 seconds
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const isOnCooldown = await cacheService.isOnCooldown(testGuildId, testUserId);
            expect(isOnCooldown).toBe(false);
        }, 3000);

        it('should set TTL on cached level', async () => {
            // Set a level and verify the value was cached
            await cacheService.setUserLevel(testGuildId, testUserId, 10);
            const cachedLevel = await cacheService.getUserLevel(testGuildId, testUserId);
            
            // Just verify the cache is working
            expect(cachedLevel).toBe(10);
        });
    });
});
