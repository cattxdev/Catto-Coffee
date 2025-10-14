/**
 * @fileoverview Tests for MetricsInterceptor
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MetricsInterceptor } from '../../src/interceptors/built/MetricsInterceptor';
import { InterceptorContext } from '../../src/interceptors/Interceptor';

describe('MetricsInterceptor', () => {
    let interceptor: MetricsInterceptor;

    beforeEach(() => {
        interceptor = new MetricsInterceptor();
    });

    afterEach(() => {
        interceptor.dispose();
    });

    describe('Constructor', () => {
        it('should create with correct name and priority', () => {
            expect(interceptor.name).toBe('Metrics');
            expect(interceptor.priority).toBe(5);
        });

        it('should create with auto-reporting disabled by default', () => {
            const metrics = new MetricsInterceptor();
            expect(metrics).toBeDefined();
            metrics.dispose();
        });

        it('should create with auto-reporting enabled', () => {
            const metrics = new MetricsInterceptor(5000);
            expect(metrics).toBeDefined();
            metrics.dispose();
        });
    });

    describe('Before Hook', () => {
        it('should return success without recording', async () => {
            const context: InterceptorContext = {
                operation: 'test',
                target: 'TestService',
                args: {},
                startTime: Date.now(),
            };

            const result = await interceptor.before!(context);

            expect(result.success).toBe(true);
        });
    });

    describe('After Hook', () => {
        it('should record successful operation metric', async () => {
            const context: InterceptorContext = {
                operation: 'createUser',
                target: 'UserService',
                args: {},
                startTime: Date.now() - 100,
            };

            await interceptor.after!(context);

            const metric = interceptor.getMetric('UserService', 'createUser');
            expect(metric).toBeDefined();
            expect(metric!.count).toBe(1);
            expect(metric!.errors).toBe(0);
        });

        it('should track multiple operations', async () => {
            const context: InterceptorContext = {
                operation: 'test',
                target: 'Service',
                args: {},
                startTime: Date.now() - 50,
            };

            await interceptor.after!(context);
            await interceptor.after!(context);
            await interceptor.after!(context);

            const metric = interceptor.getMetric('Service', 'test');
            expect(metric!.count).toBe(3);
        });

        it('should calculate average duration', async () => {
            const context1: InterceptorContext = {
                operation: 'test',
                target: 'Service',
                args: {},
                startTime: Date.now() - 100,
            };

            const context2: InterceptorContext = {
                operation: 'test',
                target: 'Service',
                args: {},
                startTime: Date.now() - 200,
            };

            await interceptor.after!(context1);
            await interceptor.after!(context2);

            const metric = interceptor.getMetric('Service', 'test');
            expect(metric!.avgDuration).toBeGreaterThan(0);
            expect(metric!.avgDuration).toBeLessThanOrEqual(200);
        });

        it('should track min and max duration', async () => {
            const fastContext: InterceptorContext = {
                operation: 'test',
                target: 'Service',
                args: {},
                startTime: Date.now() - 10,
            };

            const slowContext: InterceptorContext = {
                operation: 'test',
                target: 'Service',
                args: {},
                startTime: Date.now() - 200,
            };

            await interceptor.after!(fastContext);
            await interceptor.after!(slowContext);

            const metric = interceptor.getMetric('Service', 'test');
            expect(metric!.minDuration).toBeLessThan(metric!.maxDuration);
        });

        it('should update lastExecuted timestamp', async () => {
            const context: InterceptorContext = {
                operation: 'test',
                target: 'Service',
                args: {},
                startTime: Date.now(),
            };

            await interceptor.after!(context);

            const metric = interceptor.getMetric('Service', 'test');
            expect(metric!.lastExecuted).toBeInstanceOf(Date);
            expect(metric!.lastExecuted.getTime()).toBeLessThanOrEqual(Date.now());
        });
    });

    describe('Error Hook', () => {
        it('should record error count', async () => {
            const context: InterceptorContext = {
                operation: 'test',
                target: 'Service',
                args: {},
                error: new Error('Test error'),
                startTime: Date.now() - 50,
            };

            await interceptor.onError!(context);

            const metric = interceptor.getMetric('Service', 'test');
            expect(metric!.count).toBe(1);
            expect(metric!.errors).toBe(1);
        });

        it('should track both successful and failed operations', async () => {
            const successContext: InterceptorContext = {
                operation: 'test',
                target: 'Service',
                args: {},
                startTime: Date.now() - 50,
            };

            const errorContext: InterceptorContext = {
                operation: 'test',
                target: 'Service',
                args: {},
                error: new Error('Test'),
                startTime: Date.now() - 50,
            };

            await interceptor.after!(successContext);
            await interceptor.after!(successContext);
            await interceptor.onError!(errorContext);

            const metric = interceptor.getMetric('Service', 'test');
            expect(metric!.count).toBe(3);
            expect(metric!.errors).toBe(1);
        });
    });

    describe('GetAllMetrics', () => {
        it('should return all recorded metrics', async () => {
            const context1: InterceptorContext = {
                operation: 'create',
                target: 'UserService',
                args: {},
                startTime: Date.now(),
            };

            const context2: InterceptorContext = {
                operation: 'update',
                target: 'PostService',
                args: {},
                startTime: Date.now(),
            };

            await interceptor.after!(context1);
            await interceptor.after!(context2);

            const allMetrics = interceptor.getAllMetrics();
            expect(Object.keys(allMetrics)).toHaveLength(2);
            expect(allMetrics['UserService.create']).toBeDefined();
            expect(allMetrics['PostService.update']).toBeDefined();
        });

        it('should return empty object when no metrics', () => {
            const allMetrics = interceptor.getAllMetrics();
            expect(Object.keys(allMetrics)).toHaveLength(0);
        });
    });

    describe('ResetMetrics', () => {
        it('should clear all metrics', async () => {
            const context: InterceptorContext = {
                operation: 'test',
                target: 'Service',
                args: {},
                startTime: Date.now(),
            };

            await interceptor.after!(context);

            let metric = interceptor.getMetric('Service', 'test');
            expect(metric).toBeDefined();

            interceptor.resetMetrics();

            metric = interceptor.getMetric('Service', 'test');
            expect(metric).toBeUndefined();
        });
    });

    describe('LogMetrics', () => {
        it('should not throw when logging metrics', () => {
            expect(() => interceptor.logMetrics()).not.toThrow();
        });

        it('should log metrics after recording operations', async () => {
            const context: InterceptorContext = {
                operation: 'test',
                target: 'Service',
                args: {},
                startTime: Date.now(),
            };

            await interceptor.after!(context);

            expect(() => interceptor.logMetrics()).not.toThrow();
        });
    });

    describe('Dispose', () => {
        it('should cleanup resources', () => {
            const metrics = new MetricsInterceptor(1000);
            expect(() => metrics.dispose()).not.toThrow();
        });
    });
});
