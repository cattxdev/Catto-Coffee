/**
 * @fileoverview Tests for Experience Reward Service
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { ExperienceRewardService } from '../../../../src/modules/experience/services/ExperienceRewardService';

describe('ExperienceRewardService', () => {
    let service: ExperienceRewardService;
    let mockPrisma: jest.Mocked<PrismaClient>;

    beforeEach(() => {
        mockPrisma = {
            levelReward: {
                findMany: jest.fn(),
                findFirst: jest.fn(),
            },
            auditLog: {
                create: jest.fn(),
            },
        } as any;

        service = new ExperienceRewardService(mockPrisma);
    });

    describe('handleLevelUp', () => {
        it('should return role IDs for level rewards', async () => {
            const mockRewards = [
                {
                    id: '1',
                    guildId: 'guild-123',
                    type: 'TEXT' as any,
                    level: 5,
                    roleId: 'role-123',
                    removeOther: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: '2',
                    guildId: 'guild-123',
                    type: 'TEXT' as any,
                    level: 10,
                    roleId: 'role-456',
                    removeOther: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            mockPrisma.levelReward.findMany.mockResolvedValue(mockRewards as any);

            const result = await service.handleLevelUp('user-123', 'guild-123', 3, 12);

            expect(mockPrisma.levelReward.findMany).toHaveBeenCalledWith({
                where: {
                    guildId: 'guild-123',
                    level: {
                        gt: 3,
                        lte: 12,
                    },
                },
                orderBy: {
                    level: 'asc',
                },
            });
            expect(result).toBeInstanceOf(Array);
        });

        it('should return empty role IDs if no rewards', async () => {
            mockPrisma.levelReward.findMany.mockResolvedValue([]);

            const result = await service.handleLevelUp('user-123', 'guild-123', 5, 10);

            expect(result).toEqual([]);
        });
    });

    describe('logRoleReward', () => {
        it('should create audit log entry', async () => {
            const mockRewards = [
                {
                    id: '1',
                    guildId: 'guild-123',
                    type: 'TEXT' as any,
                    level: 5,
                    roleId: 'role-123',
                    removeOther: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            mockPrisma.levelReward.findMany.mockResolvedValue(mockRewards as any);
            mockPrisma.auditLog.create.mockResolvedValue({} as any);

            await service.handleLevelUp('user-123', 'guild-123', 3, 12);

            expect(mockPrisma.auditLog.create).toHaveBeenCalled();
        });
    });

    describe('getGuildRewards', () => {
        it('should return all guild rewards ordered by level', async () => {
            const mockRewards = [
                {
                    id: '1',
                    guildId: 'guild-123',
                    type: 'TEXT' as any,
                    level: 5,
                    roleId: 'role-123',
                    removeOther: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: '2',
                    guildId: 'guild-123',
                    type: 'TEXT' as any,
                    level: 10,
                    roleId: 'role-456',
                    removeOther: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            mockPrisma.levelReward.findMany.mockResolvedValue(mockRewards as any);

            const result = await service.getGuildRewards('guild-123');

            expect(mockPrisma.levelReward.findMany).toHaveBeenCalledWith({
                where: { guildId: 'guild-123' },
                orderBy: { level: 'asc' },
            });
            expect(result).toEqual(mockRewards);
        });
    });

    describe('getRewardForLevel', () => {
        it('should return reward for specific level', async () => {
            const mockReward = {
                id: '1',
                guildId: 'guild-123',
                type: 'TEXT' as any,
                level: 10,
                roleId: 'role-456',
                removeOther: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrisma.levelReward.findFirst.mockResolvedValue(mockReward as any);

            const result = await service.getRewardForLevel('guild-123', 10);

            expect(mockPrisma.levelReward.findFirst).toHaveBeenCalledWith({
                where: {
                    guildId: 'guild-123',
                    level: 10,
                },
            });
            expect(result).toEqual(mockReward);
        });

        it('should return null if no reward found', async () => {
            mockPrisma.levelReward.findFirst.mockResolvedValue(null);

            const result = await service.getRewardForLevel('guild-123', 10);

            expect(result).toBeNull();
        });
    });
});
