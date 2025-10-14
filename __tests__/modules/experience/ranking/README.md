# Redis Ranking System Tests

Comprehensive test suite covering the Redis-based XP ranking system with hundreds of thousands of records.

## Test Files

### 1. `ranking-system.test.ts`
**Pure Redis Tests** - Tests the ExperienceRankingService in isolation

**Coverage:**
- ✅ Basic score operations (add, update, increment)
- ✅ Ranking queries (getUserRank, getTopUsers)
- ✅ Tied score handling
- ✅ **100,000 user dataset** - Performance benchmarks
- ✅ **250,000 user dataset** - Stress testing
- ✅ Batch operations (1000+ users at once)
- ✅ Context queries (getUsersAroundRank)
- ✅ Score range queries
- ✅ User removal and rank updates
- ✅ Multi-guild isolation
- ✅ Edge cases (special characters, long IDs, negative/decimal XP)
- ✅ Stress tests (concurrent updates)

**Test Count:** 50+ tests

### 2. `database-redis-integration.test.ts`
**Full Integration Tests** - Tests PostgreSQL ↔ Redis synchronization

**Coverage:**
- ✅ Single user sync
- ✅ 1000 user bulk sync
- ✅ Empty guild handling
- ✅ XP > 0 filtering
- ✅ Correct ranking order after sync
- ✅ Exact XP value matching
- ✅ Re-synchronization after database changes
- ✅ User removal from database
- ✅ Multi-guild independent sync

**Test Count:** 12+ tests

## Running Tests

### Run All Ranking Tests
```bash
npm test -- ranking
```

### Run Specific Test Suite
```bash
# Redis-only tests
npm test -- ranking-system.test.ts

# Integration tests
npm test -- database-redis-integration.test.ts
```

### Run with Coverage
```bash
npm test -- --coverage ranking
```

### Run Large Dataset Tests Only
```bash
npm test -- ranking-system.test.ts -t "Large Scale"
```

## Prerequisites

### 1. Redis Server
Tests require a running Redis instance:

```bash
# Using Docker
docker run -d -p 6379:6379 redis:latest

# Or local installation
redis-server
```

### 2. PostgreSQL Database
Integration tests require a test database:

```bash
# Set up test database
createdb catto-test

# Run migrations
npx prisma migrate deploy
```

### 3. Environment Variables
Create `.env.test`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/catto-test"
REDIS_URL="redis://localhost:6379"
```

## Test Performance Benchmarks

### Expected Performance (100K users)
- **Insert Time:** ~10-15 seconds
- **Rank Lookup:** < 50ms
- **Top 10 Query:** < 50ms
- **Throughput:** ~10,000 users/second

### Expected Performance (250K users)
- **Insert Time:** ~30-40 seconds
- **Rank Lookup:** < 50ms  
- **Top 10 Query:** < 50ms
- **Throughput:** ~6,000-8,000 users/second

## Test Structure

```
__tests__/modules/experience/ranking/
├── ranking-system.test.ts              # Redis-only tests
├── database-redis-integration.test.ts  # Full integration tests
└── README.md                           # This file
```

## What Each Test Does

### Basic Operations Tests
- Validates core Redis ZSET operations
- Tests score updates, increments, and retrievals
- Handles edge cases like 0 XP and billions of XP

### Ranking Query Tests
- Tests rank calculation for 1st, middle, and last positions
- Validates leaderboard pagination
- Tests total ranked user counts

### Large Scale Tests
```typescript
test('should handle 100,000 users efficiently', async () => {
  // Adds 100K users in batches
  // Verifies O(log N) performance
  // Benchmarks: rank lookup < 50ms
});
```

### Integration Tests
```typescript
test('should sync 1000 users from database to Redis', async () => {
  // Creates 1000 users in PostgreSQL
  // Syncs to Redis
  // Validates correctness and order
});
```

## Debugging Failed Tests

### Redis Connection Issues
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Check Redis has no errors
redis-cli INFO server
```

### Database Connection Issues
```bash
# Test database connection
npx prisma db push

# Check migrations
npx prisma migrate status
```

### Memory Issues (Large Datasets)
```bash
# Increase Node.js memory
node --max-old-space-size=4096 node_modules/.bin/jest ranking
```

## Continuous Integration

Tests are designed to run in CI environments:

```yaml
# .github/workflows/test.yml
- name: Start Redis
  run: docker run -d -p 6379:6379 redis:latest

- name: Run Ranking Tests
  run: npm test -- ranking --maxWorkers=2
```

## Coverage Goals

Target coverage for ranking system:
- **Statements:** > 90%
- **Branches:** > 85%
- **Functions:** > 90%
- **Lines:** > 90%

## Common Test Patterns

### Setup/Teardown
```typescript
beforeEach(async () => {
  // Clear test data
  await rankingService.clearLeaderboard(testGuildId);
});

afterEach(async () => {
  // Clean up
  await rankingService.clearLeaderboard(testGuildId);
});
```

### Performance Measurement
```typescript
const startTime = Date.now();
await operation();
const duration = Date.now() - startTime;
expect(duration).toBeLessThan(50); // Assert performance
```

### Batch Data Creation
```typescript
const users = Array.from({ length: 1000 }, (_, i) => ({
  userId: `user${i}`,
  totalXp: i * 100,
}));
await rankingService.batchUpdateScores(guildId, users);
```

## Contributing

When adding new tests:
1. Follow existing patterns (beforeEach/afterEach cleanup)
2. Add descriptive test names
3. Include performance assertions for large datasets
4. Clean up test data in afterEach
5. Group related tests in describe blocks

## Troubleshooting

**Test timeout errors:**
- Increase timeout: `test('name', async () => { ... }, 60000);`
- Check Redis/DB connections

**Flaky tests:**
- Ensure proper cleanup in afterEach
- Use unique test data IDs (timestamps)

**Memory leaks:**
- Check for unclosed connections
- Verify afterAll disconnects services

## Related Documentation

- [Redis Ranking System Overview](../../../../docs/REDIS_RANKING_SYSTEM.md)
- [Experience System Architecture](../../../../docs/EXPERIENCE_SYSTEM.md)
- [Jest Configuration](../../../../jest.config.js)
