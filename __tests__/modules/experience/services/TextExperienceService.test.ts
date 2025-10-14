/**
 * @fileoverview Tests for Text Experience Service (Integration)
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TextExperienceService } from '#/modules/experience/services/TextExperienceService';
import type { PrismaClient } from '#/generated/prisma';
import { ExperienceCacheService } from '#/modules/experience/ExperienceCacheService';
import { ExperienceType } from '#/generated/prisma';

describe('TextExperienceService (Integration)', () => {
    let service: TextExperienceService;
    let mockPrisma: jest.Mocked<PrismaClient>;
    let mockCache: jest.Mocked<ExperienceCacheService>;

    beforeEach(() => {
        // Mock Prisma
        mockPrisma = {
            experienceConfig: {
                findFirst: jest.fn(),
            },
            experienceMultiplier: {
                findMany: jest.fn(),
            },
            user: {
                upsert: jest.fn(),
                update: jest.fn(),
            },
            guild: {
                upsert: jest.fn(),
            },
            guildMember: {
                upsert: jest.fn(),
                update: jest.fn(),
            },
            experienceReward: {
                findMany: jest.fn(),
            },
            auditLog: {
                create: jest.fn(),
            },
        } as any;

        // Mock Cache
        mockCache = {
            getCachedConfig: jest.fn(),
            cacheConfig: jest.fn(),
            invalidateConfig: jest.fn(),
            getCachedMultipliers: jest.fn(),
            cacheMultipliers: jest.fn(),
            invalidateMultipliers: jest.fn(),
            isOnCooldown: jest.fn(),
            setCooldown: jest.fn(),
            getCooldownTTL: jest.fn(),
            clearCooldown: jest.fn(),
            clearAllCooldowns: jest.fn(),
            getCachedUserLevel: jest.fn(),
            cacheUserLevel: jest.fn(),
            invalidateUserLevel: jest.fn(),
        } as any;

        service = new TextExperienceService(mockPrisma, mockCache);
    });

    describe('awardExperience', () => {
        it('should return null if experience is disabled', async () => {
            mockCache.getCachedConfig.mockResolvedValue(
                JSON.stringify({
                    enabled: false,
                    minXp: 15,
                    maxXp: 25,
                    cooldownSeconds: 60,
                })
            );

            const result = await service.awardExperience('user-123', 'guild-456');

            expect(result).toBeNull();
            expect(mockCache.isOnCooldown).not.toHaveBeenCalled();
        });

        it('should return null if user is on cooldown', async () => {
            mockCache.getCachedConfig.mockResolvedValue(
                JSON.stringify({
                    enabled: true,
                    minXp: 15,
                    maxXp: 25,
                    cooldownSeconds: 60,
                })
            );
            mockCache.isOnCooldown.mockResolvedValue(true);

            const result = await service.awardExperience('user-123', 'guild-456');

            expect(result).toBeNull();
        });

        it('should award experience and handle level up', async () => {
            // Setup mocks
            mockCache.getCachedConfig.mockResolvedValue(
                JSON.stringify({
                    enabled: true,
                    minXp: 15,
                    maxXp: 25,
                    cooldownSeconds: 60,
                })
            );
            mockCache.isOnCooldown.mockResolvedValue(false);
            mockCache.getCachedMultipliers.mockResolvedValue(JSON.stringify([]));

            const mockUser = {
                id: 1,
                discordId: 'user-123',
                globalTextXp: 0,
                globalVoiceMinutes: 0,
                totalTextMessages: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockGuild = {
                id: 2,
                discordId: 'guild-456',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockMember = {
                id: 3,
                userId: 1,
                guildId: 2,
                textTotalXp: 80,
                textLevel: 0,
                voiceTotalMinutes: 0,
                voiceLevel: 0,
                textMessagesToday: 0,
                textMessagesWeek: 0,
                textMessagesMonth: 0,
                voiceMinutesToday: 0,
                voiceMinutesWeek: 0,
                voiceMinutesMonth: 0,
                joinedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const updatedMember = {
                ...mockMember,
                textTotalXp: 105, // 80 + ~25 XP = level up to 1
                textLevel: 1,
                textMessagesToday: 1,
                textMessagesWeek: 1,
                textMessagesMonth: 1,
            };

            mockPrisma.user.upsert.mockResolvedValue(mockUser as any);
            mockPrisma.guild.upsert.mockResolvedValue(mockGuild as any);
            mockPrisma.guildMember.upsert.mockResolvedValue(mockMember as any);
            mockPrisma.guildMember.update.mockResolvedValue(updatedMember as any);
            mockPrisma.user.update.mockResolvedValue({} as any);
            mockPrisma.experienceReward.findMany.mockResolvedValue([
                {
                    id: 1,
                    guildId: 2,
                    level: 1,
                    roleId: 'role-789',
                    removeOldRewards: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ] as any);
            mockPrisma.auditLog.create.mockResolvedValue({} as any);

            const result = await service.awardExperience('user-123', 'guild-456');

            expect(result).not.toBeNull();
            expect(result?.levelUp.leveledUp).toBe(true);
            expect(result?.levelUp.oldLevel).toBe(0);
            expect(result?.levelUp.newLevel).toBe(1);
            expect(result?.levelUp.rewards).toContain('role-789');
            expect(mockCache.setCooldown).toHaveBeenCalledWith('guild-456', 'user-123', 60);
            expect(mockCache.invalidateUserLevel).toHaveBeenCalled();
        });

        it('should award experience without level up', async () => {
            mockCache.getCachedConfig.mockResolvedValue(
                JSON.stringify({
                    enabled: true,
                    minXp: 15,
                    maxXp: 25,
                    cooldownSeconds: 60,
                })
            );
            mockCache.isOnCooldown.mockResolvedValue(false);
            mockCache.getCachedMultipliers.mockResolvedValue(JSON.stringify([]));

            const mockUser = {
                id: 1,
                discordId: 'user-123',
                globalTextXp: 0,
                globalVoiceMinutes: 0,
                totalTextMessages: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockGuild = {
                id: 2,
                discordId: 'guild-456',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockMember = {
                id: 3,
                userId: 1,
                guildId: 2,
                textTotalXp: 50,
                textLevel: 0,
                voiceTotalMinutes: 0,
                voiceLevel: 0,
                textMessagesToday: 0,
                textMessagesWeek: 0,
                textMessagesMonth: 0,
                voiceMinutesToday: 0,
                voiceMinutesWeek: 0,
                voiceMinutesMonth: 0,
                joinedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const updatedMember = {
                ...mockMember,
                textTotalXp: 70,
                textLevel: 0,
                textMessagesToday: 1,
                textMessagesWeek: 1,
                textMessagesMonth: 1,
            };

            mockPrisma.user.upsert.mockResolvedValue(mockUser as any);
            mockPrisma.guild.upsert.mockResolvedValue(mockGuild as any);
            mockPrisma.guildMember.upsert.mockResolvedValue(mockMember as any);
            mockPrisma.guildMember.update.mockResolvedValue(updatedMember as any);
            mockPrisma.user.update.mockResolvedValue({} as any);

            const result = await service.awardExperience('user-123', 'guild-456');

            expect(result).not.toBeNull();
            expect(result?.levelUp.leveledUp).toBe(false);
            expect(result?.totalXp).toBe(70);
            expect(mockCache.invalidateUserLevel).not.toHaveBeenCalled();
        });
    });

    describe('checkCooldown', () => {
        it('should return cooldown info when on cooldown', async () => {
            mockCache.isOnCooldown.mockResolvedValue(true);
            mockCache.getCooldownTTL.mockResolvedValue(30);

            const result = await service.checkCooldown('user-123', 'guild-456');

            expect(result.onCooldown).toBe(true);
            expect(result.remainingTime).toBe(30000);
            expect(result.expiresAt).toBeInstanceOf(Date);
        });

        it('should return not on cooldown when cooldown expired', async () => {
            mockCache.isOnCooldown.mockResolvedValue(false);

            const result = await service.checkCooldown('user-123', 'guild-456');

            expect(result.onCooldown).toBe(false);
            expect(result.remainingTime).toBe(0);
            expect(result.expiresAt).toBeNull();
        });
    });

    describe('getConfig', () => {
        it('should delegate to config service', async () => {
            mockCache.getCachedConfig.mockResolvedValue(
                JSON.stringify({
                    enabled: true,
                    minXp: 15,
                    maxXp: 25,
                    cooldownSeconds: 60,
                })
            );

            const result = await service.getConfig('guild-456');

            expect(result.enabled).toBe(true);
            expect(result.minXp).toBe(15);
        });
    });

    describe('invalidateConfigCache', () => {
        it('should invalidate config cache', async () => {
            await service.invalidateConfigCache('guild-456');
            expect(mockCache.invalidateConfig).toHaveBeenCalledWith('guild-456');
        });
    });

    describe('invalidateMultipliersCache', () => {
        it('should invalidate multipliers cache', async () => {
            await service.invalidateMultipliersCache('guild-456');
            expect(mockCache.invalidateMultipliers).toHaveBeenCalledWith('guild-456');
        });
    });
});
