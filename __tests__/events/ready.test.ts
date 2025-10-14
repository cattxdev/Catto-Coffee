/**
 * @fileoverview Tests for Ready Event
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Events, ActivityType } from 'discord.js';
import readyEvent from '../../src/events/ready';

const createMockClient = () => ({
    user: {
        tag: 'TestBot#0000',
        username: 'TestBot',
        id: '123456789',
        setPresence: jest.fn(),
        displayAvatarURL: jest.fn(() => 'https://example.com/avatar.png'),
    },
    guilds: {
        cache: {
            size: 5,
        },
    },
    users: {
        cache: {
            size: 100,
        },
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

describe('Ready Event', () => {
    let mockClient: any;

    beforeEach(() => {
        mockClient = createMockClient();
    });

    it('should have correct event properties', () => {
        expect(readyEvent.name).toBe(Events.ClientReady);
        expect(readyEvent.once).toBe(true);
        expect(typeof readyEvent.execute).toBe('function');
    });

    it('should execute on ready', async () => {
        // Should complete without throwing
        await expect(readyEvent.execute(mockClient)).resolves.not.toThrow();
        expect(mockClient.user.setPresence).toHaveBeenCalled();
    });

    it('should set bot presence', async () => {
        await readyEvent.execute(mockClient);

        expect(mockClient.user.setPresence).toHaveBeenCalledWith({
            activities: [{
                name: 'with Discord.js v14',
                type: ActivityType.Playing,
            }],
            status: 'online',
        });
    });

    it('should handle missing user gracefully', async () => {
        const clientWithoutUser = {
            ...mockClient,
            user: null,
        };

        // Should not throw
        await expect(readyEvent.execute(clientWithoutUser)).resolves.not.toThrow();
    });

    it('should log guild and user count', async () => {
        // Should complete without throwing - actual logging is tested in integration
        await expect(readyEvent.execute(mockClient)).resolves.not.toThrow();
    });

    it('should be a once event', () => {
        // Ready event should only fire once
        expect(readyEvent.once).toBe(true);
    });

    it('should handle client with no guilds', async () => {
        const clientNoGuilds = {
            ...mockClient,
            guilds: {
                cache: {
                    size: 0,
                },
            },
        };

        await expect(readyEvent.execute(clientNoGuilds)).resolves.not.toThrow();
    });

    it('should handle client with no users', async () => {
        const clientNoUsers = {
            ...mockClient,
            users: {
                cache: {
                    size: 0,
                },
            },
        };

        await expect(readyEvent.execute(clientNoUsers)).resolves.not.toThrow();
    });
});
