/**
 * @fileoverview Tests for InterceptorRegistry
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { InterceptorRegistry } from '../../src/interceptors/InterceptorRegistry';
import { Interceptor, InterceptorContext, InterceptorResult } from '../../src/interceptors/Interceptor';

class MockInterceptor extends Interceptor {
    public beforeCalled = false;
    public afterCalled = false;
    public errorCalled = false;

    constructor(name: string, priority: number = 50) {
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

class FailingInterceptor extends Interceptor {
    constructor() {
        super('Failing', 50);
    }

    async before(_context: InterceptorContext): Promise<InterceptorResult> {
        return this.error('Validation failed');
    }
}

class ModifyingInterceptor extends Interceptor {
    constructor() {
        super('Modifying', 50);
    }

    async before(context: InterceptorContext): Promise<InterceptorResult> {
        return this.success('Modified', {
            args: { ...context.args, modified: true },
        });
    }
}

describe('InterceptorRegistry', () => {
    let registry: InterceptorRegistry;

    beforeEach(() => {
        registry = new InterceptorRegistry();
    });

    describe('Register', () => {
        it('should register interceptor for specific operation', () => {
            const interceptor = new MockInterceptor('Test');
            registry.register(interceptor, ['create']);

            const allInterceptors = registry.getAllInterceptors();
            expect(allInterceptors.has('create')).toBe(true);
            expect(allInterceptors.get('create')).toContain(interceptor);
        });

        it('should register interceptor for all operations with *', () => {
            const interceptor = new MockInterceptor('Global');
            registry.register(interceptor, ['*']);

            const allInterceptors = registry.getAllInterceptors();
            expect(allInterceptors.has('*')).toBe(true);
        });

        it('should register interceptor for multiple operations', () => {
            const interceptor = new MockInterceptor('Multi');
            registry.register(interceptor, ['create', 'update', 'delete']);

            const allInterceptors = registry.getAllInterceptors();
            expect(allInterceptors.has('create')).toBe(true);
            expect(allInterceptors.has('update')).toBe(true);
            expect(allInterceptors.has('delete')).toBe(true);
        });

        it('should sort interceptors by priority', () => {
            const low = new MockInterceptor('Low', 10);
            const high = new MockInterceptor('High', 90);
            const medium = new MockInterceptor('Medium', 50);

            registry.register(high, ['test']);
            registry.register(low, ['test']);
            registry.register(medium, ['test']);

            const interceptors = registry.getAllInterceptors().get('test')!;
            expect(interceptors[0].name).toBe('Low');
            expect(interceptors[1].name).toBe('Medium');
            expect(interceptors[2].name).toBe('High');
        });
    });

    describe('Unregister', () => {
        it('should remove interceptor by name', () => {
            const interceptor = new MockInterceptor('Test');
            registry.register(interceptor, ['create']);

            registry.unregister('Test');

            const allInterceptors = registry.getAllInterceptors();
            const createInterceptors = allInterceptors.get('create');
            expect(createInterceptors).toBeUndefined();
        });

        it('should remove from all operations', () => {
            const interceptor = new MockInterceptor('Multi');
            registry.register(interceptor, ['create', 'update']);

            registry.unregister('Multi');

            const allInterceptors = registry.getAllInterceptors();
            expect(allInterceptors.has('create')).toBe(false);
            expect(allInterceptors.has('update')).toBe(false);
        });
    });

    describe('ExecuteBefore', () => {
        it('should execute before hooks in priority order', async () => {
            const first = new MockInterceptor('First', 10);
            const second = new MockInterceptor('Second', 20);

            registry.register(first, ['test']);
            registry.register(second, ['test']);

            const context: InterceptorContext = {
                operation: 'test',
                target: 'TestService',
                args: {},
                startTime: Date.now(),
            };

            const result = await registry.executeBefore(context);

            expect(result.success).toBe(true);
            expect(first.beforeCalled).toBe(true);
            expect(second.beforeCalled).toBe(true);
        });

        it('should stop on failed interceptor', async () => {
            const failing = new FailingInterceptor();
            const second = new MockInterceptor('Second', 60);

            registry.register(failing, ['test']);
            registry.register(second, ['test']);

            const context: InterceptorContext = {
                operation: 'test',
                target: 'TestService',
                args: {},
                startTime: Date.now(),
            };

            const result = await registry.executeBefore(context);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Validation failed');
            expect(second.beforeCalled).toBe(false);
        });

        it('should apply context modifications', async () => {
            const modifying = new ModifyingInterceptor();
            registry.register(modifying, ['test']);

            const context: InterceptorContext = {
                operation: 'test',
                target: 'TestService',
                args: { original: true },
                startTime: Date.now(),
            };

            const result = await registry.executeBefore(context);

            expect(result.success).toBe(true);
            expect(result.context.args).toHaveProperty('modified', true);
            expect(result.context.args).toHaveProperty('original', true);
        });

        it('should skip disabled interceptors', async () => {
            const interceptor = new MockInterceptor('Test');
            interceptor.enabled = false;

            registry.register(interceptor, ['test']);

            const context: InterceptorContext = {
                operation: 'test',
                target: 'TestService',
                args: {},
                startTime: Date.now(),
            };

            await registry.executeBefore(context);

            expect(interceptor.beforeCalled).toBe(false);
        });

        it('should handle global and specific interceptors', async () => {
            const global = new MockInterceptor('Global', 10);
            const specific = new MockInterceptor('Specific', 20);

            registry.register(global, ['*']);
            registry.register(specific, ['test']);

            const context: InterceptorContext = {
                operation: 'test',
                target: 'TestService',
                args: {},
                startTime: Date.now(),
            };

            await registry.executeBefore(context);

            expect(global.beforeCalled).toBe(true);
            expect(specific.beforeCalled).toBe(true);
        });
    });

    describe('ExecuteAfter', () => {
        it('should execute after hooks', async () => {
            const interceptor = new MockInterceptor('Test');
            registry.register(interceptor, ['test']);

            const context: InterceptorContext = {
                operation: 'test',
                target: 'TestService',
                args: {},
                result: { success: true },
                startTime: Date.now(),
            };

            const result = await registry.executeAfter(context);

            expect(result.success).toBe(true);
            expect(interceptor.afterCalled).toBe(true);
        });

        it('should not stop on failed after hook', async () => {
            class FailingAfterInterceptor extends Interceptor {
                constructor() {
                    super('FailingAfter', 50);
                }

                async after(_context: InterceptorContext): Promise<InterceptorResult> {
                    return this.error('After failed');
                }
            }

            const failing = new FailingAfterInterceptor();
            const second = new MockInterceptor('Second', 60);

            registry.register(failing, ['test']);
            registry.register(second, ['test']);

            const context: InterceptorContext = {
                operation: 'test',
                target: 'TestService',
                args: {},
                result: {},
                startTime: Date.now(),
            };

            const result = await registry.executeAfter(context);

            // Should still succeed even if after hook fails
            expect(result.success).toBe(true);
            expect(second.afterCalled).toBe(true);
        });
    });

    describe('ExecuteOnError', () => {
        it('should execute error hooks', async () => {
            const interceptor = new MockInterceptor('Test');
            registry.register(interceptor, ['test']);

            const context: InterceptorContext = {
                operation: 'test',
                target: 'TestService',
                args: {},
                error: new Error('Test error'),
                startTime: Date.now(),
            };

            const result = await registry.executeOnError(context);

            expect(result.success).toBe(true);
            expect(interceptor.errorCalled).toBe(true);
        });
    });

    describe('Clear', () => {
        it('should remove all interceptors', () => {
            const interceptor1 = new MockInterceptor('Test1');
            const interceptor2 = new MockInterceptor('Test2');

            registry.register(interceptor1, ['create']);
            registry.register(interceptor2, ['update']);

            registry.clear();

            const allInterceptors = registry.getAllInterceptors();
            expect(allInterceptors.size).toBe(0);
        });
    });

    describe('GetAllInterceptors', () => {
        it('should return map of all interceptors', () => {
            const interceptor = new MockInterceptor('Test');
            registry.register(interceptor, ['create']);

            const allInterceptors = registry.getAllInterceptors();

            expect(allInterceptors).toBeInstanceOf(Map);
            expect(allInterceptors.has('create')).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should handle errors in before hook gracefully', async () => {
            class ThrowingInterceptor extends Interceptor {
                constructor() {
                    super('Throwing', 50);
                }

                async before(_context: InterceptorContext): Promise<InterceptorResult> {
                    throw new Error('Unexpected error');
                }
            }

            const throwing = new ThrowingInterceptor();
            registry.register(throwing, ['test']);

            const context: InterceptorContext = {
                operation: 'test',
                target: 'TestService',
                args: {},
                startTime: Date.now(),
            };

            const result = await registry.executeBefore(context);

            expect(result.success).toBe(false);
            expect(result.message).toContain('failed');
        });

        it('should handle errors in after hook gracefully', async () => {
            class ThrowingAfterInterceptor extends Interceptor {
                constructor() {
                    super('ThrowingAfter', 50);
                }

                async after(_context: InterceptorContext): Promise<InterceptorResult> {
                    throw new Error('Unexpected error');
                }
            }

            const throwing = new ThrowingAfterInterceptor();
            registry.register(throwing, ['test']);

            const context: InterceptorContext = {
                operation: 'test',
                target: 'TestService',
                args: {},
                result: {},
                startTime: Date.now(),
            };

            // Should not throw
            const result = await registry.executeAfter(context);
            expect(result.success).toBe(true);
        });
    });
});
