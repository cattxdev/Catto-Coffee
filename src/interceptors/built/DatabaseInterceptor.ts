/**
 * @fileoverview Database Interceptor - Specifically for Prisma database operations
 * @author Catto Bot Team
 */

import { Interceptor, InterceptorContext, InterceptorResult } from '../Interceptor';
import logger from '../../utils/logger';

export interface DatabaseInterceptorOptions {
    /** Whether to log queries */
    logQueries?: boolean;
    /** Whether to validate data before writes */
    validateWrites?: boolean;
    /** Custom validation function */
    customValidator?: (operation: string, args: any) => Promise<boolean | string>;
}

/**
 * Interceptor specifically for database operations
 */
export class DatabaseInterceptor extends Interceptor {
    private options: Required<Omit<DatabaseInterceptorOptions, 'customValidator'>> & 
        Pick<DatabaseInterceptorOptions, 'customValidator'>;

    constructor(options: DatabaseInterceptorOptions = {}) {
        super('Database', 20); // Medium priority
        
        this.options = {
            logQueries: options.logQueries ?? true,
            validateWrites: options.validateWrites ?? true,
            customValidator: options.customValidator,
        };
    }

    async before(context: InterceptorContext): Promise<InterceptorResult> {
        const { operation, args } = context;

        // Validate write operations if enabled
        if (this.options.validateWrites && this.isWriteOperation(operation)) {
            // Run custom validator if provided
            if (this.options.customValidator) {
                const validationResult = await this.options.customValidator(operation, args);
                
                if (validationResult === false) {
                    return this.error('Custom validation failed');
                }
                
                if (typeof validationResult === 'string') {
                    return this.error(`Validation failed: ${validationResult}`);
                }
            }

            // Basic validation: check for required fields based on operation
            if (operation === 'create' && (!args || !args.data)) {
                return this.error('Create operation requires data');
            }

            if (operation === 'update' && (!args || !args.data)) {
                return this.error('Update operation requires data');
            }

            if ((operation === 'update' || operation === 'delete') && (!args || !args.where)) {
                return this.error(`${operation} operation requires where clause`);
            }
        }

        // Log query if enabled
        if (this.options.logQueries) {
            logger.database(`${operation} - ${JSON.stringify(args)}`);
        }

        return this.success();
    }

    async after(context: InterceptorContext): Promise<InterceptorResult> {
        const { operation, result, startTime } = context;
        const duration = Date.now() - startTime;

        if (this.options.logQueries) {
            const resultInfo = this.getResultInfo(result);
            logger.database(`${operation} completed in ${duration}ms - ${resultInfo}`);
        }

        return this.success();
    }

    async onError(context: InterceptorContext): Promise<InterceptorResult> {
        const { operation, error } = context;
        
        // Log database errors with context
        logger.error(`Database operation ${operation} failed:`, error);

        // Check for common database errors
        if (error?.message?.includes('Unique constraint')) {
            logger.warn('Duplicate entry detected');
        } else if (error?.message?.includes('Foreign key constraint')) {
            logger.warn('Foreign key constraint violation');
        } else if (error?.message?.includes('Record not found')) {
            logger.warn('Record not found');
        }

        return this.success();
    }

    /**
     * Check if operation is a write operation
     */
    private isWriteOperation(operation: string): boolean {
        const writeOps = ['create', 'update', 'upsert', 'delete', 'createMany', 'updateMany', 'deleteMany'];
        return writeOps.includes(operation);
    }

    /**
     * Get human-readable result info
     */
    private getResultInfo(result: any): string {
        if (result === null || result === undefined) {
            return 'No result';
        }

        if (Array.isArray(result)) {
            return `${result.length} record(s)`;
        }

        if (typeof result === 'object' && 'count' in result) {
            return `${result.count} record(s) affected`;
        }

        return 'Success';
    }
}
