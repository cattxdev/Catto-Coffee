/**
 * @fileoverview Tests for Experience Multiplier Service
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ExperienceMultiplierService } from '#/modules/experience/services/ExperienceMultiplierService';
import type { PrismaClient } from '#/generated/prisma';
import { ExperienceCacheService } from '#/modules/experience/ExperienceCacheService';
import { MultiplierTargetType } from '#/generated/prisma';

describe('ExperienceMultiplierService', () => {
    let service: ExperienceMultiplierService;
    let mockPrisma: jest.Mocked<PrismaClient>;
    let mockCache: jest.Mocked<ExperienceCacheService>;

    beforeEach(() => {
        mockPrisma = {
            experienceMultiplier: {
                findMany: jest.fn(),
            },
        } as any;

        mockCache = {
            getCachedMultipliers: jest.fn(),
            cacheMultipliers: jest.fn(),
            invalidateMultipliers: jest.fn(),
        } as any;

        service = new ExperienceMultiplierService(mockPrisma, mockCache);
    });

    describe('getActiveMultipliers', () => {
        it('should return cached multipliers if available', async () => {
            const cachedMultipliers = JSON.stringify([
                {
                    id: 1,
                    guildId: 1,
                    name: 'Boost',
                    multiplierBps: 15000,
                    targetType: MultiplierTargetType.GUILD,
                    targetId: null,
                    expiresAt: null,
                },
            ]);

            mockCache.getCachedMultipliers.mockResolvedValue(cachedMultipliers);

            const result = await service.getActiveMultipliers('guild-123');

            expect(mockCache.getCachedMultipliers).toHaveBeenCalledWith('guild-123');
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Boost');
            expect(mockPrisma.experienceMultiplier.findMany).not.toHaveBeenCalled();
        });

        it('should fetch from database if not cached', async () => {
            mockCache.getCachedMultipliers.mockResolvedValue(null);
            mockPrisma.experienceMultiplier.findMany.mockResolvedValue([
                {
                    id: 1,
                    guildId: 1,
                    name: 'Event Boost',
                    multiplierBps: 20000,
                    targetType: MultiplierTargetType.GUILD,
                    targetId: null,
                    expiresAt: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ] as any);

            const result = await service.getActiveMultipliers('guild-123');

            expect(mockPrisma.experienceMultiplier.findMany).toHaveBeenCalled();
            expect(mockCache.cacheMultipliers).toHaveBeenCalled();
            expect(result).toHaveLength(1);
            expect(result[0].multiplierBps).toBe(20000);
        });

        it('should filter out expired multipliers from database', async () => {
            mockCache.getCachedMultipliers.mockResolvedValue(null);
            
            const now = new Date();
            const past = new Date(now.getTime() - 86400000); // 1 day ago
            const future = new Date(now.getTime() + 86400000); // 1 day from now

            mockPrisma.experienceMultiplier.findMany.mockResolvedValue([
                {
                    id: 1,
                    guildId: 1,
                    name: 'Active',
                    multiplierBps: 15000,
                    targetType: MultiplierTargetType.GUILD,
                    targetId: null,
                    expiresAt: future,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: 2,
                    guildId: 1,
                    name: 'Expired',
                    multiplierBps: 15000,
                    targetType: MultiplierTargetType.GUILD,
                    targetId: null,
                    expiresAt: past,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ] as any);

            const result = await service.getActiveMultipliers('guild-123');

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Active');
        });
    });

    describe('getTargetMultipliers', () => {
        it('should filter multipliers by target type', async () => {
            mockCache.getCachedMultipliers.mockResolvedValue(
                JSON.stringify([
                    {
                        id: 1,
                        multiplierBps: 15000,
                        targetType: MultiplierTargetType.USER,
                        targetId: 'user-123',
                    },
                    {
                        id: 2,
                        multiplierBps: 12000,
                        targetType: MultiplierTargetType.ROLE,
                        targetId: 'role-456',
                    },
                ])
            );

            const result = await service.getTargetMultipliers(
                'guild-123',
                MultiplierTargetType.USER,
                'user-123'
            );

            expect(result).toHaveLength(1);
            expect(result[0].targetType).toBe(MultiplierTargetType.USER);
        });

        it('should return empty array if no matching multipliers', async () => {
            mockCache.getCachedMultipliers.mockResolvedValue(
                JSON.stringify([
                    {
                        id: 1,
                        multiplierBps: 15000,
                        targetType: MultiplierTargetType.USER,
                        targetId: 'user-999',
                    },
                ])
            );

            const result = await service.getTargetMultipliers(
                'guild-123',
                MultiplierTargetType.USER,
                'user-123'
            );

            expect(result).toHaveLength(0);
        });
    });

    describe('invalidateCache', () => {
        it('should call cache invalidation', async () => {
            await service.invalidateCache('guild-123');
            expect(mockCache.invalidateMultipliers).toHaveBeenCalledWith('guild-123');
        });
    });
});
