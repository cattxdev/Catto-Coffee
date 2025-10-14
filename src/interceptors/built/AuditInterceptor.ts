/**
 * @fileoverview Audit Interceptor - Creates audit log entries for operations
 * @author Catto Bot Team
 */

import { Interceptor, InterceptorContext, InterceptorResult } from '../Interceptor';
import logger from '../../utils/logger';

export interface AuditEntry {
    id: string;
    timestamp: Date;
    operation: string;
    target: string;
    userId?: string;
    guildId?: string;
    success: boolean;
    duration: number;
    error?: string;
    metadata?: Record<string, any>;
}

/**
 * Interceptor that creates audit logs for operations
 */
export class AuditInterceptor extends Interceptor {
    private auditLog: AuditEntry[];
    private maxEntries: number;

    constructor(maxEntries: number = 1000) {
        super('Audit', 15); // Low-medium priority
        this.auditLog = [];
        this.maxEntries = maxEntries;
    }

    async after(context: InterceptorContext): Promise<InterceptorResult> {
        const { operation, target, startTime, metadata } = context;
        const duration = Date.now() - startTime;

        const entry: AuditEntry = {
            id: this.generateId(),
            timestamp: new Date(),
            operation,
            target,
            userId: metadata?.userId,
            guildId: metadata?.guildId,
            success: true,
            duration,
            metadata,
        };

        this.addEntry(entry);

        return this.success();
    }

    async onError(context: InterceptorContext): Promise<InterceptorResult> {
        const { operation, target, startTime, error, metadata } = context;
        const duration = Date.now() - startTime;

        const entry: AuditEntry = {
            id: this.generateId(),
            timestamp: new Date(),
            operation,
            target,
            userId: metadata?.userId,
            guildId: metadata?.guildId,
            success: false,
            duration,
            error: error?.message || 'Unknown error',
            metadata,
        };

        this.addEntry(entry);

        return this.success();
    }

    /**
     * Add an entry to the audit log
     */
    private addEntry(entry: AuditEntry): void {
        this.auditLog.push(entry);

        // Keep only the last N entries
        if (this.auditLog.length > this.maxEntries) {
            this.auditLog.shift();
        }
    }

    /**
     * Generate a unique ID for an audit entry
     */
    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get audit entries with optional filters
     */
    public getEntries(filter?: {
        operation?: string;
        target?: string;
        userId?: string;
        guildId?: string;
        success?: boolean;
        since?: Date;
    }): AuditEntry[] {
        let entries = [...this.auditLog];

        if (filter) {
            if (filter.operation) {
                entries = entries.filter(e => e.operation === filter.operation);
            }
            if (filter.target) {
                entries = entries.filter(e => e.target === filter.target);
            }
            if (filter.userId) {
                entries = entries.filter(e => e.userId === filter.userId);
            }
            if (filter.guildId) {
                entries = entries.filter(e => e.guildId === filter.guildId);
            }
            if (filter.success !== undefined) {
                entries = entries.filter(e => e.success === filter.success);
            }
            if (filter.since) {
                const since = filter.since;
                entries = entries.filter(e => e.timestamp >= since);
            }
        }

        return entries;
    }

    /**
     * Get summary statistics
     */
    public getSummary(): {
        total: number;
        successful: number;
        failed: number;
        avgDuration: number;
        operations: Record<string, number>;
    } {
        const total = this.auditLog.length;
        const successful = this.auditLog.filter(e => e.success).length;
        const failed = total - successful;
        
        const totalDuration = this.auditLog.reduce((sum, e) => sum + e.duration, 0);
        const avgDuration = total > 0 ? totalDuration / total : 0;

        const operations: Record<string, number> = {};
        for (const entry of this.auditLog) {
            const key = `${entry.target}.${entry.operation}`;
            operations[key] = (operations[key] || 0) + 1;
        }

        return {
            total,
            successful,
            failed,
            avgDuration,
            operations,
        };
    }

    /**
     * Clear audit log
     */
    public clear(): void {
        this.auditLog = [];
        logger.debug('Audit log cleared');
    }

    /**
     * Export audit log to JSON
     */
    public export(): string {
        return JSON.stringify(this.auditLog, null, 2);
    }
}
