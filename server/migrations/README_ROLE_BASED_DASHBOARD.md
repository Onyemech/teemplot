# Role-Based Dashboard System Migrations

## Overview

This directory contains database migrations for the enterprise-grade role-based dashboard system with tenant isolation, subscription management, and self-healing office location calibration.

## Migration Files

### 001_role_based_dashboard_schema.sql

**Purpose**: Creates the complete database schema for the role-based dashboard system

**Tables Created**:
- `company_settings` - Tenant-isolated settings for attendance, leave, and notifications
- `office_location_calibration` - Rolling buffer for self-healing office location
- `audit_logs` - Append-only audit trail of all critical actions
- `notifications` - User notifications for various events

**Tables Modified**:
- `companies` - Added subscription management columns (current_period_end, plan, employee_limit, add_on_seats, last_billing_event)
- `companies` - Added office location columns (office_latitude, office_longitude, office_location_updated_at)
- `employee_invitations` - Ensured all required columns exist with proper constraints

**Security Features**:
- Row-Level Security (RLS) policies on all tenant-scoped tables
- CHECK constraints for data validation
- Foreign key constraints for referential integrity
- Comprehensive indexes for performance

**Requirements Validated**: 1.6, 2.3, 11.5, 12.6, 15.1-15.7, 16.1-16.7

## How to Apply Migrations

### Using psql (PostgreSQL)

```bash
# Connect to your database
psql -U your_username -d your_database

# Apply the migration
\i server/migrations/001_role_based_dashboard_schema.sql

# Run the test script to verify
\i server/migrations/test_001_migration.sql
```

### Using Node.js Migration Tool

```javascript
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  const sql = fs.readFileSync('./server/migrations/001_role_based_dashboard_schema.sql', 'utf8');
  await pool.query(sql);
  console.log('Migration completed successfully');
}

runMigration();
```

### Using Supabase CLI

```bash
# If using Supabase
supabase db push --file server/migrations/001_role_based_dashboard_schema.sql
```

## Testing the Migration

Run the test script to verify everything is working:

```bash
psql -U your_username -d your_database -f server/migrations/test_001_migration.sql
```

The test script will:
1. Verify all tables exist
2. Check all columns were added
3. Verify CHECK constraints
4. Verify indexes were created
5. Verify RLS policies are enabled
6. Test sample data insertion
7. Verify foreign key relationships

## Rollback

If you need to rollback this migration:

```sql
BEGIN;

-- Drop RLS policies
DROP POLICY IF EXISTS company_settings_tenant_isolation ON company_settings;
DROP POLICY IF EXISTS calibration_tenant_isolation ON office_location_calibration;
DROP POLICY IF EXISTS audit_tenant_isolation ON audit_logs;
DROP POLICY IF EXISTS notifications_user_isolation ON notifications;
DROP POLICY IF EXISTS invitations_tenant_isolation ON employee_invitations;

-- Drop tables (in reverse order of dependencies)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS office_location_calibration CASCADE;
DROP TABLE IF EXISTS company_settings CASCADE;

-- Remove columns from companies table
ALTER TABLE companies DROP COLUMN IF EXISTS current_period_end;
ALTER TABLE companies DROP COLUMN IF EXISTS plan;
ALTER TABLE companies DROP COLUMN IF EXISTS employee_limit;
ALTER TABLE companies DROP COLUMN IF EXISTS add_on_seats;
ALTER TABLE companies DROP COLUMN IF EXISTS last_billing_event;
ALTER TABLE companies DROP COLUMN IF EXISTS office_latitude;
ALTER TABLE companies DROP COLUMN IF EXISTS office_longitude;
ALTER TABLE companies DROP COLUMN IF EXISTS office_location_updated_at;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

COMMIT;
```

## Database Schema Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         companies                            │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                                                      │
│ name, email, slug                                            │
│ current_period_end (subscription expiry)                     │
│ plan (free/silver/gold)                                      │
│ employee_limit (declared + add-on)                           │
│ add_on_seats (mid-cycle additions)                           │
│ last_billing_event (JSONB audit)                             │
│ office_latitude, office_longitude                            │
│ office_location_updated_at                                   │
└─────────────────────────────────────────────────────────────┘
                    │
                    │ (1:1)
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    company_settings                          │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                                                      │
│ company_id (FK, UNIQUE)                                      │
│ working_hours_start, working_hours_end                       │
│ working_days (array)                                         │
│ late_grace_period_minutes                                    │
│ geofence_radius_meters                                       │
│ overtime_multiplier                                          │
│ annual_leave_days                                            │
│ leave_approval_workflow                                      │
│ blackout_dates (array)                                       │
│ leave_types (JSONB)                                          │
│ notification_preferences (JSONB)                             │
│ RLS: company_id = current_tenant_id                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              office_location_calibration                     │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                                                      │
│ company_id (FK)                                              │
│ user_id (FK)                                                 │
│ latitude, longitude                                          │
│ gps_accuracy_meters (≤30m for calibration)                   │
│ clock_in_timestamp                                           │
│ RLS: company_id = current_tenant_id                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       audit_logs                             │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                                                      │
│ company_id (FK)                                              │
│ user_id (FK)                                                 │
│ action, entity_type, entity_id                               │
│ old_value, new_value (JSONB)                                 │
│ ip_address, user_agent                                       │
│ RLS: company_id = current_tenant_id (read-only)              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      notifications                           │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                                                      │
│ company_id (FK)                                              │
│ user_id (FK)                                                 │
│ type (attendance/task/leave/system/invitation/settings)      │
│ title, message, link                                         │
│ read (boolean)                                               │
│ RLS: company_id = current_tenant_id AND user_id = current_user_id │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  employee_invitations                        │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                                                      │
│ company_id (FK)                                              │
│ invited_by (FK)                                              │
│ email, first_name, last_name, role, position                 │
│ invitation_token (unique)                                    │
│ status (pending/accepted/expired)                            │
│ expires_at, accepted_at                                      │
│ RLS: company_id = current_tenant_id                          │
└─────────────────────────────────────────────────────────────┘
```

## Performance Considerations

### Indexes Created

- **Companies**: current_period_end, plan, expiring_soon (composite)
- **Employee Invitations**: company_id, token, status, company_status (composite), expires_at
- **Company Settings**: company_id
- **Office Location Calibration**: company_id, timestamp, accuracy, company_recent (composite)
- **Audit Logs**: company_id, user_id, created_at, action, entity (composite)
- **Notifications**: user_id, company_id, read, created_at, user_unread (composite)

### Query Optimization

All indexes are designed for common query patterns:
- Subscription expiry checks (≤14 days)
- Tenant-scoped data retrieval
- Recent activity queries
- Unread notification counts
- Office location calibration (last 30 clock-ins or 7 days)

## Security Features

### Row-Level Security (RLS)

All tenant-scoped tables have RLS policies that enforce:
- `company_id = current_setting('app.current_tenant_id')::UUID`
- `user_id = current_setting('app.current_user_id')::UUID` (for notifications)

### Setting Session Variables

Before executing queries, set the session variables:

```sql
-- Set tenant context
SET app.current_tenant_id = 'uuid-of-company';
SET app.current_user_id = 'uuid-of-user';

-- Now all queries are automatically filtered by RLS
SELECT * FROM company_settings; -- Only returns settings for current tenant
```

### CHECK Constraints

Data validation at the database level:
- Plan must be 'free', 'silver', or 'gold'
- Employee limits must be positive
- GPS coordinates must be valid ranges
- Notification types must be valid enum values

## Maintenance

### Analyzing Tables

After applying the migration, analyze tables for query optimization:

```sql
ANALYZE companies;
ANALYZE company_settings;
ANALYZE office_location_calibration;
ANALYZE audit_logs;
ANALYZE notifications;
ANALYZE employee_invitations;
```

### Monitoring

Monitor these metrics:
- Subscription expiry warnings (companies with current_period_end ≤ 14 days)
- Office location calibration buffer size (should be ~30 entries per company)
- Audit log growth rate
- Unread notification counts

## Troubleshooting

### RLS Policy Issues

If queries return no results, check session variables:

```sql
SHOW app.current_tenant_id;
SHOW app.current_user_id;
```

### Performance Issues

If queries are slow, check index usage:

```sql
EXPLAIN ANALYZE SELECT * FROM company_settings WHERE company_id = 'uuid';
```

### Constraint Violations

If inserts fail, check constraint definitions:

```sql
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public';
```

## Next Steps

After applying this migration:

1. ✅ Run the test script to verify everything works
2. ⏭️ Proceed to Task 1.1: Write property test for RLS policies
3. ⏭️ Continue with Phase 2: Backend Core Infrastructure

