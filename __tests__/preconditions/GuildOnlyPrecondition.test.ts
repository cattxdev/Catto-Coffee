/**
 * @fileoverview Tests for Guild Only Precondition
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GuildOnlyPrecondition } from '../../src/preconditions/builtin/GuildOnlyPrecondition';
import { PreconditionContext } from '../../src/preconditions/Precondition';
import { Collection } from 'discord.js';

const createMockContext = (hasGuild: boolean = true): PreconditionContext => {
    return {
        interaction: {
            user: { id: 'user123', tag: 'TestUser#0001' },
            guild: hasGuild ? { id: 'guild123' } : null,
            commandName: 'test',
        } as any,
        client: {
            config: { owners: [] },
            commands: new Collection(),
        } as any,
        commandName: 'test',
    };
};

describe('GuildOnlyPrecondition', () => {
    let precondition: GuildOnlyPrecondition;

    beforeEach(() => {
        precondition = new GuildOnlyPrecondition();
    });

    it('should have correct name and position', () => {
        expect(precondition.name).toBe('GuildOnly');
        expect(precondition.position).toBe(7);
    });

    it('should allow command if not marked as guild only', async () => {
        const context = createMockContext(false);
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            guildOnly: false,
        });

        const result = await precondition.check(context);
        expect(result.success).toBe(true);
    });

    it('should allow guild-only command in guild', async () => {
        const context = createMockContext(true);
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            guildOnly: true,
        });

        const result = await precondition.check(context);
        expect(result.success).toBe(true);
    });

    it('should block guild-only command in DMs', async () => {
        const context = createMockContext(false);
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            guildOnly: true,
        });

        const result = await precondition.check(context);
        expect(result.success).toBe(false);
        expect(result.message).toContain('server');
    });
});
