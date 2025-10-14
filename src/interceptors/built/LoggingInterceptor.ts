/**
 * @fileoverview Logging Interceptor - Logs all intercepted operations
 * @author Catto Bot Team
 */

import { Interceptor, InterceptorContext, InterceptorResult } from '../Interceptor';
import logger from '../../utils/logger';

export interface LoggingInterceptorOptions {
    /** Log level for operations */
    logLevel?: 'debug' | 'info';
    /** Whether to log arguments */
    logArgs?: boolean;
    /** Whether to log results */
    logResults?: boolean;
    /** Whether to log execution time */
    logDuration?: boolean;
    /** Maximum length for logged values (to prevent huge logs) */
    maxValueLength?: number;
}

/**
 * Interceptor that logs all operations
 */
export class LoggingInterceptor extends Interceptor {
    private options: Required<LoggingInterceptorOptions>;

    constructor(options: LoggingInterceptorOptions = {}) {
        super('Logging', 10); // Low priority - runs early
        
        this.options = {
            logLevel: options.logLevel || 'info',
            logArgs: options.logArgs ?? true,
            logResults: options.logResults ?? false, // Don't log results by default (can be large)
            logDuration: options.logDuration ?? true,
            maxValueLength: options.maxValueLength || 200,
        };
    }

    async before(context: InterceptorContext): Promise<InterceptorResult> {
        const { operation, target, args } = context;
        
        let message = `[${target}] ${operation}`;
        
        if (this.options.logArgs && args) {
            const argsStr = this.truncate(JSON.stringify(args));
            message += ` - Args: ${argsStr}`;
        }

        if (this.options.logLevel === 'debug') {
            logger.debug(message);
        } else {
            logger.info(message);
        }

        return this.success();
    }

    async after(context: InterceptorContext): Promise<InterceptorResult> {
        const { operation, target, result, startTime } = context;
        
        let message = `[${target}] ${operation} - Completed`;

        if (this.options.logDuration) {
            const duration = Date.now() - startTime;
            message += ` (${duration}ms)`;
        }

        if (this.options.logResults && result !== undefined) {
            const resultStr = this.truncate(JSON.stringify(result));
            message += ` - Result: ${resultStr}`;
        }

        if (this.options.logLevel === 'debug') {
            logger.debug(message);
        } else {
            logger.info(message);
        }

        return this.success();
    }

    async onError(context: InterceptorContext): Promise<InterceptorResult> {
        const { operation, target, error, startTime } = context;
        
        const duration = Date.now() - startTime;
        const errorMsg = error?.message || 'Unknown error';
        
        logger.error(
            `[${target}] ${operation} - Failed (${duration}ms): ${errorMsg}`,
            error instanceof Error ? error.stack : error
        );

        return this.success();
    }

    /**
     * Truncate long strings for logging
     */
    private truncate(str: string): string {
        if (str.length <= this.options.maxValueLength) {
            return str;
        }
        return str.substring(0, this.options.maxValueLength) + '...';
    }
}
