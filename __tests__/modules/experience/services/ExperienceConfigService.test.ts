/**
 * @fileoverview Tests for Experience Config Service
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client/edge';
import { ExperienceType } from '../../../../generated/prisma';
import { ExperienceCacheService } from '../../../../src/modules/experience/ExperienceCacheService';
import { ExperienceConfigService } from '../../../../src/modules/experience/services/ExperienceConfigService';

describe('ExperienceConfigService', () => {
    let service: ExperienceConfigService;
    let mockPrisma: jest.Mocked<PrismaClient>;
    let mockCache: jest.Mocked<ExperienceCacheService>;

    beforeEach(() => {
        // Create mock Prisma client
        mockPrisma = {
            experienceConfig: {
                findFirst: jest.fn(),
            },
            guild: {
                findUnique: jest.fn(),
            },
        } as any;

        // Create mock cache service
        mockCache = {
            getConfig: jest.fn(),
            setConfig: jest.fn(),
            invalidateConfig: jest.fn(),
        } as any;

        service = new ExperienceConfigService(mockPrisma, mockCache);
    });

    describe('getConfig', () => {
        it('should return cached config if available', async () => {
            const cachedConfig = {
                enabled: true,
                minXp: 10,
                maxXp: 20,
                cooldownSeconds: 30,
                type: 'TEXT' as any,
                announcementChannelId: null,
                sendLevelUpMessages: true,
                cachedAt: Date.now(),
            };

            mockCache.getConfig.mockResolvedValue(cachedConfig);

            const result = await service.getConfig('guild-123');

            expect(mockCache.getConfig).toHaveBeenCalledWith('guild-123');
            expect(result.enabled).toBe(true);
            expect(result.minXp).toBe(10);
            expect(result.maxXp).toBe(20);
            expect(mockPrisma.experienceConfig.findFirst).not.toHaveBeenCalled();
        });

        it('should fetch from database if not cached', async () => {
            mockCache.getConfig.mockResolvedValue(null);
            mockPrisma.guild.findUnique.mockResolvedValue({
                id: 'guild-123',
                discordId: 'guild-456',
                experienceConfigs: [
                    {
                        id: '1',
                        guildId: 'guild-123',
                        type: 'TEXT' as any,
                        isEnabled: true,
                        minXp: 15,
                        maxXp: 25,
                        cooldownSeconds: 60,
                        announceLevel: true,
                        announceChannelId: null,
                        announceMessage: null,
                        announceDmUser: false,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ],
            } as any);

            const result = await service.getConfig('guild-123');

            expect(mockPrisma.guild.findUnique).toHaveBeenCalled();
            expect(mockCache.setConfig).toHaveBeenCalled();
            expect(result.enabled).toBe(true);
            expect(result.minXp).toBe(15);
            expect(result.maxXp).toBe(25);
        });

        it('should return default config if not found', async () => {
            mockCache.getConfig.mockResolvedValue(null);
            mockPrisma.experienceConfig.findFirst.mockResolvedValue(null);

            const result = await service.getConfig('guild-123');

            expect(result.enabled).toBe(true);
            expect(result.minXp).toBe(15);
            expect(result.maxXp).toBe(25);
            expect(result.cooldownSeconds).toBe(60);
        });

        it('should cache fetched config', async () => {
            mockCache.getConfig.mockResolvedValue(null);
            mockPrisma.experienceConfig.findFirst.mockResolvedValue({
                id: '1',
                guildId: 'guild-123',
                type: ExperienceType.TEXT,
                isEnabled: false,
                minXp: 20,
                maxXp: 30,
                cooldownSeconds: 45,
                announceLevel: true,
                announceChannelId: null,
                announceMessage: null,
                announceDmUser: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any);

            await service.getConfig('guild-123');

            expect(mockCache.setConfig).toHaveBeenCalledWith(
                'guild-123',
                expect.any(Object)
            );
        });
    });

    describe('isEnabled', () => {
        it('should return true when config is enabled', async () => {
            mockCache.getConfig.mockResolvedValue({
                enabled: true,
                minXp: 15,
                maxXp: 25,
                cooldownSeconds: 60,
                type: 'TEXT' as any,
                announcementChannelId: null,
                sendLevelUpMessages: true,
                cachedAt: Date.now(),
            });

            const result = await service.isEnabled('guild-123');
            expect(result).toBe(true);
        });

        it('should return false when config is disabled', async () => {
            mockCache.getConfig.mockResolvedValue({
                enabled: false,
                minXp: 15,
                maxXp: 25,
                cooldownSeconds: 60,
                type: 'TEXT' as any,
                announcementChannelId: null,
                sendLevelUpMessages: true,
                cachedAt: Date.now(),
            });

            const result = await service.isEnabled('guild-123');
            expect(result).toBe(false);
        });
    });

    describe('invalidateCache', () => {
        it('should call cache invalidation', async () => {
            await service.invalidateCache('guild-123');
            expect(mockCache.invalidateConfig).toHaveBeenCalledWith('guild-123');
        });
    });
});
