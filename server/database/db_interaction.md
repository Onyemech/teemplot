# Database Interaction Guide

This document provides guidelines for interacting with the Teemplot database using Supabase MCP.

## Supabase MCP Tools Available

The Supabase MCP server provides direct access to:
- Execute SQL queries
- Create/modify tables
- Insert/update/delete data
- Manage database schema

## Database Schema Overview

### Core Tables
1. **super_admins** - Platform administrators
2. **companies** - Multi-tenant company accounts
3. **users** - Company employees (partitioned by company_id)
4. **departments** - Organizational units
5. **attendance_records** - Time tracking (partitioned by date)
6. **tasks** - Task management
7. **performance_metrics** - Aggregated performance data
8. **payment_transactions** - Payment history
9. **subscription_plans** - Available plans
10. **audit_logs** - System audit trail (partitioned by date)

### Supporting Tables
- **refresh_tokens** - Authentication tokens
- **email_verification_codes** - Email verification
- **invitations** - Employee invitations
- **task_comments** - Task discussions

## Common Operations

### 1. Initialize Database
Run the complete schema from `schema.sql`

### 2. Create Super Admin
```sql
INSERT INTO super_admins (email, password_hash, first_name, last_name, is_active, email_verified)
VALUES ('admin@teemplot.com', '$2b$12$...', 'Super', 'Admin', true, true);
```

### 3. Create Company
```sql
INSERT INTO companies (name, slug, email, subscription_plan, subscription_status, is_active)
VALUES ('Demo Company', 'demo-company', 'demo@company.com', 'trial', 'active', true);
```

### 4. Create Admin User
```sql
INSERT INTO users (company_id, email, password_hash, first_name, last_name, role, is_active)
VALUES ('company-uuid', 'admin@demo.com', '$2b$12$...', 'John', 'Doe', 'admin', true);
```

### 5. Query Performance
```sql
-- Get company statistics
SELECT * FROM company_dashboard_stats WHERE company_id = 'uuid';

-- Get user attendance stats
SELECT * FROM attendance_records 
WHERE user_id = 'uuid' 
AND clock_in_time >= NOW() - INTERVAL '30 days'
ORDER BY clock_in_time DESC;
```

## Maintenance Queries

### Create New Attendance Partition (Monthly)
```sql
CREATE TABLE IF NOT EXISTS attendance_records_2025_07 PARTITION OF attendance_records
FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
```

### Create New Audit Log Partition
```sql
CREATE TABLE IF NOT EXISTS audit_logs_2025_07 PARTITION OF audit_logs
FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
```

### Refresh Materialized View
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY company_dashboard_stats;
```

## Performance Monitoring

### Check Table Sizes
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Check Index Usage
```sql
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Check Partition Info
```sql
SELECT 
    parent.relname AS parent_table,
    child.relname AS partition_name,
    pg_get_expr(child.relpartbound, child.oid) AS partition_expression
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname IN ('users', 'attendance_records', 'audit_logs')
ORDER BY parent.relname, child.relname;
```

## Best Practices

1. **Always use transactions** for multi-step operations
2. **Use prepared statements** to prevent SQL injection
3. **Monitor partition growth** and create new partitions proactively
4. **Refresh materialized views** regularly (e.g., hourly/daily)
5. **Backup before major schema changes**
6. **Use indexes wisely** - monitor and adjust based on query patterns
7. **Test queries** on development before production
8. **Use EXPLAIN ANALYZE** to optimize slow queries

## Emergency Procedures

### Rollback Migration
```sql
BEGIN;
-- Your rollback SQL here
-- Test thoroughly
ROLLBACK; -- or COMMIT when ready
```

### Disable User
```sql
UPDATE users SET is_active = false WHERE id = 'user-uuid';
```

### Suspend Company
```sql
UPDATE companies SET is_active = false, subscription_status = 'inactive' 
WHERE id = 'company-uuid';
```

## MCP Direct Execution

Use the Supabase MCP tools to execute any SQL directly against the database.
This provides full database control for setup, maintenance, and operations.
