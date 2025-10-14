/**
 * @fileoverview Tests for Experience Config Service
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ExperienceConfigService } from '#/modules/experience/services/ExperienceConfigService';
import type { PrismaClient } from '#/generated/prisma';
import { ExperienceCacheService } from '#/modules/experience/ExperienceCacheService';
import { ExperienceType } from '#/generated/prisma';

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
        } as any;

        // Create mock cache service
        mockCache = {
            getCachedConfig: jest.fn(),
            cacheConfig: jest.fn(),
            invalidateConfig: jest.fn(),
        } as any;

        service = new ExperienceConfigService(mockPrisma, mockCache);
    });

    describe('getConfig', () => {
        it('should return cached config if available', async () => {
            const cachedConfig = JSON.stringify({
                enabled: true,
                minXp: 10,
                maxXp: 20,
                cooldownSeconds: 30,
                type: ExperienceType.TEXT,
            });

            mockCache.getCachedConfig.mockResolvedValue(cachedConfig);

            const result = await service.getConfig('guild-123');

            expect(mockCache.getCachedConfig).toHaveBeenCalledWith('guild-123');
            expect(result.enabled).toBe(true);
            expect(result.minXp).toBe(10);
            expect(result.maxXp).toBe(20);
            expect(mockPrisma.experienceConfig.findFirst).not.toHaveBeenCalled();
        });

        it('should fetch from database if not cached', async () => {
            mockCache.getCachedConfig.mockResolvedValue(null);
            mockPrisma.experienceConfig.findFirst.mockResolvedValue({
                id: 1,
                guildId: 1,
                type: ExperienceType.TEXT,
                enabled: true,
                minXp: 15,
                maxXp: 25,
                cooldownSeconds: 60,
                announceChannel: null,
                announceMessage: null,
                ignoredChannels: [],
                ignoredRoles: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any);

            const result = await service.getConfig('guild-123');

            expect(mockPrisma.experienceConfig.findFirst).toHaveBeenCalled();
            expect(mockCache.cacheConfig).toHaveBeenCalled();
            expect(result.enabled).toBe(true);
            expect(result.minXp).toBe(15);
            expect(result.maxXp).toBe(25);
        });

        it('should return default config if not found', async () => {
            mockCache.getCachedConfig.mockResolvedValue(null);
            mockPrisma.experienceConfig.findFirst.mockResolvedValue(null);

            const result = await service.getConfig('guild-123');

            expect(result.enabled).toBe(true);
            expect(result.minXp).toBe(15);
            expect(result.maxXp).toBe(25);
            expect(result.cooldownSeconds).toBe(60);
        });

        it('should cache fetched config', async () => {
            mockCache.getCachedConfig.mockResolvedValue(null);
            mockPrisma.experienceConfig.findFirst.mockResolvedValue({
                id: 1,
                guildId: 1,
                type: ExperienceType.TEXT,
                enabled: false,
                minXp: 20,
                maxXp: 30,
                cooldownSeconds: 45,
                announceChannel: null,
                announceMessage: null,
                ignoredChannels: [],
                ignoredRoles: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any);

            await service.getConfig('guild-123');

            expect(mockCache.cacheConfig).toHaveBeenCalledWith(
                'guild-123',
                expect.any(String)
            );
        });
    });

    describe('isEnabled', () => {
        it('should return true when config is enabled', async () => {
            mockCache.getCachedConfig.mockResolvedValue(
                JSON.stringify({ enabled: true, minXp: 15, maxXp: 25, cooldownSeconds: 60 })
            );

            const result = await service.isEnabled('guild-123');
            expect(result).toBe(true);
        });

        it('should return false when config is disabled', async () => {
            mockCache.getCachedConfig.mockResolvedValue(
                JSON.stringify({ enabled: false, minXp: 15, maxXp: 25, cooldownSeconds: 60 })
            );

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

    describe('getDefaultConfig', () => {
        it('should return default configuration', () => {
            const defaults = service.getDefaultConfig();

            expect(defaults.enabled).toBe(true);
            expect(defaults.minXp).toBe(15);
            expect(defaults.maxXp).toBe(25);
            expect(defaults.cooldownSeconds).toBe(60);
            expect(defaults.announceChannel).toBeNull();
            expect(defaults.announceMessage).toBeNull();
        });
    });
});
