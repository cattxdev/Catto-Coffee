/**
 * @fileoverview Interceptor utility functions for easy integration
 * @author Catto Bot Team
 */

import { InterceptorContext } from './Interceptor';
import interceptorRegistry from './InterceptorRegistry';

/**
 * Wrap a function with interceptors
 * @param target - The target object/service name
 * @param operation - The operation name
 * @param fn - The function to wrap
 * @param metadata - Optional metadata to include in context
 * @returns Wrapped function
 */
export function withInterceptors<TArgs extends any[], TResult>(
    target: string,
    operation: string,
    fn: (...args: TArgs) => Promise<TResult>,
    metadata?: Record<string, any>
): (...args: TArgs) => Promise<TResult> {
    return async (...args: TArgs): Promise<TResult> => {
        const context: InterceptorContext<TArgs, TResult> = {
            operation,
            target,
            args: args as TArgs,
            startTime: Date.now(),
            metadata,
        };

        // Execute before hooks
        const beforeResult = await interceptorRegistry.executeBefore(context);
        if (!beforeResult.success) {
            throw new Error(beforeResult.message || 'Interceptor before hook failed');
        }

        // Update context with any modifications
        const updatedContext = beforeResult.context;

        try {
            // Execute the actual function
            const result = await fn(...(updatedContext.args as TArgs));

            // Add result to context
            updatedContext.result = result;

            // Execute after hooks
            await interceptorRegistry.executeAfter(updatedContext);

            return result;
        } catch (error) {
            // Add error to context
            updatedContext.error = error as Error;

            // Execute error hooks
            await interceptorRegistry.executeOnError(updatedContext);

            // Re-throw the error
            throw error;
        }
    };
}

/**
 * Create a decorator for class methods to automatically apply interceptors
 * @param target - The target service/class name
 * @param metadata - Optional metadata
 */
export function Intercept(target: string, metadata?: Record<string, any>) {
    return function (
        _targetClass: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const wrappedFn = withInterceptors(
                target,
                propertyKey,
                originalMethod.bind(this),
                metadata
            );
            return wrappedFn(...args);
        };

        return descriptor;
    };
}

/**
 * Utility to manually trigger interceptors without wrapping
 * Useful for one-off operations
 */
export async function executeWithInterceptors<TResult>(
    target: string,
    operation: string,
    fn: () => Promise<TResult>,
    args?: any,
    metadata?: Record<string, any>
): Promise<TResult> {
    const context: InterceptorContext = {
        operation,
        target,
        args,
        startTime: Date.now(),
        metadata,
    };

    // Execute before hooks
    const beforeResult = await interceptorRegistry.executeBefore(context);
    if (!beforeResult.success) {
        throw new Error(beforeResult.message || 'Interceptor before hook failed');
    }

    try {
        // Execute the function
        const result = await fn();

        // Add result to context
        context.result = result;

        // Execute after hooks
        await interceptorRegistry.executeAfter(context);

        return result;
    } catch (error) {
        // Add error to context
        context.error = error as Error;

        // Execute error hooks
        await interceptorRegistry.executeOnError(context);

        throw error;
    }
}
