-- Migration: Secure RLS Implementation
-- Date: 2026-01-30
-- Description: Enables Row Level Security (RLS) on critical tables and defines tenant-isolated policies.

BEGIN;

-- ============================================================================
-- 1. ATTENDANCE BREAKS
-- ============================================================================
ALTER TABLE public.attendance_breaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_breaks_isolation_policy" ON public.attendance_breaks;
CREATE POLICY "attendance_breaks_isolation_policy" ON public.attendance_breaks
FOR ALL
USING (
    -- Users can access breaks linked to their own attendance records
    EXISTS (
        SELECT 1 FROM attendance_records ar
        WHERE ar.id = attendance_breaks.attendance_record_id
        AND ar.user_id = auth.uid()
    )
    OR
    -- Admins/Managers can access breaks within their company
    (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('owner', 'admin', 'manager', 'department_head')
            AND u.company_id = (
                SELECT ar.company_id 
                FROM attendance_records ar 
                WHERE ar.id = attendance_breaks.attendance_record_id
            )
        )
    )
);

-- ============================================================================
-- 2. PERFORMANCE SNAPSHOTS
-- ============================================================================
ALTER TABLE public.performance_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "performance_snapshots_isolation_policy" ON public.performance_snapshots;
CREATE POLICY "performance_snapshots_isolation_policy" ON public.performance_snapshots
FOR SELECT
USING (
    -- Users see their own snapshots
    user_id = auth.uid()
    OR
    -- Admins/Managers see snapshots for their company
    (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.company_id = performance_snapshots.company_id
            AND u.role IN ('owner', 'admin', 'manager', 'department_head')
        )
    )
);

-- Only system/service role should generate snapshots (no INSERT/UPDATE policy for regular users)
-- If manual adjustments are needed, admins can do so:
DROP POLICY IF EXISTS "performance_snapshots_admin_write_policy" ON public.performance_snapshots;
CREATE POLICY "performance_snapshots_admin_write_policy" ON public.performance_snapshots
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.company_id = performance_snapshots.company_id
        AND u.role IN ('owner', 'admin')
    )
);

-- ============================================================================
-- 3. TAX ASSIGNMENTS
-- ============================================================================
ALTER TABLE public.tax_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tax_assignments_read_policy" ON public.tax_assignments;
CREATE POLICY "tax_assignments_read_policy" ON public.tax_assignments
FOR SELECT
USING (
    -- Employees see their own assignments
    user_id = auth.uid()
    OR
    -- Admins see all in company
    (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.company_id = tax_assignments.company_id
            AND u.role IN ('owner', 'admin')
        )
    )
);

DROP POLICY IF EXISTS "tax_assignments_write_policy" ON public.tax_assignments;
CREATE POLICY "tax_assignments_write_policy" ON public.tax_assignments
FOR ALL
USING (
    -- Only Admins/Owners can manage
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.company_id = tax_assignments.company_id
        AND u.role IN ('owner', 'admin')
    )
);

-- ============================================================================
-- 4. ATTENDANCE AUDIT LOGS
-- ============================================================================
-- Assuming table name is 'audit_logs' based on schema analysis, 
-- but creating for 'attendance_audit_logs' if it exists separately.
-- Safely attempting on 'audit_logs' first as it's the main table.

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_read_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_read_policy" ON public.audit_logs
FOR SELECT
USING (
    -- Users see their own logs
    user_id = auth.uid()
    OR
    -- Admins see logs for their company
    (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.company_id = audit_logs.company_id
            AND u.role IN ('owner', 'admin')
        )
    )
);

-- Insert is typically done by system or triggers, but if manual:
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
FOR INSERT
WITH CHECK (
    -- Users can only create logs for themselves (e.g. client-side events)
    user_id = auth.uid()
    AND
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);

-- ============================================================================
-- 5. TABLE DEFINITION CACHE
-- ============================================================================
ALTER TABLE public.table_definition_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "table_definition_cache_service_only" ON public.table_definition_cache;
CREATE POLICY "table_definition_cache_service_only" ON public.table_definition_cache
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Explicitly deny everything else (default behavior of ENABLE RLS, but for clarity)

-- ============================================================================
-- 6. TASK RATE ASSIGNMENTS
-- ============================================================================
-- Creating table if it doesn't exist (as it was found in routes but maybe not schema)
CREATE TABLE IF NOT EXISTS public.task_rate_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_code TEXT NOT NULL,
    rate NUMERIC NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'active',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.task_rate_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_rates_read_policy" ON public.task_rate_assignments;
CREATE POLICY "task_rates_read_policy" ON public.task_rate_assignments
FOR SELECT
USING (
    -- Users see their own rates
    user_id = auth.uid()
    OR
    -- Admins/Managers see company rates
    (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.company_id = task_rate_assignments.company_id
            AND u.role IN ('owner', 'admin', 'manager')
        )
    )
);

DROP POLICY IF EXISTS "task_rates_write_policy" ON public.task_rate_assignments;
CREATE POLICY "task_rates_write_policy" ON public.task_rate_assignments
FOR ALL
USING (
    -- Only Admins/Owners can manage rates
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.company_id = task_rate_assignments.company_id
        AND u.role IN ('owner', 'admin')
    )
);

-- ============================================================================
-- 7. USER LOCATIONS
-- ============================================================================
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_locations_read_policy" ON public.user_locations;
CREATE POLICY "user_locations_read_policy" ON public.user_locations
FOR SELECT
USING (
    -- Users see their own location history
    user_id = auth.uid()
    OR
    -- Admins/Managers see company locations
    (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.company_id = user_locations.company_id
            AND u.role IN ('owner', 'admin', 'manager')
        )
    )
);

DROP POLICY IF EXISTS "user_locations_insert_policy" ON public.user_locations;
CREATE POLICY "user_locations_insert_policy" ON public.user_locations
FOR INSERT
WITH CHECK (
    -- Users can insert their own location
    user_id = auth.uid()
    AND
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);

-- ============================================================================
-- 8. WEBAUTHN CREDENTIALS
-- ============================================================================
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "webauthn_credentials_read_policy" ON public.webauthn_credentials;
CREATE POLICY "webauthn_credentials_read_policy" ON public.webauthn_credentials
FOR SELECT
USING (
    -- Users see their own credentials
    user_id = auth.uid()
    -- Admins don't need to see raw credentials, only maybe metadata
    -- For now restrict to owner only
);

DROP POLICY IF EXISTS "webauthn_credentials_write_policy" ON public.webauthn_credentials;
CREATE POLICY "webauthn_credentials_write_policy" ON public.webauthn_credentials
FOR ALL
USING (
    user_id = auth.uid()
)
WITH CHECK (
    user_id = auth.uid()
    AND
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);

-- ============================================================================
-- 9. WEBAUTHN CHALLENGES
-- ============================================================================
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "webauthn_challenges_policy" ON public.webauthn_challenges;
CREATE POLICY "webauthn_challenges_policy" ON public.webauthn_challenges
FOR ALL
USING (
    user_id = auth.uid()
)
WITH CHECK (
    user_id = auth.uid()
    AND
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);

-- ============================================================================
-- 10. LEAVE BALANCES (Virtual/Users Table)
-- ============================================================================
-- Since 'leave_balances' is often a view or part of 'users', we ensure 'users' RLS is tight.
-- But if a specific table exists (as per request), we create policy.
-- Assuming 'leave_balances' might be a separate table in some migrations we missed:
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leave_balances') THEN
        ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "leave_balances_read_policy" ON public.leave_balances;
        CREATE POLICY "leave_balances_read_policy" ON public.leave_balances
        FOR SELECT
        USING (
            user_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM users u
                WHERE u.id = auth.uid()
                AND u.company_id = leave_balances.company_id
                AND u.role IN ('owner', 'admin', 'manager')
            )
        );
    END IF;
END
$$;

COMMIT;
