/**
 * @fileoverview Tests for Guild Create Event
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Events } from 'discord.js';
import guildCreateEvent from '../../src/events/guildCreate';

const createMockClient = () => ({
    user: {
        tag: 'TestBot#0000',
        username: 'TestBot',
        id: '123456789',
        displayAvatarURL: jest.fn(() => 'https://example.com/avatar.png'),
    },
    config: {
        owners: ['123456789'],
        embeds: {
            color: {
                success: 0x00FF00,
                error: 0xFF0000,
                warning: 0xFFFF00,
                info: 0x0000FF,
            },
        },
    },
} as any);

const createMockGuild = (hasSystemChannel = true, canSendMessages = true) => ({
    name: 'Test Guild',
    id: '987654321',
    memberCount: 100,
    systemChannel: hasSystemChannel
        ? {
              send: jest.fn(() => Promise.resolve({} as any)) as any,
              permissionsFor: jest.fn(() => ({
                  has: jest.fn(() => canSendMessages),
              })),
          }
        : null,
} as any);

describe('GuildCreate Event', () => {
    let mockClient: any;

    beforeEach(() => {
        mockClient = createMockClient();
    });

    it('should have correct event properties', () => {
        expect(guildCreateEvent.name).toBe(Events.GuildCreate);
        expect(guildCreateEvent.once).toBe(undefined);
        expect(typeof guildCreateEvent.execute).toBe('function');
    });

    it('should execute when bot joins guild', async () => {
        const guild = createMockGuild();

        // Should complete without throwing
        await expect(guildCreateEvent.execute(guild, mockClient)).resolves.not.toThrow();
    });

    it('should log guild information', async () => {
        const guild = createMockGuild();

        // Should complete without throwing - actual logging tested in integration
        await expect(guildCreateEvent.execute(guild, mockClient)).resolves.not.toThrow();
    });

    it('should send welcome message to system channel', async () => {
        const guild = createMockGuild(true, true);

        await guildCreateEvent.execute(guild, mockClient);

        expect(guild.systemChannel.send).toHaveBeenCalledWith(
            expect.objectContaining({
                embeds: expect.arrayContaining([
                    expect.objectContaining({
                        data: expect.objectContaining({
                            title: expect.stringContaining('Thanks for adding me'),
                        }),
                    }),
                ]),
            })
        );
    });

    it('should not send message if no system channel', async () => {
        const guild = createMockGuild(false);

        await expect(
            guildCreateEvent.execute(guild, mockClient)
        ).resolves.not.toThrow();
    });

    it('should not send message if bot lacks permissions', async () => {
        const guild = createMockGuild(true, false);

        await guildCreateEvent.execute(guild, mockClient);

        expect(guild.systemChannel.send).not.toHaveBeenCalled();
    });

    it('should handle send message errors gracefully', async () => {
        const guild = createMockGuild(true, true);

        guild.systemChannel.send.mockRejectedValueOnce(new Error('Send failed'));

        // Should handle error without throwing
        await expect(
            guildCreateEvent.execute(guild, mockClient)
        ).resolves.not.toThrow();
    });

    it('should include bot name in welcome message', async () => {
        const guild = createMockGuild(true, true);

        await guildCreateEvent.execute(guild, mockClient);

        const sendCall = guild.systemChannel.send.mock.calls[0][0];
        const embed = sendCall.embeds[0];
        
        expect(embed.data.description).toContain(mockClient.user.username);
    });

    it('should include help command in welcome message', async () => {
        const guild = createMockGuild(true, true);

        await guildCreateEvent.execute(guild, mockClient);

        const sendCall = guild.systemChannel.send.mock.calls[0][0];
        const embed = sendCall.embeds[0];
        
        expect(embed.data.description).toContain('/help');
    });

    it('should use success color from config', async () => {
        const guild = createMockGuild(true, true);

        await guildCreateEvent.execute(guild, mockClient);

        const sendCall = guild.systemChannel.send.mock.calls[0][0];
        const embed = sendCall.embeds[0];
        
        expect(embed.data.color).toBe(mockClient.config.embeds.color.success);
    });

    it('should include bot avatar in embed', async () => {
        const guild = createMockGuild(true, true);

        await guildCreateEvent.execute(guild, mockClient);

        const sendCall = guild.systemChannel.send.mock.calls[0][0];
        const embed = sendCall.embeds[0];
        
        expect(embed.data.thumbnail.url).toBe('https://example.com/avatar.png');
    });

    it('should include timestamp in embed', async () => {
        const guild = createMockGuild(true, true);

        await guildCreateEvent.execute(guild, mockClient);

        const sendCall = guild.systemChannel.send.mock.calls[0][0];
        const embed = sendCall.embeds[0];
        
        expect(embed.data.timestamp).toBeDefined();
    });

    it('should not be a once event', () => {
        // GuildCreate can fire multiple times
        expect(guildCreateEvent.once).toBeFalsy();
    });
});
