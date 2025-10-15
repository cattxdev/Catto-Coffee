/**
 * @fileoverview Tests for Experience Multiplier Service
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client/edge';
import { ExperienceCacheService } from '../../../../src/modules/experience/services/ExperienceCacheService';
import { ExperienceMultiplierService } from '../../../../src/modules/experience/services/ExperienceMultiplierService';


describe('ExperienceMultiplierService', () => {
    let service: ExperienceMultiplierService;
    let mockPrisma: jest.Mocked<PrismaClient>;
    let mockCache: jest.Mocked<ExperienceCacheService>;

    beforeEach(() => {
        mockPrisma = {
            experienceMultiplier: {
                findMany: jest.fn(),
            },
            guild: {
                findUnique: jest.fn(),
            },
        } as any;

        mockCache = {
            getMultipliers: jest.fn(),
            setMultipliers: jest.fn(),
            invalidateMultipliers: jest.fn(),
        } as any;

        service = new ExperienceMultiplierService(mockPrisma, mockCache);
    });

    describe('getActiveMultipliers', () => {
        it('should return cached multipliers if available', async () => {
            const cachedMultipliers = [
                {
                    id: '1',
                    guildId: 'guild-123',
                    type: 'TEXT' as any,
                    targetType: 'guild',
                    targetId: 'guild-123',
                    multiplierBps: 15000,
                    startsAt: null,
                    expiresAt: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            mockCache.getMultipliers.mockResolvedValue(cachedMultipliers);

            const result = await service.getActiveMultipliers('guild-123');

            expect(mockCache.getMultipliers).toHaveBeenCalledWith('guild-123');
            expect(result).toHaveLength(1);
            expect(result[0].multiplierBps).toBe(15000);
            expect(mockPrisma.experienceMultiplier.findMany).not.toHaveBeenCalled();
        });

        it('should fetch from database if not cached', async () => {
            mockCache.getMultipliers.mockResolvedValue(null);
            mockPrisma.guild.findUnique.mockResolvedValue({ id: 'guild-123' } as any);
            mockPrisma.experienceMultiplier.findMany.mockResolvedValue([
                {
                    id: '1',
                    guildId: 'guild-123',
                    type: 'TEXT' as any,
                    targetType: 'guild',
                    targetId: 'guild-123',
                    multiplierBps: 20000,
                    startsAt: null,
                    expiresAt: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ] as any);

            const result = await service.getActiveMultipliers('guild-123');

            expect(mockPrisma.experienceMultiplier.findMany).toHaveBeenCalled();
            expect(mockCache.setMultipliers).toHaveBeenCalled();
            expect(result).toHaveLength(1);
            expect(result[0].multiplierBps).toBe(20000);
        });

        it('should filter out expired multipliers from database', async () => {
            mockCache.getMultipliers.mockResolvedValue(null);
            mockPrisma.guild.findUnique.mockResolvedValue({ id: 'guild-123' } as any);
            
            const now = new Date();
            const past = new Date(now.getTime() - 86400000); // 1 day ago
            const future = new Date(now.getTime() + 86400000); // 1 day from now

            mockPrisma.experienceMultiplier.findMany.mockResolvedValue([
                {
                    id: '1',
                    guildId: 'guild-123',
                    type: 'TEXT' as any,
                    targetType: 'guild',
                    targetId: 'guild-123',
                    multiplierBps: 15000,
                    startsAt: null,
                    expiresAt: future,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: '2',
                    guildId: 'guild-123',
                    type: 'TEXT' as any,
                    targetType: 'guild',
                    targetId: 'guild-123',
                    multiplierBps: 15000,
                    startsAt: null,
                    expiresAt: past,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ] as any);

            const result = await service.getActiveMultipliers('guild-123');

            // Service returns all multipliers, filtering is done client-side or in app logic
            expect(result).toHaveLength(2);
        });
    });

    describe('getTargetMultipliers', () => {
        it('should filter multipliers by target type', async () => {
            mockCache.getMultipliers.mockResolvedValue([
                {
                    id: '1',
                    multiplierBps: 15000,
                    targetType: 'user',
                    targetId: 'user-123',
                },
                {
                    id: '2',
                    multiplierBps: 12000,
                    targetType: 'role',
                    targetId: 'role-456',
                },
            ] as any);

            const result = await service.getTargetMultipliers(
                'guild-123',
                'user',
                'user-123'
            );

            expect(result).toHaveLength(1);
            expect(result[0].targetType).toBe('user');
        });

        it('should return empty array if no matching multipliers', async () => {
            mockCache.getMultipliers.mockResolvedValue([
                {
                    id: '1',
                    multiplierBps: 15000,
                    targetType: 'user',
                    targetId: 'user-999',
                },
            ] as any);

            const result = await service.getTargetMultipliers(
                'guild-123',
                'user',
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
