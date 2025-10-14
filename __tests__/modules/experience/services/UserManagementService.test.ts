/**
 * @fileoverview Tests for User Management Service
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { UserManagementService } from '#/modules/experience/services/UserManagementService';
import type { PrismaClient } from '#/generated/prisma';

describe('UserManagementService', () => {
    let service: UserManagementService;
    let mockPrisma: jest.Mocked<PrismaClient>;

    beforeEach(() => {
        mockPrisma = {
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
        } as any;

        service = new UserManagementService(mockPrisma);
    });

    describe('upsertUser', () => {
        it('should create user if not exists', async () => {
            const mockUser = {
                id: 1,
                discordId: 'user-123',
                globalTextXp: 0,
                globalVoiceMinutes: 0,
                totalTextMessages: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrisma.user.upsert.mockResolvedValue(mockUser as any);

            const result = await service.upsertUser('user-123');

            expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
                where: { discordId: 'user-123' },
                create: { discordId: 'user-123' },
                update: {},
            });
            expect(result).toEqual(mockUser);
        });
    });

    describe('upsertGuild', () => {
        it('should create guild if not exists', async () => {
            const mockGuild = {
                id: 1,
                discordId: 'guild-456',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrisma.guild.upsert.mockResolvedValue(mockGuild as any);

            const result = await service.upsertGuild('guild-456');

            expect(mockPrisma.guild.upsert).toHaveBeenCalledWith({
                where: { discordId: 'guild-456' },
                create: { discordId: 'guild-456' },
                update: {},
            });
            expect(result).toEqual(mockGuild);
        });
    });

    describe('ensureUserAndGuild', () => {
        it('should create user, guild, and member', async () => {
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
                textTotalXp: 0,
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

            mockPrisma.user.upsert.mockResolvedValue(mockUser as any);
            mockPrisma.guild.upsert.mockResolvedValue(mockGuild as any);
            mockPrisma.guildMember.upsert.mockResolvedValue(mockMember as any);

            const result = await service.ensureUserAndGuild('user-123', 'guild-456');

            expect(result.user).toEqual(mockUser);
            expect(result.guild).toEqual(mockGuild);
            expect(result.member).toEqual(mockMember);
        });
    });

    describe('updateGlobalStats', () => {
        it('should increment global XP and message count', async () => {
            await service.updateGlobalStats(1, 50);

            expect(mockPrisma.user.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: {
                    globalTextXp: { increment: 50 },
                    totalTextMessages: { increment: 1 },
                },
            });
        });
    });

    describe('updateMemberExperience', () => {
        it('should update member XP, level, and message counts', async () => {
            const mockUpdatedMember = {
                id: 3,
                userId: 1,
                guildId: 2,
                textTotalXp: 150,
                textLevel: 2,
                textMessagesToday: 1,
                textMessagesWeek: 1,
                textMessagesMonth: 1,
                voiceTotalMinutes: 0,
                voiceLevel: 0,
                voiceMinutesToday: 0,
                voiceMinutesWeek: 0,
                voiceMinutesMonth: 0,
                joinedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrisma.guildMember.update.mockResolvedValue(mockUpdatedMember as any);

            const result = await service.updateMemberExperience(2, 'user-123', 50, 150, 2);

            expect(mockPrisma.guildMember.update).toHaveBeenCalledWith({
                where: {
                    guildId_user_discordId: {
                        guildId: 2,
                        user_discordId: 'user-123',
                    },
                },
                data: {
                    textTotalXp: 150,
                    textLevel: 2,
                    textMessagesToday: { increment: 1 },
                    textMessagesWeek: { increment: 1 },
                    textMessagesMonth: { increment: 1 },
                },
            });
            expect(result).toEqual(mockUpdatedMember);
        });
    });
});
