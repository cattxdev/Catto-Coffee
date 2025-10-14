/**
 * @fileoverview Metrics Interceptor - Tracks operation performance and counts
 * @author Catto Bot Team
 */

import { Interceptor, InterceptorContext, InterceptorResult } from '../Interceptor';
import logger from '../../utils/logger';

interface MetricData {
    count: number;
    totalDuration: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    errors: number;
    lastExecuted: Date;
}

/**
 * Interceptor that tracks metrics for operations
 */
export class MetricsInterceptor extends Interceptor {
    private metrics: Map<string, MetricData>;
    private reportInterval?: NodeJS.Timeout;

    constructor(reportIntervalMs?: number) {
        super('Metrics', 5); // Very low priority - runs first
        this.metrics = new Map();

        // Optional: Auto-report metrics periodically
        if (reportIntervalMs && reportIntervalMs > 0) {
            this.reportInterval = setInterval(() => {
                this.logMetrics();
            }, reportIntervalMs);
        }
    }

    async before(_context: InterceptorContext): Promise<InterceptorResult> {
        // Just track that operation started
        return this.success();
    }

    async after(context: InterceptorContext): Promise<InterceptorResult> {
        const { operation, target, startTime } = context;
        const key = `${target}.${operation}`;
        const duration = Date.now() - startTime;

        this.recordMetric(key, duration, false);

        return this.success();
    }

    async onError(context: InterceptorContext): Promise<InterceptorResult> {
        const { operation, target, startTime } = context;
        const key = `${target}.${operation}`;
        const duration = Date.now() - startTime;

        this.recordMetric(key, duration, true);

        return this.success();
    }

    /**
     * Record a metric for an operation
     */
    private recordMetric(key: string, duration: number, isError: boolean): void {
        const existing = this.metrics.get(key);

        if (!existing) {
            this.metrics.set(key, {
                count: 1,
                totalDuration: duration,
                avgDuration: duration,
                minDuration: duration,
                maxDuration: duration,
                errors: isError ? 1 : 0,
                lastExecuted: new Date(),
            });
        } else {
            existing.count++;
            existing.totalDuration += duration;
            existing.avgDuration = existing.totalDuration / existing.count;
            existing.minDuration = Math.min(existing.minDuration, duration);
            existing.maxDuration = Math.max(existing.maxDuration, duration);
            if (isError) existing.errors++;
            existing.lastExecuted = new Date();
        }
    }

    /**
     * Get metrics for a specific operation
     */
    public getMetric(target: string, operation: string): MetricData | undefined {
        return this.metrics.get(`${target}.${operation}`);
    }

    /**
     * Get all metrics
     */
    public getAllMetrics(): Record<string, MetricData> {
        const result: Record<string, MetricData> = {};
        for (const [key, value] of this.metrics.entries()) {
            result[key] = value;
        }
        return result;
    }

    /**
     * Log current metrics
     */
    public logMetrics(): void {
        logger.info('=== Operation Metrics ===');
        
        const sortedMetrics = Array.from(this.metrics.entries())
            .sort((a, b) => b[1].count - a[1].count);

        for (const [key, metric] of sortedMetrics) {
            logger.info(
                `${key}: ` +
                `Count: ${metric.count}, ` +
                `Avg: ${metric.avgDuration.toFixed(2)}ms, ` +
                `Min: ${metric.minDuration}ms, ` +
                `Max: ${metric.maxDuration}ms, ` +
                `Errors: ${metric.errors}`
            );
        }
    }

    /**
     * Reset all metrics
     */
    public resetMetrics(): void {
        this.metrics.clear();
        logger.debug('Metrics reset');
    }

    /**
     * Cleanup when disposing
     */
    public dispose(): void {
        if (this.reportInterval) {
            clearInterval(this.reportInterval);
        }
    }
}
