/**
 * @fileoverview Tests for User Permissions Precondition
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { UserPermissionsPrecondition } from '../../src/preconditions/builtin/UserPermissionsPrecondition';
import { PreconditionContext } from '../../src/preconditions/Precondition';
import { PermissionFlagsBits, Collection, PermissionsBitField } from 'discord.js';

const createMockContext = (overrides: Partial<PreconditionContext> = {}): PreconditionContext => {
    return {
        interaction: {
            user: { id: 'user123', tag: 'TestUser#0001' },
            member: {
                permissions: new PermissionsBitField([PermissionFlagsBits.SendMessages]),
            },
            guild: { id: 'guild123' },
            commandName: 'test',
        } as any,
        client: {
            config: { owners: ['owner123'] },
            commands: new Collection(),
        } as any,
        commandName: 'test',
        ...overrides,
    };
};

describe('UserPermissionsPrecondition', () => {
    let precondition: UserPermissionsPrecondition;

    beforeEach(() => {
        precondition = new UserPermissionsPrecondition();
    });

    it('should have correct name and position', () => {
        expect(precondition.name).toBe('UserPermissions');
        expect(precondition.position).toBe(15);
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

    it('should allow command if user has required permissions', async () => {
        const context = createMockContext();
        // Create new context with different permissions
        const contextWithPerms = {
            ...context,
            interaction: {
                ...context.interaction,
                member: {
                    permissions: new PermissionsBitField([
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ManageMessages,
                    ]),
                },
            },
        } as PreconditionContext;

        contextWithPerms.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            userPermissions: [PermissionFlagsBits.SendMessages],
        });

        const result = await precondition.check(contextWithPerms);
        expect(result.success).toBe(true);
    });

    it('should block command if user lacks permissions', async () => {
        const context = createMockContext();
        // User only has SendMessages, but command requires Administrator
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            userPermissions: [PermissionFlagsBits.Administrator],
        });

        const result = await precondition.check(context);
        expect(result.success).toBe(false);
        expect(result.message).toContain('permission');
        expect(result.message).toContain('Administrator');
    });

    it('should allow owners to bypass permission checks', async () => {
        const contextWithOwner = {
            interaction: {
                user: { id: 'owner123', tag: 'Owner#0001' },
                member: {
                    permissions: new PermissionsBitField([]),
                },
                guild: { id: 'guild123' },
                commandName: 'test',
            } as any,
            client: {
                config: { owners: ['owner123'] },
                commands: new Collection(),
            } as any,
            commandName: 'test',
        } as PreconditionContext;

        contextWithOwner.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            userPermissions: [PermissionFlagsBits.Administrator],
        });

        const result = await precondition.check(contextWithOwner);
        expect(result.success).toBe(true);
    });

    it('should block command in DMs if permissions required', async () => {
        const dmContext = {
            interaction: {
                user: { id: 'user123', tag: 'TestUser#0001' },
                member: null,
                guild: null,
                commandName: 'test',
            } as any,
            client: {
                config: { owners: ['owner123'] },
                commands: new Collection(),
            } as any,
            commandName: 'test',
        } as PreconditionContext;

        dmContext.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            userPermissions: [PermissionFlagsBits.SendMessages],
        });

        const result = await precondition.check(dmContext);
        expect(result.success).toBe(false);
        expect(result.message).toContain('server');
    });

    it('should handle multiple missing permissions', async () => {
        const contextNoPerms = {
            interaction: {
                user: { id: 'user123', tag: 'TestUser#0001' },
                member: {
                    permissions: new PermissionsBitField([]),
                },
                guild: { id: 'guild123' },
                commandName: 'test',
            } as any,
            client: {
                config: { owners: ['owner123'] },
                commands: new Collection(),
            } as any,
            commandName: 'test',
        } as PreconditionContext;

        contextNoPerms.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            userPermissions: [
                PermissionFlagsBits.Administrator,
                PermissionFlagsBits.ManageGuild,
            ],
        });

        const result = await precondition.check(contextNoPerms);
        expect(result.success).toBe(false);
        expect(result.message).toContain('Administrator');
        expect(result.message).toContain('Manage Guild');
    });
});
