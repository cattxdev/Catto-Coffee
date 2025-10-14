/**
 * @fileoverview Tests for Precondition Manager
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PreconditionManager } from '../../src/preconditions/PreconditionManager';
import { Precondition, PreconditionContext, PreconditionResult } from '../../src/preconditions/Precondition';
import { Collection } from 'discord.js';

// Mock BotClient
const createMockClient = () => ({
    config: {
        owners: ['owner123'],
        token: 'test-token',
        clientId: 'client123',
    },
    commands: new Collection(),
}) as any;

const createMockContext = (): PreconditionContext => ({
    interaction: {
        user: { id: 'user123', tag: 'TestUser#0001' },
        commandName: 'test',
    } as any,
    client: createMockClient(),
    commandName: 'test',
});

describe('PreconditionManager', () => {
    let manager: PreconditionManager;
    let client: any;

    beforeEach(() => {
        client = createMockClient();
        manager = new PreconditionManager(client);
    });

    it('should load all built-in preconditions', () => {
        const preconditions = manager.getAllPreconditions();
        expect(preconditions.size).toBe(7);
        
        expect(preconditions.has('OwnerOnly')).toBe(true);
        expect(preconditions.has('Cooldown')).toBe(true);
        expect(preconditions.has('GuildOnly')).toBe(true);
        expect(preconditions.has('ChannelType')).toBe(true);
        expect(preconditions.has('NSFW')).toBe(true);
        expect(preconditions.has('UserPermissions')).toBe(true);
        expect(preconditions.has('BotPermissions')).toBe(true);
    });

    it('should register custom precondition', () => {
        class CustomPrecondition extends Precondition {
            constructor() {
                super('Custom', 50);
            }
            async check(_context: PreconditionContext) {
                return this.success();
            }
        }

        const custom = new CustomPrecondition();
        manager.registerPrecondition(custom);

        const preconditions = manager.getAllPreconditions();
        expect(preconditions.size).toBe(8);
        expect(preconditions.has('Custom')).toBe(true);
    });

    it('should get specific precondition', () => {
        const cooldown = manager.getPrecondition('Cooldown');
        expect(cooldown).toBeDefined();
        expect(cooldown?.name).toBe('Cooldown');
    });

    it('should return undefined for non-existent precondition', () => {
        const result = manager.getPrecondition('NonExistent');
        expect(result).toBeUndefined();
    });

    it('should remove precondition', () => {
        const removed = manager.removePrecondition('Cooldown');
        expect(removed).toBe(true);

        const preconditions = manager.getAllPreconditions();
        expect(preconditions.has('Cooldown')).toBe(false);
        expect(preconditions.size).toBe(6);
    });

    it('should return false when removing non-existent precondition', () => {
        const removed = manager.removePrecondition('NonExistent');
        expect(removed).toBe(false);
    });

    it('should run preconditions in order', async () => {
        const executionOrder: number[] = [];

        class TestPrecondition1 extends Precondition {
            constructor() {
                super('Test1', 10);
            }
            async check(_context: PreconditionContext) {
                executionOrder.push(10);
                return this.success();
            }
        }

        class TestPrecondition2 extends Precondition {
            constructor() {
                super('Test2', 5);
            }
            async check(_context: PreconditionContext) {
                executionOrder.push(5);
                return this.success();
            }
        }

        class TestPrecondition3 extends Precondition {
            constructor() {
                super('Test3', 15);
            }
            async check(_context: PreconditionContext) {
                executionOrder.push(15);
                return this.success();
            }
        }

        // Clear existing preconditions
        manager.getAllPreconditions().clear();

        manager.registerPrecondition(new TestPrecondition1());
        manager.registerPrecondition(new TestPrecondition2());
        manager.registerPrecondition(new TestPrecondition3());

        const context = createMockContext();
        await manager.runPreconditions(context);

        expect(executionOrder).toEqual([5, 10, 15]);
    });

    it('should stop on first failed precondition', async () => {
        const executionOrder: string[] = [];

        class PassPrecondition extends Precondition {
            constructor() {
                super('Pass', 5);
            }
            async check(_context: PreconditionContext) {
                executionOrder.push('Pass');
                return this.success();
            }
        }

        class FailPrecondition extends Precondition {
            constructor() {
                super('Fail', 10);
            }
            async check(_context: PreconditionContext) {
                executionOrder.push('Fail');
                return this.error('Failed!');
            }
        }

        class NeverRunPrecondition extends Precondition {
            constructor() {
                super('NeverRun', 15);
            }
            async check(_context: PreconditionContext) {
                executionOrder.push('NeverRun');
                return this.success();
            }
        }

        // Clear existing preconditions
        manager.getAllPreconditions().clear();

        manager.registerPrecondition(new PassPrecondition());
        manager.registerPrecondition(new FailPrecondition());
        manager.registerPrecondition(new NeverRunPrecondition());

        const context = createMockContext();
        const result = await manager.runPreconditions(context);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Failed!');
        expect(executionOrder).toEqual(['Pass', 'Fail']);
        expect(executionOrder).not.toContain('NeverRun');
    });

    it('should handle precondition errors gracefully', async () => {
        class ErrorPrecondition extends Precondition {
            constructor() {
                super('Error', 5);
            }
            async check(_context: PreconditionContext): Promise<PreconditionResult> {
                throw new Error('Something went wrong!');
            }
        }

        // Clear existing preconditions
        manager.getAllPreconditions().clear();
        manager.registerPrecondition(new ErrorPrecondition());

        const context = createMockContext();
        const result = await manager.runPreconditions(context);

        expect(result.success).toBe(false);
        expect(result.message).toContain('error occurred');
    });

    it('should get cooldown precondition specifically', () => {
        const cooldown = manager.getCooldownPrecondition();
        expect(cooldown).toBeDefined();
        expect(cooldown?.name).toBe('Cooldown');
    });

    it('should return undefined if cooldown precondition removed', () => {
        manager.removePrecondition('Cooldown');
        const cooldown = manager.getCooldownPrecondition();
        expect(cooldown).toBeUndefined();
    });

    it('should overwrite existing precondition with same name', () => {
        class CustomCooldown extends Precondition {
            constructor() {
                super('Cooldown', 99);
            }
            async check(_context: PreconditionContext) {
                return this.error('Custom cooldown');
            }
        }

        manager.registerPrecondition(new CustomCooldown());
        const cooldown = manager.getPrecondition('Cooldown');
        
        expect(cooldown?.position).toBe(99);
    });
});
