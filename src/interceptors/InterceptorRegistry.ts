/**
 * @fileoverview Interceptor Registry - Manages and executes interceptors
 * @author Catto Bot Team
 */

import { Interceptor, InterceptorContext } from './Interceptor';
import logger from '../utils/logger';

/**
 * Registry for managing interceptors
 */
export class InterceptorRegistry {
    private interceptors: Map<string, Interceptor[]>;

    constructor() {
        this.interceptors = new Map();
    }

    /**
     * Register an interceptor for specific operations
     * @param interceptor - The interceptor to register
     * @param operations - Operations to intercept (use '*' for all)
     */
    register(interceptor: Interceptor, operations: string[] = ['*']): void {
        for (const operation of operations) {
            if (!this.interceptors.has(operation)) {
                this.interceptors.set(operation, []);
            }

            const list = this.interceptors.get(operation)!;
            list.push(interceptor);
            
            // Sort by priority (lower priority runs first)
            list.sort((a, b) => a.priority - b.priority);
        }

        logger.debug(`Registered interceptor: ${interceptor.name} for operations: ${operations.join(', ')}`);
    }

    /**
     * Unregister an interceptor
     * @param interceptorName - Name of the interceptor to remove
     */
    unregister(interceptorName: string): void {
        for (const [operation, list] of this.interceptors.entries()) {
            const filtered = list.filter(i => i.name !== interceptorName);
            if (filtered.length === 0) {
                this.interceptors.delete(operation);
            } else {
                this.interceptors.set(operation, filtered);
            }
        }

        logger.debug(`Unregistered interceptor: ${interceptorName}`);
    }

    /**
     * Get interceptors for a specific operation
     * @param operation - The operation name
     * @returns Array of interceptors
     */
    private getInterceptorsForOperation(operation: string): Interceptor[] {
        const specific = this.interceptors.get(operation) || [];
        const global = this.interceptors.get('*') || [];
        
        // Combine and sort by priority
        const combined = [...specific, ...global]
            .filter(i => i.enabled)
            .sort((a, b) => a.priority - b.priority);

        return combined;
    }

    /**
     * Execute before hooks for an operation
     * @param context - The interceptor context
     * @returns Modified context or error
     */
    async executeBefore(context: InterceptorContext): Promise<{ success: boolean; context: InterceptorContext; message?: string }> {
        const interceptors = this.getInterceptorsForOperation(context.operation);
        let currentContext = { ...context };

        for (const interceptor of interceptors) {
            if (!interceptor.before) continue;

            try {
                const result = await interceptor.before(currentContext);

                // Apply context modifications
                if (result.modifiedContext) {
                    currentContext = {
                        ...currentContext,
                        ...result.modifiedContext,
                    };
                }

                // Check if interceptor failed
                if (!result.success) {
                    return {
                        success: false,
                        context: currentContext,
                        message: result.message,
                    };
                }

                // Check if we should skip remaining interceptors
                if (result.skip) {
                    break;
                }
            } catch (error) {
                logger.error(`Error in interceptor ${interceptor.name} before hook:`, error);
                return {
                    success: false,
                    context: currentContext,
                    message: `Interceptor ${interceptor.name} failed: ${error}`,
                };
            }
        }

        return { success: true, context: currentContext };
    }

    /**
     * Execute after hooks for an operation
     * @param context - The interceptor context (with result)
     * @returns Modified context or error
     */
    async executeAfter(context: InterceptorContext): Promise<{ success: boolean; context: InterceptorContext; message?: string }> {
        const interceptors = this.getInterceptorsForOperation(context.operation);
        let currentContext = { ...context };

        for (const interceptor of interceptors) {
            if (!interceptor.after) continue;

            try {
                const result = await interceptor.after(currentContext);

                // Apply context modifications
                if (result.modifiedContext) {
                    currentContext = {
                        ...currentContext,
                        ...result.modifiedContext,
                    };
                }

                // Even if after hook fails, we don't stop execution
                // but we log the issue
                if (!result.success) {
                    logger.warn(`Interceptor ${interceptor.name} after hook failed: ${result.message}`);
                }

                if (result.skip) {
                    break;
                }
            } catch (error) {
                logger.error(`Error in interceptor ${interceptor.name} after hook:`, error);
            }
        }

        return { success: true, context: currentContext };
    }

    /**
     * Execute error hooks for a failed operation
     * @param context - The interceptor context (with error)
     * @returns Modified context
     */
    async executeOnError(context: InterceptorContext): Promise<{ success: boolean; context: InterceptorContext }> {
        const interceptors = this.getInterceptorsForOperation(context.operation);
        let currentContext = { ...context };

        for (const interceptor of interceptors) {
            if (!interceptor.onError) continue;

            try {
                const result = await interceptor.onError(currentContext);

                if (result.modifiedContext) {
                    currentContext = {
                        ...currentContext,
                        ...result.modifiedContext,
                    };
                }

                if (result.skip) {
                    break;
                }
            } catch (error) {
                logger.error(`Error in interceptor ${interceptor.name} error hook:`, error);
            }
        }

        return { success: true, context: currentContext };
    }

    /**
     * Get all registered interceptors
     */
    getAllInterceptors(): Map<string, Interceptor[]> {
        return new Map(this.interceptors);
    }

    /**
     * Clear all interceptors
     */
    clear(): void {
        this.interceptors.clear();
        logger.debug('Cleared all interceptors');
    }
}

// Export singleton instance
export default new InterceptorRegistry();
