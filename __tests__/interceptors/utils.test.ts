/**
 * @fileoverview Tests for utility functions (withInterceptors, executeWithInterceptors)
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { withInterceptors, executeWithInterceptors } from '../../src/interceptors/utils';
import { InterceptorRegistry } from '../../src/interceptors/InterceptorRegistry';
import { Interceptor, InterceptorContext, InterceptorResult } from '../../src/interceptors/Interceptor';

class TestInterceptor extends Interceptor {
    public beforeCalled = false;
    public afterCalled = false;
    public errorCalled = false;

    constructor(name: string = 'Test', priority: number = 50) {
        super(name, priority);
    }

    async before(_context: InterceptorContext): Promise<InterceptorResult> {
        this.beforeCalled = true;
        return this.success();
    }

    async after(_context: InterceptorContext): Promise<InterceptorResult> {
        this.afterCalled = true;
        return this.success();
    }

    async onError(_context: InterceptorContext): Promise<InterceptorResult> {
        this.errorCalled = true;
        return this.success();
    }
}

describe('Interceptor Utils', () => {
    let registry: InterceptorRegistry;

    beforeEach(() => {
        registry = new InterceptorRegistry();
        // Use the test registry instance for these tests
        const registryModule = require('../../src/interceptors/InterceptorRegistry');
        Object.defineProperty(registryModule, 'default', {
            value: registry,
            writable: true,
        });
    });

    describe('withInterceptors', () => {
        it('should wrap function and call interceptors', async () => {
            const interceptor = new TestInterceptor();
            registry.register(interceptor, ['test']);

            const mockFn = jest.fn(async (x: number) => x * 2);
            const wrapped = withInterceptors('TestService', 'test', mockFn);

            const result = await wrapped(5);

            expect(result).toBe(10);
            expect(mockFn).toHaveBeenCalledWith(5);
            expect(interceptor.beforeCalled).toBe(true);
            expect(interceptor.afterCalled).toBe(true);
        });

        it('should pass metadata to context', async () => {
            let capturedContext: InterceptorContext | null = null;

            class CapturingInterceptor extends Interceptor {
                constructor() {
                    super('Capturing', 50);
                }

                async before(context: InterceptorContext): Promise<InterceptorResult> {
                    capturedContext = context;
                    return this.success();
                }
            }

            const capturing = new CapturingInterceptor();
            registry.register(capturing, ['test']);

            const mockFn = jest.fn(async () => 'result');
            const wrapped = withInterceptors(
                'Service',
                'test',
                mockFn,
                { userId: '123', custom: 'data' }
            );

            await wrapped();

            expect(capturedContext).not.toBeNull();
            expect(capturedContext!.metadata?.userId).toBe('123');
            expect(capturedContext!.metadata?.custom).toBe('data');
        });

        it('should throw error if before hook fails', async () => {
            class FailingInterceptor extends Interceptor {
                constructor() {
                    super('Failing', 50);
                }

                async before(_context: InterceptorContext): Promise<InterceptorResult> {
                    return this.error('Validation failed');
                }
            }

            const failing = new FailingInterceptor();
            registry.register(failing, ['test']);

            const mockFn = jest.fn(async () => 'result');
            const wrapped = withInterceptors('Service', 'test', mockFn);

            await expect(wrapped()).rejects.toThrow('Validation failed');
            expect(mockFn).not.toHaveBeenCalled();
        });

        it('should call error hook on function error', async () => {
            const interceptor = new TestInterceptor();
            registry.register(interceptor, ['test']);

            const mockFn = jest.fn(async () => {
                throw new Error('Function error');
            });
            const wrapped = withInterceptors('Service', 'test', mockFn);

            await expect(wrapped()).rejects.toThrow('Function error');
            expect(interceptor.beforeCalled).toBe(true);
            expect(interceptor.errorCalled).toBe(true);
            expect(interceptor.afterCalled).toBe(false);
        });

        it('should work with multiple arguments', async () => {
            const mockFn = jest.fn(async (a: number, b: string, c: boolean) => {
                return { a, b, c };
            });
            const wrapped = withInterceptors('Service', 'test', mockFn);

            const result = await wrapped(42, 'hello', true);

            expect(result).toEqual({ a: 42, b: 'hello', c: true });
            expect(mockFn).toHaveBeenCalledWith(42, 'hello', true);
        });

        it('should preserve return value', async () => {
            const mockFn = jest.fn(async () => ({ data: 'test', count: 5 }));
            const wrapped = withInterceptors('Service', 'test', mockFn);

            const result = await wrapped();

            expect(result).toEqual({ data: 'test', count: 5 });
        });
    });

    describe('executeWithInterceptors', () => {
        it('should execute function with interceptors', async () => {
            const interceptor = new TestInterceptor();
            registry.register(interceptor, ['manual']);

            const mockFn = jest.fn(async () => 'result');
            const result = await executeWithInterceptors(
                'Service',
                'manual',
                mockFn,
                { arg: 'value' },
                { userId: '123' }
            );

            expect(result).toBe('result');
            expect(mockFn).toHaveBeenCalled();
            expect(interceptor.beforeCalled).toBe(true);
            expect(interceptor.afterCalled).toBe(true);
        });

        it('should handle errors', async () => {
            const interceptor = new TestInterceptor();
            registry.register(interceptor, ['manual']);

            const mockFn = jest.fn(async () => {
                throw new Error('Test error');
            });

            await expect(
                executeWithInterceptors('Service', 'manual', mockFn)
            ).rejects.toThrow('Test error');

            expect(interceptor.errorCalled).toBe(true);
        });

        it('should work without args and metadata', async () => {
            const mockFn = jest.fn(async () => 'success');
            const result = await executeWithInterceptors(
                'Service',
                'operation',
                mockFn
            );

            expect(result).toBe('success');
        });

        it('should throw if before hook fails', async () => {
            class FailingInterceptor extends Interceptor {
                constructor() {
                    super('Failing', 50);
                }

                async before(_context: InterceptorContext): Promise<InterceptorResult> {
                    return this.error('Before failed');
                }
            }

            const failing = new FailingInterceptor();
            registry.register(failing, ['manual']);

            const mockFn = jest.fn(async () => 'result');

            await expect(
                executeWithInterceptors('Service', 'manual', mockFn)
            ).rejects.toThrow('Before failed');

            expect(mockFn).not.toHaveBeenCalled();
        });
    });

    describe('Integration', () => {
        it('should work with multiple interceptors', async () => {
            const first = new TestInterceptor('First', 10);
            const second = new TestInterceptor('Second', 20);

            registry.register(first, ['*']);
            registry.register(second, ['test']);

            const mockFn = jest.fn(async (x: number) => x + 1);
            const wrapped = withInterceptors('Service', 'test', mockFn);

            await wrapped(5);

            expect(first.beforeCalled).toBe(true);
            expect(second.beforeCalled).toBe(true);
            expect(first.afterCalled).toBe(true);
            expect(second.afterCalled).toBe(true);
        });

        it('should respect interceptor priority', async () => {
            const callOrder: string[] = [];

            class OrderTrackingInterceptor extends Interceptor {
                async before(_context: InterceptorContext): Promise<InterceptorResult> {
                    callOrder.push(this.name);
                    return this.success();
                }
            }

            const low = new OrderTrackingInterceptor('Low', 10);
            const high = new OrderTrackingInterceptor('High', 90);
            const medium = new OrderTrackingInterceptor('Medium', 50);

            registry.register(high, ['test']);
            registry.register(low, ['test']);
            registry.register(medium, ['test']);

            const mockFn = jest.fn(async () => 'result');
            const wrapped = withInterceptors('Service', 'test', mockFn);

            await wrapped();

            expect(callOrder).toEqual(['Low', 'Medium', 'High']);
        });
    });
});
