/**
 * @fileoverview Tests for Bot Permissions Precondition
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BotPermissionsPrecondition } from '../../src/preconditions/builtin/BotPermissionsPrecondition';
import { PreconditionContext } from '../../src/preconditions/Precondition';
import { PermissionFlagsBits, Collection, PermissionsBitField } from 'discord.js';

const createMockContext = (overrides: Partial<PreconditionContext> = {}): PreconditionContext => {
    return {
        interaction: {
            user: { id: 'user123', tag: 'TestUser#0001' },
            guild: {
                id: 'guild123',
                members: {
                    fetchMe: (() => Promise.resolve({
                        permissions: new PermissionsBitField([
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ViewChannel,
                        ]),
                    })) as any,
                },
            },
            commandName: 'test',
        } as any,
        client: {
            config: { owners: [] },
            commands: new Collection(),
        } as any,
        commandName: 'test',
        ...overrides,
    };
};

describe('BotPermissionsPrecondition', () => {
    let precondition: BotPermissionsPrecondition;

    beforeEach(() => {
        precondition = new BotPermissionsPrecondition();
    });

    it('should have correct name and position', () => {
        expect(precondition.name).toBe('BotPermissions');
        expect(precondition.position).toBe(16);
    });

    it('should allow command if no permissions required', async () => {
        const context = createMockContext();
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
        });

        const result = await precondition.check(context);
        expect(result.success).toBe(true);
    });

    it('should allow command if bot has required permissions', async () => {
        const context = createMockContext();
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            botPermissions: [PermissionFlagsBits.SendMessages],
        });

        const result = await precondition.check(context);
        expect(result.success).toBe(true);
    });

    it('should block command if bot lacks permissions', async () => {
        const contextLimitedPerms = {
            interaction: {
                user: { id: 'user123', tag: 'TestUser#0001' },
                guild: {
                    id: 'guild123',
                    members: {
                        fetchMe: (() => Promise.resolve({
                            permissions: new PermissionsBitField([PermissionFlagsBits.SendMessages]),
                        })) as any,
                    },
                },
                commandName: 'test',
            } as any,
            client: {
                config: { owners: [] },
                commands: new Collection(),
            } as any,
            commandName: 'test',
        } as PreconditionContext;

        contextLimitedPerms.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            botPermissions: [PermissionFlagsBits.Administrator],
        });

        const result = await precondition.check(contextLimitedPerms);
        expect(result.success).toBe(false);
        expect(result.message).toContain('I need');
        expect(result.message).toContain('Administrator');
    });

    it('should block command in DMs if permissions required', async () => {
        const dmContext = {
            interaction: {
                user: { id: 'user123', tag: 'TestUser#0001' },
                guild: null,
                commandName: 'test',
            } as any,
            client: {
                config: { owners: [] },
                commands: new Collection(),
            } as any,
            commandName: 'test',
        } as PreconditionContext;

        dmContext.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            botPermissions: [PermissionFlagsBits.SendMessages],
        });

        const result = await precondition.check(dmContext);
        expect(result.success).toBe(false);
        expect(result.message).toContain('server');
    });

    it('should handle multiple missing permissions', async () => {
        const contextNoPerms = {
            interaction: {
                user: { id: 'user123', tag: 'TestUser#0001' },
                guild: {
                    id: 'guild123',
                    members: {
                        fetchMe: (() => Promise.resolve({
                            permissions: new PermissionsBitField([]),
                        })) as any,
                    },
                },
                commandName: 'test',
            } as any,
            client: {
                config: { owners: [] },
                commands: new Collection(),
            } as any,
            commandName: 'test',
        } as PreconditionContext;

        contextNoPerms.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            botPermissions: [
                PermissionFlagsBits.BanMembers,
                PermissionFlagsBits.KickMembers,
            ],
        });

        const result = await precondition.check(contextNoPerms);
        expect(result.success).toBe(false);
        expect(result.message).toContain('Ban Members');
        expect(result.message).toContain('Kick Members');
    });
});
