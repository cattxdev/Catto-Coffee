/**
 * @fileoverview Tests for AuditInterceptor
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { AuditInterceptor } from '../../src/interceptors/built/AuditInterceptor';
import { InterceptorContext } from '../../src/interceptors/Interceptor';

describe('AuditInterceptor', () => {
    let interceptor: AuditInterceptor;

    beforeEach(() => {
        interceptor = new AuditInterceptor(100);
    });

    describe('Constructor', () => {
        it('should create with correct name and priority', () => {
            expect(interceptor.name).toBe('Audit');
            expect(interceptor.priority).toBe(15);
        });

        it('should accept custom max entries', () => {
            const custom = new AuditInterceptor(500);
            expect(custom).toBeDefined();
        });
    });

    describe('After Hook', () => {
        it('should create audit entry for successful operation', async () => {
            const context: InterceptorContext = {
                operation: 'createUser',
                target: 'UserService',
                args: { name: 'Test' },
                result: { id: '123' },
                startTime: Date.now() - 100,
                metadata: { userId: 'user123', guildId: 'guild456' },
            };

            await interceptor.after!(context);

            const entries = interceptor.getEntries();
            expect(entries).toHaveLength(1);
            expect(entries[0].operation).toBe('createUser');
            expect(entries[0].target).toBe('UserService');
            expect(entries[0].success).toBe(true);
            expect(entries[0].userId).toBe('user123');
            expect(entries[0].guildId).toBe('guild456');
        });

        it('should record duration', async () => {
            const context: InterceptorContext = {
                operation: 'test',
                target: 'Service',
                args: {},
                startTime: Date.now() - 150,
            };

            await interceptor.after!(context);

            const entries = interceptor.getEntries();
            expect(entries[0].duration).toBeGreaterThanOrEqual(150);
        });

        it('should generate unique IDs', async () => {
            const context: InterceptorContext = {
                operation: 'test',
                target: 'Service',
                args: {},
                startTime: Date.now(),
            };

            await interceptor.after!(context);
            await interceptor.after!(context);

            const entries = interceptor.getEntries();
            expect(entries[0].id).not.toBe(entries[1].id);
        });
    });

    describe('Error Hook', () => {
        it('should create audit entry for failed operation', async () => {
            const error = new Error('Operation failed');
            const context: InterceptorContext = {
                operation: 'updateUser',
                target: 'UserService',
                args: { id: '123' },
                error,
                startTime: Date.now() - 50,
                metadata: { userId: 'user123' },
            };

            await interceptor.onError!(context);

            const entries = interceptor.getEntries();
            expect(entries).toHaveLength(1);
            expect(entries[0].success).toBe(false);
            expect(entries[0].error).toBe('Operation failed');
        });

        it('should handle unknown errors', async () => {
            const context: InterceptorContext = {
                operation: 'test',
                target: 'Service',
                args: {},
                error: undefined as any,
                startTime: Date.now(),
            };

            await interceptor.onError!(context);

            const entries = interceptor.getEntries();
            expect(entries[0].error).toBe('Unknown error');
        });
    });

    describe('GetEntries with Filters', () => {
        beforeEach(async () => {
            // Add test data
            await interceptor.after!({
                operation: 'createUser',
                target: 'UserService',
                args: {},
                startTime: Date.now(),
                metadata: { userId: 'user1', guildId: 'guild1' },
            });

            await interceptor.after!({
                operation: 'updateUser',
                target: 'UserService',
                args: {},
                startTime: Date.now(),
                metadata: { userId: 'user2', guildId: 'guild1' },
            });

            await interceptor.onError!({
                operation: 'deleteUser',
                target: 'UserService',
                args: {},
                error: new Error('Failed'),
                startTime: Date.now(),
                metadata: { userId: 'user1' },
            });
        });

        it('should filter by operation', () => {
            const entries = interceptor.getEntries({ operation: 'createUser' });
            expect(entries).toHaveLength(1);
            expect(entries[0].operation).toBe('createUser');
        });

        it('should filter by target', () => {
            const entries = interceptor.getEntries({ target: 'UserService' });
            expect(entries).toHaveLength(3);
        });

        it('should filter by userId', () => {
            const entries = interceptor.getEntries({ userId: 'user1' });
            expect(entries).toHaveLength(2);
        });

        it('should filter by guildId', () => {
            const entries = interceptor.getEntries({ guildId: 'guild1' });
            expect(entries).toHaveLength(2);
        });

        it('should filter by success status', () => {
            const successEntries = interceptor.getEntries({ success: true });
            expect(successEntries).toHaveLength(2);

            const failedEntries = interceptor.getEntries({ success: false });
            expect(failedEntries).toHaveLength(1);
        });

        it('should filter by timestamp', async () => {
            const now = new Date();
            
            // Add entry after the timestamp
            await new Promise(resolve => setTimeout(resolve, 10));
            await interceptor.after!({
                operation: 'newOperation',
                target: 'Service',
                args: {},
                startTime: Date.now(),
            });

            const entries = interceptor.getEntries({ since: now });
            expect(entries.length).toBeGreaterThan(0);
        });

        it('should support multiple filters', () => {
            const entries = interceptor.getEntries({
                target: 'UserService',
                success: true,
                userId: 'user1',
            });
            expect(entries).toHaveLength(1);
            expect(entries[0].operation).toBe('createUser');
        });
    });

    describe('GetSummary', () => {
        it('should return summary statistics', async () => {
            await interceptor.after!({
                operation: 'op1',
                target: 'Service',
                args: {},
                startTime: Date.now() - 100,
            });

            await interceptor.after!({
                operation: 'op2',
                target: 'Service',
                args: {},
                startTime: Date.now() - 50,
            });

            await interceptor.onError!({
                operation: 'op3',
                target: 'Service',
                args: {},
                error: new Error('Failed'),
                startTime: Date.now() - 75,
            });

            const summary = interceptor.getSummary();

            expect(summary.total).toBe(3);
            expect(summary.successful).toBe(2);
            expect(summary.failed).toBe(1);
            expect(summary.avgDuration).toBeGreaterThan(0);
            expect(summary.operations['Service.op1']).toBe(1);
            expect(summary.operations['Service.op2']).toBe(1);
            expect(summary.operations['Service.op3']).toBe(1);
        });

        it('should return zero stats for empty log', () => {
            const summary = interceptor.getSummary();

            expect(summary.total).toBe(0);
            expect(summary.successful).toBe(0);
            expect(summary.failed).toBe(0);
            expect(summary.avgDuration).toBe(0);
        });
    });

    describe('Max Entries Limit', () => {
        it('should keep only max entries', async () => {
            const smallInterceptor = new AuditInterceptor(5);

            // Add 10 entries
            for (let i = 0; i < 10; i++) {
                await smallInterceptor.after!({
                    operation: `op${i}`,
                    target: 'Service',
                    args: {},
                    startTime: Date.now(),
                });
            }

            const entries = smallInterceptor.getEntries();
            expect(entries).toHaveLength(5);
        });

        it('should keep most recent entries', async () => {
            const smallInterceptor = new AuditInterceptor(3);

            await smallInterceptor.after!({
                operation: 'first',
                target: 'Service',
                args: {},
                startTime: Date.now(),
            });

            await smallInterceptor.after!({
                operation: 'second',
                target: 'Service',
                args: {},
                startTime: Date.now(),
            });

            await smallInterceptor.after!({
                operation: 'third',
                target: 'Service',
                args: {},
                startTime: Date.now(),
            });

            await smallInterceptor.after!({
                operation: 'fourth',
                target: 'Service',
                args: {},
                startTime: Date.now(),
            });

            const entries = smallInterceptor.getEntries();
            expect(entries).toHaveLength(3);
            expect(entries[0].operation).toBe('second');
            expect(entries[entries.length - 1].operation).toBe('fourth');
        });
    });

    describe('Clear', () => {
        it('should remove all audit entries', async () => {
            await interceptor.after!({
                operation: 'test',
                target: 'Service',
                args: {},
                startTime: Date.now(),
            });

            let entries = interceptor.getEntries();
            expect(entries.length).toBeGreaterThan(0);

            interceptor.clear();

            entries = interceptor.getEntries();
            expect(entries).toHaveLength(0);
        });
    });

    describe('Export', () => {
        it('should export audit log as JSON', async () => {
            await interceptor.after!({
                operation: 'test',
                target: 'Service',
                args: {},
                startTime: Date.now(),
            });

            const json = interceptor.export();

            expect(() => JSON.parse(json)).not.toThrow();
            const parsed = JSON.parse(json);
            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed).toHaveLength(1);
        });

        it('should export empty array for empty log', () => {
            const json = interceptor.export();
            const parsed = JSON.parse(json);
            expect(parsed).toEqual([]);
        });
    });
});
