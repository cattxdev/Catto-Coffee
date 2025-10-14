/**
 * @fileoverview Tests for Owner Only Precondition
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { OwnerOnlyPrecondition } from '../../src/preconditions/builtin/OwnerOnlyPrecondition';
import { PreconditionContext } from '../../src/preconditions/Precondition';
import { Collection } from 'discord.js';

const createMockContext = (userId: string = 'user123'): PreconditionContext => {
    return {
        interaction: {
            user: { id: userId, tag: 'TestUser#0001' },
            commandName: 'test',
        } as any,
        client: {
            config: { owners: ['owner123', 'owner456'] },
            commands: new Collection(),
        } as any,
        commandName: 'test',
    };
};

describe('OwnerOnlyPrecondition', () => {
    let precondition: OwnerOnlyPrecondition;

    beforeEach(() => {
        precondition = new OwnerOnlyPrecondition();
    });

    it('should have correct name and position', () => {
        expect(precondition.name).toBe('OwnerOnly');
        expect(precondition.position).toBe(1);
    });

    it('should allow command if not marked as owner only', async () => {
        const context = createMockContext();
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            ownerOnly: false,
        });

        const result = await precondition.check(context);
        expect(result.success).toBe(true);
    });

    it('should allow owner to use owner-only command', async () => {
        const context = createMockContext('owner123');
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            ownerOnly: true,
        });

        const result = await precondition.check(context);
        expect(result.success).toBe(true);
    });

    it('should block non-owner from owner-only command', async () => {
        const context = createMockContext('user123');
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            ownerOnly: true,
        });

        const result = await precondition.check(context);
        expect(result.success).toBe(false);
        expect(result.message).toContain('owner');
    });

    it('should support multiple owners', async () => {
        const context1 = createMockContext('owner123');
        const context2 = createMockContext('owner456');
        
        context1.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            ownerOnly: true,
        });
        context2.client = context1.client;

        const result1 = await precondition.check(context1);
        const result2 = await precondition.check(context2);

        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);
    });
});
