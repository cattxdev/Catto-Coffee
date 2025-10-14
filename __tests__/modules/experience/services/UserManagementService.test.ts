/**
 * @fileoverview Tests for User Management Service
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { UserManagementService } from '../../../../src/modules/experience/services/UserManagementService';
import { PrismaClient } from '@prisma/client';

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

    describe('ensureUserAndGuild', () => {
        it('should create user, guild, and member', async () => {
            const mockUser = {
                id: '1',
                discordId: 'user-123',
                globalExperience: 0,
                globalLevel: 1,
                totalMessagesCount: 0,
                totalVoiceTimeSeconds: 0,
                bio: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastSeenAt: null,
            };

            const mockGuild = {
                id: '2',
                discordId: 'guild-456',
                name: 'Test Guild',
                prefix: null,
                locale: 'en',
                timezone: 'UTC',
                isPremium: false,
                premiumExpiresAt: null,
                memberCount: 0,
                joinedAt: new Date(),
                leftAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockMember = {
                id: '3',
                userId: '1',
                guildId: '2',
                userDiscordId: 'user-123',
                textXp: 0,
                textLevel: 1,
                textTotalXp: 0,
                textMessageCount: 0,
                voiceXp: 0,
                voiceLevel: 1,
                voiceTotalXp: 0,
                voiceTimeSeconds: 0,
                dailyTextMessages: 0,
                weeklyTextMessages: 0,
                monthlyTextMessages: 0,
                dailyVoiceSeconds: 0,
                weeklyVoiceSeconds: 0,
                monthlyVoiceSeconds: 0,
                lastMessageAt: null,
                lastVoiceAt: null,
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
        it('should increment global experience and message count', async () => {
            await service.updateGlobalStats('1', 50);

            expect(mockPrisma.user.update).toHaveBeenCalledWith({
                where: { id: '1' },
                data: {
                    globalExperience: { increment: 50 },
                    totalMessagesCount: { increment: 1 },
                    lastSeenAt: expect.any(Date),
                },
            });
        });
    });

    describe('updateMemberExperience', () => {
        it('should update member XP, level, and message counts', async () => {
            const mockUpdatedMember = {
                id: '3',
                userId: '1',
                guildId: '2',
                userDiscordId: 'user-123',
                textXp: 50,
                textTotalXp: 150,
                textLevel: 2,
                textMessageCount: 1,
                dailyTextMessages: 1,
                weeklyTextMessages: 1,
                monthlyTextMessages: 1,
                voiceXp: 0,
                voiceLevel: 1,
                voiceTotalXp: 0,
                voiceTimeSeconds: 0,
                dailyVoiceSeconds: 0,
                weeklyVoiceSeconds: 0,
                monthlyVoiceSeconds: 0,
                lastMessageAt: new Date(),
                lastVoiceAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrisma.guildMember.update.mockResolvedValue(mockUpdatedMember as any);

            const result = await service.updateMemberExperience('2', 'user-123', 50, 150, 2);

            expect(mockPrisma.guildMember.update).toHaveBeenCalledWith({
                where: {
                    guildId_userDiscordId: {
                        guildId: '2',
                        userDiscordId: 'user-123',
                    },
                },
                data: {
                    textXp: 50,
                    textTotalXp: 150,
                    textLevel: 2,
                    textMessageCount: { increment: 1 },
                    dailyTextMessages: { increment: 1 },
                    weeklyTextMessages: { increment: 1 },
                    monthlyTextMessages: { increment: 1 },
                },
            });
            expect(result).toEqual(mockUpdatedMember);
        });
    });
});
