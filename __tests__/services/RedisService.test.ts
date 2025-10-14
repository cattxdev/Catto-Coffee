/**
 * @fileoverview Tests for Redis Service
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import RedisService, { redis } from '../../src/services/RedisService';

describe('RedisService', () => {
    beforeAll(async () => {
        // Connect to Redis before tests
        try {
            await redis.connect();
        } catch (error) {
            console.warn('Redis not available for tests, skipping Redis tests');
        }
    });

    afterAll(async () => {
        // Clean up and disconnect after tests
        try {
            await redis.flushDb();
            await redis.disconnect();
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    beforeEach(async () => {
        // Clear test keys before each test
        try {
            const testKeys = await redis.keys('test:*');
            if (testKeys.length > 0) {
                await redis.delMany(testKeys);
            }
        } catch (error) {
            // Ignore if Redis not available
        }
    });

    describe('Singleton Pattern', () => {
        it('should return the same instance', () => {
            const instance1 = RedisService.getInstance();
            const instance2 = RedisService.getInstance();
            expect(instance1).toBe(instance2);
        });

        it('should expose redis singleton', () => {
            expect(redis).toBeDefined();
            expect(redis).toBeInstanceOf(RedisService);
        });
    });

    describe('Connection Management', () => {
        it('should have getClient method', () => {
            expect(redis.getClient).toBeDefined();
            expect(typeof redis.getClient).toBe('function');
        });

        it('should check connection status', () => {
            const status = redis.isReady();
            expect(typeof status).toBe('boolean');
        });

        it('should perform health check', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping health check - Redis not connected');
                return;
            }

            const isHealthy = await redis.healthCheck();
            expect(isHealthy).toBe(true);
        });

        it('should ping Redis', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping ping - Redis not connected');
                return;
            }

            const result = await redis.ping();
            expect(result).toBe('PONG');
        });
    });

    describe('Basic Key-Value Operations', () => {
        it('should set and get string value', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping test - Redis not connected');
                return;
            }

            await redis.set('test:string', 'hello world');
            const value = await redis.get<string>('test:string', false);
            expect(value).toBe('hello world');
        });

        it('should set and get object value', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping test - Redis not connected');
                return;
            }

            const testObj = { name: 'Test', value: 123 };
            await redis.set('test:object', testObj);
            const retrieved = await redis.get<typeof testObj>('test:object');
            expect(retrieved).toEqual(testObj);
        });

        it('should set with TTL and expire', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping test - Redis not connected');
                return;
            }

            await redis.set('test:ttl', 'expire soon', 2);
            
            // Should exist immediately
            const exists = await redis.exists('test:ttl');
            expect(exists).toBe(true);

            // Check TTL
            const ttl = await redis.ttl('test:ttl');
            expect(ttl).toBeGreaterThan(0);
            expect(ttl).toBeLessThanOrEqual(2);
        });

        it('should return null for non-existent key', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping test - Redis not connected');
                return;
            }

            const value = await redis.get('test:nonexistent');
            expect(value).toBeNull();
        });

        it('should delete key', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping test - Redis not connected');
                return;
            }

            await redis.set('test:delete', 'to be deleted');
            const deleted = await redis.del('test:delete');
            expect(deleted).toBe(1);

            const exists = await redis.exists('test:delete');
            expect(exists).toBe(false);
        });

        it('should delete multiple keys', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping test - Redis not connected');
                return;
            }

            await redis.set('test:multi1', 'value1');
            await redis.set('test:multi2', 'value2');
            await redis.set('test:multi3', 'value3');

            const deleted = await redis.delMany(['test:multi1', 'test:multi2', 'test:multi3']);
            expect(deleted).toBe(3);
        });

        it('should check if key exists', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping test - Redis not connected');
                return;
            }

            await redis.set('test:exists', 'exists');
            const exists = await redis.exists('test:exists');
            expect(exists).toBe(true);

            const notExists = await redis.exists('test:notexists');
            expect(notExists).toBe(false);
        });

        it('should set expiration on existing key', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping test - Redis not connected');
                return;
            }

            await redis.set('test:expire', 'value');
            const result = await redis.expire('test:expire', 10);
            expect(result).toBe(true);

            const ttl = await redis.ttl('test:expire');
            expect(ttl).toBeGreaterThan(0);
        });
    });

    describe('Numeric Operations', () => {
        it('should increment value', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping test - Redis not connected');
                return;
            }

            const result1 = await redis.incr('test:counter');
            expect(result1).toBe(1);

            const result2 = await redis.incr('test:counter');
            expect(result2).toBe(2);
        });

        it('should increment by amount', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping test - Redis not connected');
                return;
            }

            const result = await redis.incr('test:counter2', 5);
            expect(result).toBe(5);

            const result2 = await redis.incr('test:counter2', 3);
            expect(result2).toBe(8);
        });

        it('should decrement value', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping test - Redis not connected');
                return;
            }

            await redis.set('test:decr', '10');
            const result1 = await redis.decr('test:decr');
            expect(result1).toBe(9);

            const result2 = await redis.decr('test:decr', 3);
            expect(result2).toBe(6);
        });
    });

    describe('Hash Operations', () => {
        it('should set and get hash field', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping test - Redis not connected');
                return;
            }

            await redis.hset('test:hash', 'field1', 'value1');
            const value = await redis.hget<string>('test:hash', 'field1', false);
            expect(value).toBe('value1');
        });

        it('should set and get hash field with object', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping test - Redis not connected');
                return;
            }

            const obj = { name: 'Test', count: 42 };
            await redis.hset('test:hash2', 'data', obj);
            const retrieved = await redis.hget<typeof obj>('test:hash2', 'data');
            expect(retrieved).toEqual(obj);
        });

        it('should get all hash fields', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping test - Redis not connected');
                return;
            }

            await redis.hset('test:hash3', 'field1', 'value1');
            await redis.hset('test:hash3', 'field2', { data: 'value2' });

            const all = await redis.hgetall('test:hash3');
            expect(all).toBeDefined();
            expect(all?.field1).toBe('value1');
            expect(all?.field2).toEqual({ data: 'value2' });
        });

        it('should delete hash field', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping test - Redis not connected');
                return;
            }

            await redis.hset('test:hash4', 'field', 'value');
            const deleted = await redis.hdel('test:hash4', 'field');
            expect(deleted).toBe(1);

            const value = await redis.hget('test:hash4', 'field');
            expect(value).toBeNull();
        });
    });

    describe('List Operations', () => {
        it('should push to list', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping test - Redis not connected');
                return;
            }

            const length = await redis.lpush('test:list', 'item1');
            expect(length).toBeGreaterThan(0);
        });

        it('should pop from list', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping test - Redis not connected');
                return;
            }

            await redis.lpush('test:list2', 'item1');
            const value = await redis.lpop<string>('test:list2', false);
            expect(value).toBe('item1');
        });

        it('should return null when popping empty list', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping test - Redis not connected');
                return;
            }

            const value = await redis.lpop('test:emptylist');
            expect(value).toBeNull();
        });
    });

    describe('Set Operations', () => {
        it('should add member to set', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping test - Redis not connected');
                return;
            }

            const added = await redis.sadd('test:set', 'member1');
            expect(added).toBe(1);
        });

        it('should get all set members', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping test - Redis not connected');
                return;
            }

            await redis.sadd('test:set2', 'member1');
            await redis.sadd('test:set2', 'member2');

            const members = await redis.smembers('test:set2');
            expect(members).toHaveLength(2);
            expect(members).toContain('member1');
            expect(members).toContain('member2');
        });

        it('should check if member exists in set', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping test - Redis not connected');
                return;
            }

            await redis.sadd('test:set3', 'member1');

            const exists = await redis.sismember('test:set3', 'member1');
            expect(exists).toBe(true);

            const notExists = await redis.sismember('test:set3', 'member2');
            expect(notExists).toBe(false);
        });

        it('should remove member from set', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping test - Redis not connected');
                return;
            }

            await redis.sadd('test:set4', 'member1');
            const removed = await redis.srem('test:set4', 'member1');
            expect(removed).toBe(1);

            const exists = await redis.sismember('test:set4', 'member1');
            expect(exists).toBe(false);
        });
    });

    describe('Pattern Matching', () => {
        it('should find keys by pattern', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping test - Redis not connected');
                return;
            }

            await redis.set('test:pattern:1', 'value1');
            await redis.set('test:pattern:2', 'value2');
            await redis.set('test:other', 'value3');

            const keys = await redis.keys('test:pattern:*');
            expect(keys).toHaveLength(2);
            expect(keys).toContain('test:pattern:1');
            expect(keys).toContain('test:pattern:2');
        });
    });

    describe('Database Info', () => {
        it('should get database size', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping test - Redis not connected');
                return;
            }

            const size = await redis.dbsize();
            expect(typeof size).toBe('number');
            expect(size).toBeGreaterThanOrEqual(0);
        });

        it('should get server info', async () => {
            if (!redis.isReady()) {
                console.warn('Skipping test - Redis not connected');
                return;
            }

            const info = await redis.info('server');
            expect(typeof info).toBe('string');
            expect(info.length).toBeGreaterThan(0);
        });
    });
});
