# Database Setup Guide - For AI Agents & Developers

## 🎯 IMPORTANT: Always Check Database First!

**Before making ANY changes, ALWAYS:**
1. Check existing tables: `mcp_supabase_list_tables`
2. Review schema: Read `server/database/schema.sql`
3. Check migrations: `mcp_supabase_list_migrations`
4. Verify structure matches documentation

## 📋 Database Structure Overview

### Core Tables (Multi-Tenant Architecture)

```
companies (root)
  ├── users (partitioned by company_id)
  ├── departments
  ├── attendance_records (partitioned by date)
  ├── tasks
  ├── performance_metrics
  ├── payment_transactions
  └── audit_logs (partitioned by date)

super_admins (separate, not multi-tenant)
```

### Table Relationships

```sql
companies (1) ──→ (many) users
companies (1) ──→ (many) departments
companies (1) ──→ (many) attendance_records
companies (1) ──→ (many) tasks
companies (1) ──→ (many) audit_logs

users (1) ──→ (many) attendance_records
users (1) ──→ (many) tasks (assigned_to)
users (many) ──→ (1) departments

tasks (1) ──→ (many) task_comments
```

## 🔍 How to Check Database Structure

### 1. List All Tables
```typescript
const tables = await mcp_supabase_list_tables({ schemas: ['public'] });
console.log('Existing tables:', tables);
```

### 2. Check Table Columns
```typescript
const query = `
  SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
  FROM information_schema.columns
  WHERE table_name = 'users'
  ORDER BY ordinal_position;
`;

const result = await mcp_supabase_execute_sql({ query });
```

### 3. Check Indexes
```typescript
const query = `
  SELECT 
    indexname,
    indexdef
  FROM pg_indexes
  WHERE tablename = 'users';
`;
```

### 4. Check Constraints
```typescript
const query = `
  SELECT 
    conname as constraint_name,
    contype as constraint_type
  FROM pg_constraint
  WHERE conrelid = 'users'::regclass;
`;
```

## 📊 Complete Table Definitions

### 1. companies
**Purpose**: Root table for multi-tenancy

**Key Columns**:
- `id` (UUID, PK) - Company identifier
- `slug` (VARCHAR, UNIQUE) - URL-friendly identifier
- `office_latitude`, `office_longitude` - For geofencing
- `geofence_radius_meters` - Attendance validation radius
- `working_days` (JSONB) - Mon-Sun configuration
- `work_start_time`, `work_end_time` (TIME) - Working hours
- `auto_clockin_enabled`, `auto_clockout_enabled` (BOOLEAN)
- `notify_early_departure` (BOOLEAN)
- `early_departure_threshold_minutes` (INTEGER)

**Indexes**:
- `idx_companies_slug` - Fast slug lookup
- `idx_companies_subscription_status` - Billing queries
- `idx_companies_settings` (GIN) - JSONB search

**Security**: RLS enabled, company isolation

### 2. users (Partitioned)
**Purpose**: Employee/admin accounts

**Partitioning**: Hash partitioned by `company_id` (8 partitions)

**Key Columns**:
- `id` (UUID, PK)
- `company_id` (UUID, FK → companies)
- `email` (VARCHAR) - UNIQUE per company
- `password_hash` (VARCHAR) - bcrypt, 12 rounds
- `role` (VARCHAR) - 'admin' or 'staff'
- `department_id` (UUID, FK → departments)
- `biometric_data` (JSONB) - For future biometric auth
- `last_login_at` (TIMESTAMPTZ) - Security tracking

**Indexes**:
- `idx_users_company_id` - Multi-tenant queries
- `idx_users_email` - Login lookup
- `idx_users_role` - Permission checks

**Security**: RLS enabled, company + role isolation

### 3. attendance_records (Partitioned)
**Purpose**: Clock-in/out tracking

**Partitioning**: Range partitioned by `created_at` (monthly)

**Key Columns**:
- `id` (UUID, PK)
- `company_id` (UUID, FK → companies)
- `user_id` (UUID, FK → users)
- `clock_in_time`, `clock_out_time` (TIMESTAMPTZ)
- `clock_in_location`, `clock_out_location` (JSONB) - GPS coords
- `clock_in_distance_meters` (DECIMAL) - Distance from office
- `is_within_geofence` (BOOLEAN) - Validation result
- `is_early_departure` (BOOLEAN) - Left early flag
- `early_departure_notified` (BOOLEAN) - Admin notified
- `status` (VARCHAR) - 'present', 'late', 'absent', 'early_departure'
- `total_hours` (DECIMAL) - Auto-calculated

**Indexes**:
- `idx_attendance_company_user` - User history
- `idx_attendance_status` - Status reports
- `idx_attendance_clock_in` - Time-based queries

**Triggers**:
- `calculate_attendance_hours_trigger` - Auto-calc total_hours

### 4. tasks
**Purpose**: Task management with review workflow

**Key Columns**:
- `id` (UUID, PK)
- `company_id` (UUID, FK → companies)
- `assigned_to`, `assigned_by` (UUID, FK → users)
- `status` (VARCHAR) - 'pending', 'in_progress', 'awaiting_review', 'approved', 'rejected'
- `review_status` (VARCHAR) - 'pending_review', 'approved', 'rejected'
- `marked_complete_at`, `marked_complete_by` - Staff completion
- `reviewed_at`, `reviewed_by` - Admin review
- `review_notes`, `rejection_reason` (TEXT) - Feedback
- `priority` (VARCHAR) - 'low', 'medium', 'high', 'urgent'
- `due_date` (TIMESTAMPTZ)
- `estimated_hours`, `actual_hours` (DECIMAL)

**Indexes**:
- `idx_tasks_company_id` - Company tasks
- `idx_tasks_assigned_to` - User tasks
- `idx_tasks_status` - Status filtering
- `idx_tasks_due_date` - Deadline tracking

### 5. notifications
**Purpose**: In-app notifications

**Key Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `company_id` (UUID, FK → companies)
- `type` (VARCHAR) - 'early_departure', 'geofence_violation', 'task_review'
- `title`, `body` (TEXT)
- `data` (JSONB) - Additional context
- `is_read` (BOOLEAN)
- `read_at` (TIMESTAMPTZ)

**Indexes**:
- `idx_notifications_user` - User notifications
- `idx_notifications_type` - Type filtering

### 6. audit_logs (Partitioned)
**Purpose**: Security and compliance tracking

**Partitioning**: Range partitioned by `created_at` (monthly)

**Key Columns**:
- `id` (UUID, PK)
- `company_id` (UUID, FK → companies)
- `user_id` (UUID, FK → users)
- `action` (VARCHAR) - 'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE'
- `entity_type`, `entity_id` - What was changed
- `changes` (JSONB) - Before/after values
- `ip_address` (INET) - Security tracking
- `user_agent` (TEXT) - Device info

**Indexes**:
- `idx_audit_company` - Company audit trail
- `idx_audit_user` - User activity
- `idx_audit_action` - Action filtering
- `idx_audit_entity` - Entity history

## 🔧 Database Functions

### 1. update_updated_at_column()
**Purpose**: Auto-update `updated_at` timestamp

**Usage**: Applied to all tables with `updated_at` column

```sql
CREATE TRIGGER update_users_updated_at 
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. calculate_attendance_hours()
**Purpose**: Auto-calculate total hours worked

**Logic**:
```sql
IF clock_out_time IS NOT NULL THEN
  total_hours = EXTRACT(EPOCH FROM (clock_out_time - clock_in_time)) / 3600
END IF
```

## 🛡️ Row Level Security (RLS)

### Enable RLS on All Tables
```sql
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
-- ... etc
```

### Example Policies

#### Company Isolation
```sql
CREATE POLICY company_isolation ON users
  FOR ALL
  USING (company_id = current_setting('app.current_company_id')::uuid);
```

#### Role-Based Access
```sql
-- Admins see all company data
CREATE POLICY admin_access ON users
  FOR ALL
  USING (
    company_id = current_setting('app.current_company_id')::uuid
    AND current_setting('app.user_role') = 'admin'
  );

-- Staff see only their own data
CREATE POLICY staff_access ON users
  FOR SELECT
  USING (
    company_id = current_setting('app.current_company_id')::uuid
    AND id = current_setting('app.user_id')::uuid
  );
```

## 📝 Migration Workflow

### 1. Check Current State
```typescript
// List existing tables
const tables = await mcp_supabase_list_tables({ schemas: ['public'] });

// List migrations
const migrations = await mcp_supabase_list_migrations();
```

### 2. Apply Migration
```typescript
await mcp_supabase_apply_migration({
  name: 'add_geofencing_columns',
  query: `
    ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS office_latitude DECIMAL(10, 8),
    ADD COLUMN IF NOT EXISTS office_longitude DECIMAL(11, 8);
  `
});
```

### 3. Verify Migration
```typescript
const result = await mcp_supabase_execute_sql({
  query: `
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'companies' 
    AND column_name IN ('office_latitude', 'office_longitude');
  `
});
```

## 🔍 Common Queries

### Check Table Exists
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'users'
);
```

### Check Column Exists
```sql
SELECT EXISTS (
  SELECT FROM information_schema.columns 
  WHERE table_name = 'companies' 
  AND column_name = 'office_latitude'
);
```

### Check Index Exists
```sql
SELECT EXISTS (
  SELECT FROM pg_indexes 
  WHERE tablename = 'users' 
  AND indexname = 'idx_users_email'
);
```

### Check Constraint Exists
```sql
SELECT EXISTS (
  SELECT FROM pg_constraint 
  WHERE conname = 'users_role_check'
);
```

## ⚠️ Important Notes for AI Agents

### DO:
✅ Always check existing structure first
✅ Use `IF NOT EXISTS` for safety
✅ Verify migrations before applying
✅ Test queries on small datasets
✅ Use transactions for multiple changes
✅ Document all schema changes
✅ Follow naming conventions
✅ Add indexes for foreign keys

### DON'T:
❌ Drop tables without backup
❌ Remove columns without checking usage
❌ Change data types without migration
❌ Forget to update indexes
❌ Skip RLS policies
❌ Hardcode company_id in queries
❌ Expose sensitive data in logs
❌ Make breaking changes without versioning

## 📚 Schema File Location

**Primary Schema**: `server/database/schema.sql`

**Always read this file before making changes!**

```typescript
// Example: Read schema before changes
const schemaContent = await readFile('server/database/schema.sql');
console.log('Current schema:', schemaContent);
```

## 🔄 Schema Update Process

1. **Read current schema**
2. **Check database state**
3. **Plan migration**
4. **Test migration locally**
5. **Apply to dev database**
6. **Verify changes**
7. **Update schema.sql**
8. **Document changes**
9. **Apply to production**
10. **Monitor for issues**

## 📞 Need Help?

**Check these files first:**
- `server/database/schema.sql` - Complete schema
- `SECURITY_COMPLIANCE.md` - Security policies
- `DATABASE_SETUP.md` - This file
- `FEATURES.md` - Feature documentation

**Then:**
- Review Supabase logs
- Check migration history
- Verify RLS policies
- Test queries manually

---

**Last Updated**: November 16, 2025
**Schema Version**: 2.0.0
**Status**: ✅ Production Ready

**Remember**: Database is the source of truth. Always verify before changing!
