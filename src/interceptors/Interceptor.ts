/**
 * @fileoverview Base Interceptor class for the global interceptor system
 * @author Catto Bot Team
 */

import { BotClient } from '../structures/BotClient';

/**
 * Context passed to interceptors
 */
export interface InterceptorContext<TArgs = any, TResult = any> {
    /** The operation being performed */
    operation: string;
    /** The target (service/model/method) */
    target: string;
    /** Arguments passed to the operation */
    args: TArgs;
    /** The result of the operation (only available in after/error hooks) */
    result?: TResult;
    /** Any error that occurred (only in error hook) */
    error?: Error;
    /** Additional metadata */
    metadata?: Record<string, any>;
    /** Timestamp when operation started */
    startTime: number;
    /** Client instance for accessing services */
    client?: BotClient;
}

/**
 * Result of an interceptor execution
 */
export interface InterceptorResult {
    /** Whether the interceptor passed */
    success: boolean;
    /** Optional message */
    message?: string;
    /** Whether to skip remaining interceptors */
    skip?: boolean;
    /** Modified context (can be used to transform args/results) */
    modifiedContext?: Partial<InterceptorContext>;
}

/**
 * Base abstract class for all interceptors
 */
export abstract class Interceptor {
    /** Name of the interceptor */
    public readonly name: string;
    
    /** Execution priority (lower = runs first) */
    public readonly priority: number;

    /** Whether this interceptor is enabled */
    public enabled: boolean = true;

    /**
     * Create a new interceptor
     * @param name - Name of the interceptor
     * @param priority - Execution priority (1-100, lower runs first)
     */
    constructor(name: string, priority: number = 50) {
        this.name = name;
        this.priority = priority;
    }

    /**
     * Called before the operation executes
     * @param context - The interceptor context
     * @returns Result indicating if operation should proceed
     */
    async before?(context: InterceptorContext): Promise<InterceptorResult>;

    /**
     * Called after the operation succeeds
     * @param context - The interceptor context (includes result)
     * @returns Result indicating post-processing status
     */
    async after?(context: InterceptorContext): Promise<InterceptorResult>;

    /**
     * Called when the operation fails
     * @param context - The interceptor context (includes error)
     * @returns Result indicating error handling status
     */
    async onError?(context: InterceptorContext): Promise<InterceptorResult>;

    /**
     * Helper to create success result
     */
    protected success(message?: string, modifiedContext?: Partial<InterceptorContext>): InterceptorResult {
        return {
            success: true,
            message,
            modifiedContext,
        };
    }

    /**
     * Helper to create error result
     */
    protected error(message: string, skip: boolean = false): InterceptorResult {
        return {
            success: false,
            message,
            skip,
        };
    }

    /**
     * Helper to create skip result (skips remaining interceptors)
     */
    protected skipRemaining(message?: string): InterceptorResult {
        return {
            success: true,
            message,
            skip: true,
        };
    }
}
