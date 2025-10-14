/**
 * @fileoverview Redis Cache Service
 * @author Catto Bot Team
 */

import Redis, { RedisOptions } from 'ioredis';
import logger from '../utils/logger';

/**
 * Singleton Redis Cache Service
 * Provides a single instance of Redis client across the entire application
 */
class RedisService {
    private static instance: RedisService;
    private redis: Redis;
    private isConnected: boolean = false;

    private constructor() {
        // Use URL if provided, otherwise fall back to individual options
        const redisUrl = process.env.REDIS_URL;
        
        if (redisUrl) {
            // Use URL connection
            const redisOptions: RedisOptions = {
                retryStrategy: (times: number) => {
                    const delay = Math.min(times * 50, 2000);
                    logger.warn(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
                    return delay;
                },
                maxRetriesPerRequest: 3,
                enableReadyCheck: true,
                lazyConnect: true,
            };
            
            this.redis = new Redis(redisUrl, redisOptions);
        } else {
            // Fall back to individual options
            const redisOptions: RedisOptions = {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD || undefined,
                db: parseInt(process.env.REDIS_DB || '0'),
                retryStrategy: (times: number) => {
                    const delay = Math.min(times * 50, 2000);
                    logger.warn(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
                    return delay;
                },
                maxRetriesPerRequest: 3,
                enableReadyCheck: true,
                lazyConnect: true,
            };

            this.redis = new Redis(redisOptions);
        }

        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Get the singleton instance of RedisService
     */
    public static getInstance(): RedisService {
        if (!RedisService.instance) {
            RedisService.instance = new RedisService();
        }
        return RedisService.instance;
    }

    /**
     * Setup Redis event listeners for logging
     */
    private setupEventListeners(): void {
        this.redis.on('connect', () => {
            logger.info('🔄 Redis: Connecting...');
        });

        this.redis.on('ready', () => {
            this.isConnected = true;
            logger.success('✅ Redis: Connected and ready');
        });

        this.redis.on('error', (error) => {
            logger.error(`❌ Redis Error: ${error.message}`);
        });

        this.redis.on('close', () => {
            this.isConnected = false;
            logger.warn('⚠️  Redis: Connection closed');
        });

        this.redis.on('reconnecting', () => {
            logger.info('🔄 Redis: Reconnecting...');
        });

        this.redis.on('end', () => {
            this.isConnected = false;
            logger.info('🔌 Redis: Connection ended');
        });
    }

    /**
     * Get the Redis client instance
     */
    public getClient(): Redis {
        return this.redis;
    }

    /**
     * Connect to Redis
     */
    public async connect(): Promise<void> {
        if (this.isConnected) {
            logger.warn('Redis is already connected');
            return;
        }

        try {
            await this.redis.connect();
            logger.success('Redis connection established successfully');
        } catch (error) {
            logger.error('Failed to connect to Redis:', error);
            throw error;
        }
    }

    /**
     * Disconnect from Redis
     */
    public async disconnect(): Promise<void> {
        if (!this.isConnected) {
            logger.warn('Redis is not connected');
            return;
        }

        try {
            await this.redis.quit();
            logger.info('Redis disconnected successfully');
        } catch (error) {
            logger.error('Error disconnecting from Redis:', error);
            // Force disconnect if quit fails
            this.redis.disconnect();
        }
    }

    /**
     * Check if Redis is connected and healthy
     */
    public async healthCheck(): Promise<boolean> {
        try {
            const result = await this.redis.ping();
            return result === 'PONG';
        } catch (error) {
            logger.error('Redis health check failed:', error);
            return false;
        }
    }

    /**
     * Ping Redis server
     */
    public async ping(): Promise<string> {
        return await this.redis.ping();
    }

    /**
     * Get database size (number of keys)
     */
    public async dbsize(): Promise<number> {
        return await this.redis.dbsize();
    }

    /**
     * Get Redis server info
     * @param section - Info section to retrieve (optional)
     */
    public async info(section?: string): Promise<string> {
        if (section) {
            return await this.redis.info(section);
        }
        return await this.redis.info();
    }

    /**
     * Get connection status
     */
    public isReady(): boolean {
        return this.isConnected && this.redis.status === 'ready';
    }

    // ============================================================================
    // CONVENIENCE METHODS
    // ============================================================================

    /**
     * Set a key with optional expiration
     * @param key - The key to set
     * @param value - The value to set (will be JSON stringified if object)
     * @param ttl - Time to live in seconds (optional)
     */
    public async set(key: string, value: any, ttl?: number): Promise<void> {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        
        if (ttl) {
            await this.redis.setex(key, ttl, stringValue);
        } else {
            await this.redis.set(key, stringValue);
        }
    }

    /**
     * Get a value by key
     * @param key - The key to get
     * @param parse - Whether to JSON parse the value (default: true)
     */
    public async get<T = any>(key: string, parse = true): Promise<T | null> {
        const value = await this.redis.get(key);
        
        if (value === null) {
            return null;
        }

        if (parse) {
            try {
                return JSON.parse(value) as T;
            } catch {
                return value as T;
            }
        }

        return value as T;
    }

    /**
     * Delete a key
     * @param key - The key to delete
     */
    public async del(key: string): Promise<number> {
        return await this.redis.del(key);
    }

    /**
     * Delete multiple keys
     * @param keys - The keys to delete
     */
    public async delMany(keys: string[]): Promise<number> {
        if (keys.length === 0) return 0;
        return await this.redis.del(...keys);
    }

    /**
     * Check if a key exists
     * @param key - The key to check
     */
    public async exists(key: string): Promise<boolean> {
        const result = await this.redis.exists(key);
        return result === 1;
    }

    /**
     * Set expiration on a key
     * @param key - The key to expire
     * @param seconds - Time to live in seconds
     */
    public async expire(key: string, seconds: number): Promise<boolean> {
        const result = await this.redis.expire(key, seconds);
        return result === 1;
    }

    /**
     * Get time to live for a key
     * @param key - The key to check
     * @returns TTL in seconds, -1 if key has no expiry, -2 if key doesn't exist
     */
    public async ttl(key: string): Promise<number> {
        return await this.redis.ttl(key);
    }

    /**
     * Increment a value
     * @param key - The key to increment
     * @param amount - Amount to increment by (default: 1)
     */
    public async incr(key: string, amount = 1): Promise<number> {
        if (amount === 1) {
            return await this.redis.incr(key);
        }
        return await this.redis.incrby(key, amount);
    }

    /**
     * Decrement a value
     * @param key - The key to decrement
     * @param amount - Amount to decrement by (default: 1)
     */
    public async decr(key: string, amount = 1): Promise<number> {
        if (amount === 1) {
            return await this.redis.decr(key);
        }
        return await this.redis.decrby(key, amount);
    }

    /**
     * Get all keys matching a pattern
     * @param pattern - The pattern to match (e.g., "user:*")
     */
    public async keys(pattern: string): Promise<string[]> {
        return await this.redis.keys(pattern);
    }

    /**
     * Flush all data from current database
     * WARNING: This will delete ALL data in the current Redis database
     */
    public async flushDb(): Promise<void> {
        await this.redis.flushdb();
        logger.warn('⚠️  Redis: Database flushed');
    }

    /**
     * Hash set - set field in hash
     * @param key - The hash key
     * @param field - The field name
     * @param value - The value to set
     */
    public async hset(key: string, field: string, value: any): Promise<number> {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        return await this.redis.hset(key, field, stringValue);
    }

    /**
     * Hash get - get field from hash
     * @param key - The hash key
     * @param field - The field name
     * @param parse - Whether to JSON parse the value
     */
    public async hget<T = any>(key: string, field: string, parse = true): Promise<T | null> {
        const value = await this.redis.hget(key, field);
        
        if (value === null) {
            return null;
        }

        if (parse) {
            try {
                return JSON.parse(value) as T;
            } catch {
                return value as T;
            }
        }

        return value as T;
    }

    /**
     * Hash get all - get all fields and values from hash
     * @param key - The hash key
     * @param parse - Whether to JSON parse the values
     */
    public async hgetall<T = Record<string, any>>(key: string, parse = true): Promise<T | null> {
        const data = await this.redis.hgetall(key);
        
        if (!data || Object.keys(data).length === 0) {
            return null;
        }

        if (parse) {
            const parsed: Record<string, any> = {};
            for (const [field, value] of Object.entries(data)) {
                try {
                    parsed[field] = JSON.parse(value);
                } catch {
                    parsed[field] = value;
                }
            }
            return parsed as T;
        }

        return data as T;
    }

    /**
     * Hash delete - delete field from hash
     * @param key - The hash key
     * @param field - The field name
     */
    public async hdel(key: string, field: string): Promise<number> {
        return await this.redis.hdel(key, field);
    }

    /**
     * List push - add to end of list
     * @param key - The list key
     * @param value - The value to push
     */
    public async lpush(key: string, value: any): Promise<number> {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        return await this.redis.lpush(key, stringValue);
    }

    /**
     * List pop - remove from end of list
     * @param key - The list key
     * @param parse - Whether to JSON parse the value
     */
    public async lpop<T = any>(key: string, parse = true): Promise<T | null> {
        const value = await this.redis.lpop(key);
        
        if (value === null) {
            return null;
        }

        if (parse) {
            try {
                return JSON.parse(value) as T;
            } catch {
                return value as T;
            }
        }

        return value as T;
    }

    /**
     * Set add - add member to set
     * @param key - The set key
     * @param member - The member to add
     */
    public async sadd(key: string, member: string): Promise<number> {
        return await this.redis.sadd(key, member);
    }

    /**
     * Set members - get all members of set
     * @param key - The set key
     */
    public async smembers(key: string): Promise<string[]> {
        return await this.redis.smembers(key);
    }

    /**
     * Set is member - check if member exists in set
     * @param key - The set key
     * @param member - The member to check
     */
    public async sismember(key: string, member: string): Promise<boolean> {
        const result = await this.redis.sismember(key, member);
        return result === 1;
    }

    /**
     * Set remove - remove member from set
     * @param key - The set key
     * @param member - The member to remove
     */
    public async srem(key: string, member: string): Promise<number> {
        return await this.redis.srem(key, member);
    }
}

// Export singleton instance
export const redis = RedisService.getInstance();
export default RedisService;
