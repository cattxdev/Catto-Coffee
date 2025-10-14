/**
 * @fileoverview Prisma Database Service
 * @author Catto Bot Team
 */

import { PrismaClient } from '../../generated/prisma';
import logger from '../utils/logger';


/**
 * Singleton Prisma Database Service
 * Provides a single instance of PrismaClient across the entire application
 */
class DatabaseService {
    private static instance: DatabaseService;
    private prisma: PrismaClient;
    private isConnected: boolean = false;

    private constructor() {
        this.prisma = new PrismaClient({
            log: ['info', 'warn', 'error'],
        });
    }

    /**
     * Get the singleton instance of DatabaseService
     */
    public static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    /**
     * Get the Prisma Client instance
     */
    public getClient(): PrismaClient {
        return this.prisma;
    }

    /**
     * Connect to the database
     */
    public async connect(): Promise<void> {
        if (this.isConnected) {
            logger.info('📦 Database already connected');
            return;
        }

        try {
            await this.prisma.$connect();
            this.isConnected = true;
            logger.info('📦 Database connected successfully');
        } catch (error) {
            logger.error('Failed to connect to database:', error);
            throw error;
        }
    }

    /**
     * Disconnect from the database
     */
    public async disconnect(): Promise<void> {
        if (!this.isConnected) {
            return;
        }

        try {
            await this.prisma.$disconnect();
            this.isConnected = false;
            logger.info('📦 Database disconnected successfully');
        } catch (error) {
            logger.error('Failed to disconnect from database:', error);
            throw error;
        }
    }

    /**
     * Check database connection health
     */
    public async healthCheck(): Promise<boolean> {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            return true;
        } catch (error) {
            logger.error('Database health check failed:', error);
            return false;
        }
    }

    /**
     * Get connection status
     */
    public get connected(): boolean {
        return this.isConnected;
    }
}

// Export singleton instance getter
export const database = DatabaseService.getInstance();

// Export the class for testing purposes
export { DatabaseService };

// Export PrismaClient type for type safety
export type { PrismaClient } from '../../generated/prisma';
