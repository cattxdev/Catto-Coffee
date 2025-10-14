/**
 * @fileoverview Tests for Cooldown Precondition
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CooldownPrecondition } from '../../src/preconditions/builtin/CooldownPrecondition';
import { PreconditionContext } from '../../src/preconditions/Precondition';
import { Collection } from 'discord.js';

// Mock types
const createMockContext = (overrides: Partial<PreconditionContext> = {}): PreconditionContext => {
    return {
        interaction: {
            user: {
                id: 'user123',
                tag: 'TestUser#0001',
            },
            commandName: 'test',
        } as any,
        client: {
            config: {
                owners: ['owner123'],
            },
            commands: new Collection(),
        } as any,
        commandName: 'test',
        ...overrides,
    };
};

describe('CooldownPrecondition', () => {
    let precondition: CooldownPrecondition;

    beforeEach(() => {
        precondition = new CooldownPrecondition();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should have correct name and position', () => {
        expect(precondition.name).toBe('Cooldown');
        expect(precondition.position).toBe(5);
    });

    it('should allow command if no cooldown is set', async () => {
        const context = createMockContext();
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
        });

        const result = await precondition.check(context);
        expect(result.success).toBe(true);
    });

    it('should allow command on first use', async () => {
        const context = createMockContext();
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            cooldown: 5000,
        });

        const result = await precondition.check(context);
        expect(result.success).toBe(true);
    });

    it('should block command if cooldown is active', async () => {
        const context = createMockContext();
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            cooldown: 5000,
        });

        // First execution
        await precondition.check(context);

        // Second execution (should be blocked)
        const result = await precondition.check(context);
        expect(result.success).toBe(false);
        expect(result.message).toContain('Please wait');
        expect(result.message).toContain('second(s)');
    });

    it('should allow command after cooldown expires', async () => {
        const context = createMockContext();
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            cooldown: 5000,
        });

        // First execution
        await precondition.check(context);

        // Advance time past cooldown
        jest.advanceTimersByTime(6000);

        // Should be allowed now
        const result = await precondition.check(context);
        expect(result.success).toBe(true);
    });

    it('should allow owners to bypass cooldown', async () => {
        const context = createMockContext();
        context.interaction.user.id = 'owner123';
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            cooldown: 5000,
        });

        // First execution
        const result1 = await precondition.check(context);
        expect(result1.success).toBe(true);

        // Immediate second execution (should still be allowed for owner)
        const result2 = await precondition.check(context);
        expect(result2.success).toBe(true);
    });

    it('should track cooldowns per user', async () => {
        const context1 = createMockContext();
        const context2 = createMockContext({ 
            interaction: { 
                user: { id: 'user456', tag: 'OtherUser#0002' },
                commandName: 'test',
            } as any 
        });

        context1.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            cooldown: 5000,
        });
        context2.client = context1.client;

        // User 1 uses command
        await precondition.check(context1);

        // User 2 should be able to use it
        const result = await precondition.check(context2);
        expect(result.success).toBe(true);
    });

    it('should clear cooldown manually', async () => {
        const context = createMockContext();
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            cooldown: 5000,
        });

        // Use command
        await precondition.check(context);

        // Clear cooldown
        const cleared = precondition.clearCooldown('test', 'user123');
        expect(cleared).toBe(true);

        // Should be able to use again
        const result = await precondition.check(context);
        expect(result.success).toBe(true);
    });

    it('should get remaining cooldown time', async () => {
        const context = createMockContext();
        context.client.commands.set('test', {
            data: { name: 'test' } as any,
            execute: jest.fn() as any,
            cooldown: 5000,
        });

        // Use command
        await precondition.check(context);

        // Check remaining time
        const remaining = precondition.getRemainingCooldown('test', 'user123');
        expect(remaining).toBeGreaterThan(0);
        expect(remaining).toBeLessThanOrEqual(5000);
    });

    it('should return 0 for remaining time if no cooldown', () => {
        const remaining = precondition.getRemainingCooldown('nonexistent', 'user123');
        expect(remaining).toBe(0);
    });
});
