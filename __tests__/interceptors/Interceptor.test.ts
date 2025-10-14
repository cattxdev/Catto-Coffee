/**
 * @fileoverview Tests for Base Interceptor and InterceptorContext
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Interceptor, InterceptorContext, InterceptorResult } from '../../src/interceptors/Interceptor';

class TestInterceptor extends Interceptor {
    constructor(name: string = 'Test', priority: number = 50) {
        super(name, priority);
    }

    async before(_context: InterceptorContext): Promise<InterceptorResult> {
        return this.success('Before hook executed');
    }

    async after(_context: InterceptorContext): Promise<InterceptorResult> {
        return this.success('After hook executed');
    }

    async onError(_context: InterceptorContext): Promise<InterceptorResult> {
        return this.success('Error hook executed');
    }
}

describe('Interceptor', () => {
    let interceptor: TestInterceptor;

    beforeEach(() => {
        interceptor = new TestInterceptor();
    });

    describe('Constructor', () => {
        it('should set name and priority', () => {
            expect(interceptor.name).toBe('Test');
            expect(interceptor.priority).toBe(50);
        });

        it('should be enabled by default', () => {
            expect(interceptor.enabled).toBe(true);
        });

        it('should allow custom priority', () => {
            const customInterceptor = new TestInterceptor('Custom', 10);
            expect(customInterceptor.priority).toBe(10);
        });
    });

    describe('Hook Methods', () => {
        const context: InterceptorContext = {
            operation: 'testOperation',
            target: 'TestService',
            args: { test: 'value' },
            startTime: Date.now(),
            metadata: { userId: '123' },
        };

        it('should execute before hook', async () => {
            const result = await interceptor.before!(context);
            expect(result.success).toBe(true);
            expect(result.message).toBe('Before hook executed');
        });

        it('should execute after hook', async () => {
            const contextWithResult = {
                ...context,
                result: { data: 'test' },
            };
            const result = await interceptor.after!(contextWithResult);
            expect(result.success).toBe(true);
            expect(result.message).toBe('After hook executed');
        });

        it('should execute error hook', async () => {
            const contextWithError = {
                ...context,
                error: new Error('Test error'),
            };
            const result = await interceptor.onError!(contextWithError);
            expect(result.success).toBe(true);
            expect(result.message).toBe('Error hook executed');
        });
    });

    describe('Helper Methods', () => {
        it('should create success result', () => {
            const result = (interceptor as any).success('Success message');
            expect(result.success).toBe(true);
            expect(result.message).toBe('Success message');
            expect(result.modifiedContext).toBeUndefined();
        });

        it('should create success result with modified context', () => {
            const modifiedContext = { args: { modified: true } };
            const result = (interceptor as any).success('Success', modifiedContext);
            expect(result.success).toBe(true);
            expect(result.modifiedContext).toEqual(modifiedContext);
        });

        it('should create error result', () => {
            const result = (interceptor as any).error('Error message');
            expect(result.success).toBe(false);
            expect(result.message).toBe('Error message');
            expect(result.skip).toBe(false);
        });

        it('should create error result with skip', () => {
            const result = (interceptor as any).error('Error message', true);
            expect(result.success).toBe(false);
            expect(result.skip).toBe(true);
        });

        it('should create skip result', () => {
            const result = (interceptor as any).skipRemaining('Skipping');
            expect(result.success).toBe(true);
            expect(result.skip).toBe(true);
            expect(result.message).toBe('Skipping');
        });
    });

    describe('Enable/Disable', () => {
        it('should allow disabling interceptor', () => {
            interceptor.enabled = false;
            expect(interceptor.enabled).toBe(false);
        });

        it('should allow re-enabling interceptor', () => {
            interceptor.enabled = false;
            interceptor.enabled = true;
            expect(interceptor.enabled).toBe(true);
        });
    });
});

describe('InterceptorContext', () => {
    it('should have required properties', () => {
        const context: InterceptorContext = {
            operation: 'create',
            target: 'UserService',
            args: { id: '123' },
            startTime: Date.now(),
        };

        expect(context.operation).toBe('create');
        expect(context.target).toBe('UserService');
        expect(context.args).toEqual({ id: '123' });
        expect(context.startTime).toBeGreaterThan(0);
    });

    it('should allow optional properties', () => {
        const context: InterceptorContext = {
            operation: 'update',
            target: 'UserService',
            args: { id: '123' },
            startTime: Date.now(),
            result: { success: true },
            error: new Error('Test error'),
            metadata: { userId: '456' },
        };

        expect(context.result).toEqual({ success: true });
        expect(context.error).toBeInstanceOf(Error);
        expect(context.metadata?.userId).toBe('456');
    });
});

describe('InterceptorResult', () => {
    it('should support success result', () => {
        const result: InterceptorResult = {
            success: true,
        };

        expect(result.success).toBe(true);
        expect(result.message).toBeUndefined();
        expect(result.skip).toBeUndefined();
    });

    it('should support error result', () => {
        const result: InterceptorResult = {
            success: false,
            message: 'Validation failed',
        };

        expect(result.success).toBe(false);
        expect(result.message).toBe('Validation failed');
    });

    it('should support modified context', () => {
        const result: InterceptorResult = {
            success: true,
            modifiedContext: {
                args: { modified: true },
            },
        };

        expect(result.modifiedContext?.args).toEqual({ modified: true });
    });
});
