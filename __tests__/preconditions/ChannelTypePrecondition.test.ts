/**
 * @fileoverview Tests for Channel Type Precondition
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ChannelTypePrecondition } from '../../src/preconditions/builtin/ChannelTypePrecondition';
import { PreconditionContext } from '../../src/preconditions/Precondition';
import { ChannelType, Collection } from 'discord.js';

const createMockContext = (channelType: ChannelType = ChannelType.GuildText): PreconditionContext => {
    return {
        interaction: {
            user: { id: 'user123', tag: 'TestUser#0001' },
            channel: { type: channelType },
            commandName: 'test',
        } as any,
        client: {
            config: { owners: [] },
            commands: new Collection(),
        } as any,
        commandName: 'test',
    };
};

describe('ChannelTypePrecondition', () => {
    let precondition: ChannelTypePrecondition;

    beforeEach(() => {
        precondition = new ChannelTypePrecondition();
    });

    it('should have correct name and position', () => {
        expect(precondition.name).toBe('ChannelType');
        expect(precondition.position).toBe(8);
    });

    it('should allow command if no channel types specified', async () => {
        const context = createMockContext();
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
        });

        const result = await precondition.check(context);
        expect(result.success).toBe(true);
    });

    it('should allow command in correct channel type', async () => {
        const context = createMockContext(ChannelType.GuildText);
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            channelTypes: [ChannelType.GuildText],
        });

        const result = await precondition.check(context);
        expect(result.success).toBe(true);
    });

    it('should block command in wrong channel type', async () => {
        const context = createMockContext(ChannelType.DM);
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            channelTypes: [ChannelType.GuildText],
        });

        const result = await precondition.check(context);
        expect(result.success).toBe(false);
        expect(result.message).toContain('Text Channels');
    });

    it('should allow command in any of multiple allowed types', async () => {
        const context = createMockContext(ChannelType.GuildVoice);
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            channelTypes: [ChannelType.GuildText, ChannelType.GuildVoice],
        });

        const result = await precondition.check(context);
        expect(result.success).toBe(true);
    });

    it('should handle DM channels', async () => {
        const context = createMockContext(ChannelType.DM);
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            channelTypes: [ChannelType.DM],
        });

        const result = await precondition.check(context);
        expect(result.success).toBe(true);
    });

    it('should handle thread channels', async () => {
        const context = createMockContext(ChannelType.PublicThread);
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            channelTypes: [ChannelType.PublicThread, ChannelType.PrivateThread],
        });

        const result = await precondition.check(context);
        expect(result.success).toBe(true);
    });

    it('should error if channel cannot be determined', async () => {
        const contextNoChannel = {
            interaction: {
                user: { id: 'user123', tag: 'TestUser#0001' },
                channel: null,
                commandName: 'test',
            } as any,
            client: {
                config: { owners: [] },
                commands: new Collection(),
            } as any,
            commandName: 'test',
        } as PreconditionContext;

        contextNoChannel.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            channelTypes: [ChannelType.GuildText],
        });

        const result = await precondition.check(contextNoChannel);
        expect(result.success).toBe(false);
        expect(result.message).toContain('Unable to determine channel type');
    });
});
