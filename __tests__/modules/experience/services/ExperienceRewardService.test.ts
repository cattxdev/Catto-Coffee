/**
 * @fileoverview Tests for Experience Reward Service
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ExperienceRewardService } from '#/modules/experience/services/ExperienceRewardService';
import type { PrismaClient } from '#/generated/prisma';

describe('ExperienceRewardService', () => {
    let service: ExperienceRewardService;
    let mockPrisma: jest.Mocked<PrismaClient>;

    beforeEach(() => {
        mockPrisma = {
            experienceReward: {
                findMany: jest.fn(),
            },
            auditLog: {
                create: jest.fn(),
            },
        } as any;

        service = new ExperienceRewardService(mockPrisma);
    });

    describe('getLevelRewards', () => {
        it('should return rewards between old and new level', async () => {
            const mockRewards = [
                {
                    id: 1,
                    guildId: 1,
                    level: 5,
                    roleId: 'role-123',
                    removeOldRewards: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: 2,
                    guildId: 1,
                    level: 10,
                    roleId: 'role-456',
                    removeOldRewards: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            mockPrisma.experienceReward.findMany.mockResolvedValue(mockRewards as any);

            const result = await service.getLevelRewards(1, 3, 12);

            expect(mockPrisma.experienceReward.findMany).toHaveBeenCalledWith({
                where: {
                    guildId: 1,
                    level: {
                        gt: 3,
                        lte: 12,
                    },
                },
                orderBy: {
                    level: 'asc',
                },
            });
            expect(result).toEqual(mockRewards);
        });

        it('should return empty array if no rewards', async () => {
            mockPrisma.experienceReward.findMany.mockResolvedValue([]);

            const result = await service.getLevelRewards(1, 5, 10);

            expect(result).toEqual([]);
        });
    });

    describe('handleLevelUp', () => {
        it('should return role IDs for level rewards', async () => {
            const mockRewards = [
                {
                    id: 1,
                    guildId: 1,
                    level: 5,
                    roleId: 'role-123',
                    removeOldRewards: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: 2,
                    guildId: 1,
                    level: 10,
                    roleId: 'role-456',
                    removeOldRewards: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            mockPrisma.experienceReward.findMany.mockResolvedValue(mockRewards as any);
            mockPrisma.auditLog.create.mockResolvedValue({} as any);

            const result = await service.handleLevelUp('user-123', 1, 3, 12);

            expect(result).toEqual(['role-123', 'role-456']);
            expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(2);
        });

        it('should return empty array if no rewards', async () => {
            mockPrisma.experienceReward.findMany.mockResolvedValue([]);

            const result = await service.handleLevelUp('user-123', 1, 5, 10);

            expect(result).toEqual([]);
            expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
        });

        it('should continue on audit log error', async () => {
            const mockRewards = [
                {
                    id: 1,
                    guildId: 1,
                    level: 5,
                    roleId: 'role-123',
                    removeOldRewards: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            mockPrisma.experienceReward.findMany.mockResolvedValue(mockRewards as any);
            mockPrisma.auditLog.create.mockRejectedValue(new Error('Database error'));

            const result = await service.handleLevelUp('user-123', 1, 3, 10);

            // Should still return role even if audit log fails
            expect(result).toEqual(['role-123']);
        });
    });

    describe('getGuildRewards', () => {
        it('should return all guild rewards ordered by level', async () => {
            const mockRewards = [
                {
                    id: 1,
                    guildId: 1,
                    level: 5,
                    roleId: 'role-123',
                    removeOldRewards: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: 2,
                    guildId: 1,
                    level: 10,
                    roleId: 'role-456',
                    removeOldRewards: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            mockPrisma.experienceReward.findMany.mockResolvedValue(mockRewards as any);

            const result = await service.getGuildRewards(1);

            expect(mockPrisma.experienceReward.findMany).toHaveBeenCalledWith({
                where: { guildId: 1 },
                orderBy: { level: 'asc' },
            });
            expect(result).toEqual(mockRewards);
        });
    });

    describe('getRewardForLevel', () => {
        it('should return reward for specific level', async () => {
            const mockReward = {
                id: 1,
                guildId: 1,
                level: 10,
                roleId: 'role-456',
                removeOldRewards: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrisma.experienceReward.findMany.mockResolvedValue([mockReward] as any);

            const result = await service.getRewardForLevel(1, 10);

            expect(mockPrisma.experienceReward.findMany).toHaveBeenCalledWith({
                where: {
                    guildId: 1,
                    level: 10,
                },
                take: 1,
            });
            expect(result).toEqual(mockReward);
        });

        it('should return null if no reward found', async () => {
            mockPrisma.experienceReward.findMany.mockResolvedValue([]);

            const result = await service.getRewardForLevel(1, 10);

            expect(result).toBeNull();
        });
    });
});
