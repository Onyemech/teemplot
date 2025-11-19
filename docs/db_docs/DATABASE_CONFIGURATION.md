# Database Configuration Guide

## 🎯 Smart Database Detection

The system automatically detects and uses the appropriate database based on environment:

### Development Environment
- **Primary**: SQLite (local file)
- **Location**: `./data/teemplot.db`
- **Backup**: Convex (optional)
- **Benefits**: Fast, no setup, easy debugging

### Test Environment
- **Primary**: SQLite (in-memory)
- **Location**: `:memory:`
- **Backup**: None
- **Benefits**: Fast tests, automatic cleanup

### Production Environment
- **Primary**: PostgreSQL (Supabase)
- **Location**: Cloud (Supabase)
- **Backup**: Convex
- **Benefits**: Scalable, managed, reliable

## 📋 Configuration

### Environment Variables

```env
# Environment
NODE_ENV=development|test|production

# Force specific database (optional)
FORCE_DATABASE_TYPE=sqlite|postgres|convex

# SQLite (Development)
SQLITE_PATH=./data/teemplot.db

# PostgreSQL (Production)
DATABASE_URL=postgresql://user:pass@host:port/db
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Convex (Backup)
CONVEX_DEPLOYMENT_URL=https://xxx.convex.cloud
CONVEX_DEPLOY_KEY=xxx
```

### Automatic Detection Logic

```typescript
1. Check FORCE_DATABASE_TYPE (explicit override)
   ↓
2. Check NODE_ENV
   ├─ development/test → SQLite
   └─ production → PostgreSQL
   ↓
3. Check DATABASE_URL exists
   ├─ Yes → PostgreSQL
   └─ No → SQLite (fallback)
```

## 🔄 Database Sync Strategy

### Primary → Backup Sync

```typescript
// Automatic sync on write operations
await db.insert('users', userData);
// ↓ (non-blocking)
await backupDb.insert('users', userData);
```

### Sync Behavior
- **Non-blocking**: Backup failures don't affect primary operations
- **Async**: Happens in background
- **Logged**: All sync operations logged
- **Resilient**: Retries on failure

## 🏗️ Loose Coupling Architecture

### Interface-Based Design

```typescript
interface IDatabase {
  query(sql, params): Promise<Result>
  insert(table, data): Promise<Record>
  update(table, data, where): Promise<Record[]>
  delete(table, where): Promise<number>
  find(table, where, options): Promise<Record[]>
  findOne(table, where): Promise<Record | null>
  transaction(callback): Promise<any>
}
```

### Implementation Swapping

```typescript
// Development
const db = new SQLiteDatabase();

// Production
const db = new PostgresDatabase();

// Backup
const db = new ConvexDatabase();

// All use same interface!
```

## 📊 Database Comparison

| Feature | SQLite | PostgreSQL | Convex |
|---------|--------|------------|--------|
| **Setup** | None | Cloud account | Cloud account |
| **Speed** | Very fast | Fast | Fast |
| **Scalability** | Limited | Excellent | Excellent |
| **Concurrency** | Limited | Excellent | Excellent |
| **Cost** | Free | Free tier | Free tier |
| **Use Case** | Dev/Test | Production | Backup |

## 🚀 Quick Start

### Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Set environment
echo "NODE_ENV=development" > .env

# 3. Run (SQLite auto-created)
npm run dev
```

### Production Setup

```bash
# 1. Set environment
NODE_ENV=production
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...

# 2. Run migrations
npm run db:migrate

# 3. Start server
npm start
```

### Test Setup

```bash
# 1. Run tests (auto uses in-memory SQLite)
npm test

# 2. Run with coverage
npm run test:coverage
```

## 🔧 Migration Strategy

### SQLite → PostgreSQL Migration

```bash
# 1. Export from SQLite
sqlite3 data/teemplot.db .dump > backup.sql

# 2. Convert to PostgreSQL format
# (handle UUID, BOOLEAN, TIMESTAMP differences)

# 3. Import to PostgreSQL
psql $DATABASE_URL < backup.sql
```

### Automatic Sync

```typescript
// Enable continuous sync
ENABLE_CONVEX_SYNC=true

// System automatically syncs:
// SQLite/PostgreSQL → Convex
```

## 📝 Schema Management

### SQLite Schema
**Location**: `database/schema.sqlite.sql`

**Features**:
- TEXT for UUIDs
- INTEGER for booleans
- TEXT for JSON
- datetime() functions

### PostgreSQL Schema
**Location**: `database/schema.sql`

**Features**:
- UUID type
- BOOLEAN type
- JSONB type
- NOW() functions
- Partitioning
- Advanced indexes

### Schema Sync

```bash
# Generate SQLite schema from PostgreSQL
npm run schema:convert

# Apply schema to SQLite
npm run schema:apply:sqlite

# Apply schema to PostgreSQL
npm run schema:apply:postgres
```

## 🧪 Testing

### Unit Tests (SQLite in-memory)

```typescript
describe('RegistrationService', () => {
  // Automatically uses SQLite :memory:
  it('should register user', async () => {
    const result = await service.register(data);
    expect(result).toBeDefined();
  });
});
```

### Integration Tests (SQLite file)

```typescript
beforeAll(() => {
  process.env.SQLITE_PATH = './test.db';
});

afterAll(() => {
  fs.unlinkSync('./test.db');
});
```

### E2E Tests (PostgreSQL)

```typescript
beforeAll(() => {
  process.env.FORCE_DATABASE_TYPE = 'postgres';
  process.env.DATABASE_URL = TEST_DATABASE_URL;
});
```

## 🔍 Debugging

### Check Current Database

```typescript
const db = DatabaseFactory.getPrimaryDatabase();
console.log('Using:', db.getType()); // sqlite | postgres | convex
```

### Health Check

```typescript
const health = await DatabaseFactory.healthCheck();
console.log('Primary:', health.primary); // true/false
console.log('Backup:', health.backup); // true/false
console.log('Type:', health.type); // sqlite | postgres | convex
```

### Query Logging

```typescript
// Enable in development
LOG_LEVEL=debug

// Logs all queries
// [DEBUG] SQLite query: SELECT * FROM users WHERE id = ?
```

## 🛡️ Security

### SQLite Security
- ✅ File permissions (600)
- ✅ WAL mode for concurrency
- ✅ Foreign keys enabled
- ✅ Prepared statements

### PostgreSQL Security
- ✅ SSL/TLS encryption
- ✅ Row Level Security (RLS)
- ✅ Prepared statements
- ✅ Connection pooling

### Convex Security
- ✅ HTTPS only
- ✅ API key authentication
- ✅ Rate limiting
- ✅ Automatic backups

## 📞 Troubleshooting

### SQLite Issues

**Problem**: Database locked
```bash
# Solution: Enable WAL mode
sqlite3 data/teemplot.db "PRAGMA journal_mode=WAL;"
```

**Problem**: File not found
```bash
# Solution: Create data directory
mkdir -p data
```

### PostgreSQL Issues

**Problem**: Connection refused
```bash
# Solution: Check DATABASE_URL
echo $DATABASE_URL
psql $DATABASE_URL -c "SELECT 1"
```

**Problem**: SSL required
```bash
# Solution: Add SSL parameter
DATABASE_URL=postgresql://...?sslmode=require
```

### Convex Issues

**Problem**: Sync failing
```bash
# Solution: Check API key
echo $CONVEX_DEPLOY_KEY
# Verify deployment URL
curl $CONVEX_DEPLOYMENT_URL/health
```

## 🎯 Best Practices

### DO:
✅ Use SQLite for development
✅ Use PostgreSQL for production
✅ Enable Convex backup
✅ Test with in-memory SQLite
✅ Use transactions for multi-step operations
✅ Handle backup failures gracefully
✅ Log all database operations
✅ Monitor sync status

### DON'T:
❌ Use SQLite in production (limited concurrency)
❌ Commit database files to git
❌ Hardcode database type
❌ Skip migrations
❌ Ignore backup failures
❌ Mix database types in same environment
❌ Forget to close connections
❌ Skip health checks

---

**Last Updated**: November 16, 2024
**Version**: 1.0.0
**Status**: ✅ Production Ready

**The system is smart - it detects everything automatically!** 🚀
