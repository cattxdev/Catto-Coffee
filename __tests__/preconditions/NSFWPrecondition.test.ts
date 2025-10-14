/**
 * @fileoverview Tests for NSFW Precondition
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NSFWPrecondition } from '../../src/preconditions/builtin/NSFWPrecondition';
import { PreconditionContext } from '../../src/preconditions/Precondition';
import { ChannelType, Collection } from 'discord.js';

const createMockContext = (channelType: ChannelType = ChannelType.GuildText, nsfw: boolean = false): PreconditionContext => {
    return {
        interaction: {
            user: { id: 'user123', tag: 'TestUser#0001' },
            channel: { type: channelType, nsfw },
            commandName: 'test',
        } as any,
        client: {
            config: { owners: [] },
            commands: new Collection(),
        } as any,
        commandName: 'test',
    };
};

describe('NSFWPrecondition', () => {
    let precondition: NSFWPrecondition;

    beforeEach(() => {
        precondition = new NSFWPrecondition();
    });

    it('should have correct name and position', () => {
        expect(precondition.name).toBe('NSFW');
        expect(precondition.position).toBe(9);
    });

    it('should allow command if not marked as NSFW', async () => {
        const context = createMockContext();
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            nsfw: false,
        });

        const result = await precondition.check(context);
        expect(result.success).toBe(true);
    });

    it('should allow NSFW command in NSFW channel', async () => {
        const context = createMockContext(ChannelType.GuildText, true);
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            nsfw: true,
        });

        const result = await precondition.check(context);
        expect(result.success).toBe(true);
    });

    it('should block NSFW command in non-NSFW channel', async () => {
        const context = createMockContext(ChannelType.GuildText, false);
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            nsfw: true,
        });

        const result = await precondition.check(context);
        expect(result.success).toBe(false);
        expect(result.message).toContain('NSFW');
    });

    it('should allow NSFW commands in DMs', async () => {
        const context = createMockContext(ChannelType.DM);
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            nsfw: true,
        });

        const result = await precondition.check(context);
        expect(result.success).toBe(true);
    });

    it('should allow NSFW commands in Group DMs', async () => {
        const context = createMockContext(ChannelType.GroupDM);
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            nsfw: true,
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
            nsfw: true,
        });

        const result = await precondition.check(contextNoChannel);
        expect(result.success).toBe(false);
        expect(result.message).toContain('Unable to determine channel type');
    });
});
