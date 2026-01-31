-- Migration: Comprehensive Security Fixes (RLS Policies & Function Hardening)
-- Date: 2026-01-30
-- Description: Addresses 5 "RLS Enabled No Policy" infos, 1 mutable function search_path warning, 
-- 2 materialized view API warnings, and 4 permissive RLS policy warnings.

BEGIN;

-- ============================================================================
-- 1. FIX: RLS Enabled No Policy (5 tables)
-- ============================================================================

-- 1.1 attendance_breaks
DROP POLICY IF EXISTS "attendance_breaks_isolation_policy" ON public.attendance_breaks;
CREATE POLICY "attendance_breaks_isolation_policy" ON public.attendance_breaks
FOR ALL
USING (
    -- Users access their own breaks
    EXISTS (
        SELECT 1 FROM attendance_records ar
        WHERE ar.id = attendance_breaks.attendance_record_id
        AND ar.user_id = auth.uid()
    )
    OR
    -- Admins/Managers access company breaks
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

-- 1.2 task_rate_assignments
DROP POLICY IF EXISTS "task_rates_read_policy" ON public.task_rate_assignments;
CREATE POLICY "task_rates_read_policy" ON public.task_rate_assignments
FOR SELECT
USING (
    user_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.company_id = task_rate_assignments.company_id
        AND u.role IN ('owner', 'admin', 'manager')
    )
);

DROP POLICY IF EXISTS "task_rates_write_policy" ON public.task_rate_assignments;
CREATE POLICY "task_rates_write_policy" ON public.task_rate_assignments
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.company_id = task_rate_assignments.company_id
        AND u.role IN ('owner', 'admin')
    )
);

-- 1.3 user_locations
DROP POLICY IF EXISTS "user_locations_read_policy" ON public.user_locations;
CREATE POLICY "user_locations_read_policy" ON public.user_locations
FOR SELECT
USING (
    user_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.company_id = user_locations.company_id
        AND u.role IN ('owner', 'admin', 'manager')
    )
);

DROP POLICY IF EXISTS "user_locations_insert_policy" ON public.user_locations;
CREATE POLICY "user_locations_insert_policy" ON public.user_locations
FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    AND
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);

-- 1.4 webauthn_challenges
DROP POLICY IF EXISTS "webauthn_challenges_policy" ON public.webauthn_challenges;
CREATE POLICY "webauthn_challenges_policy" ON public.webauthn_challenges
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 1.5 webauthn_credentials
DROP POLICY IF EXISTS "webauthn_credentials_read_policy" ON public.webauthn_credentials;
CREATE POLICY "webauthn_credentials_read_policy" ON public.webauthn_credentials
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "webauthn_credentials_write_policy" ON public.webauthn_credentials;
CREATE POLICY "webauthn_credentials_write_policy" ON public.webauthn_credentials
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- ============================================================================
-- 2. FIX: Function Search Path Mutable (1 function)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_default_leave_types') THEN
        ALTER FUNCTION public.create_default_leave_types(uuid) SET search_path = '';
    END IF;
END
$$;


-- ============================================================================
-- 3. FIX: Materialized View in API (2 views)
-- ============================================================================

-- Revoke public access to internal caches to hide them from PostgREST API
REVOKE ALL ON public.cached_timezone_names FROM anon, authenticated;
REVOKE ALL ON public.timezone_cache FROM anon, authenticated;

-- Ensure service role (backend) retains access
GRANT SELECT ON public.cached_timezone_names TO service_role;
GRANT SELECT ON public.timezone_cache TO service_role;


-- ============================================================================
-- 4. FIX: Permissive RLS Policies (4 tables)
-- ============================================================================

-- 4.1 biometric_audit_log
DROP POLICY IF EXISTS "System can insert biometric audit logs" ON public.biometric_audit_log;
CREATE POLICY "System can insert biometric audit logs" ON public.biometric_audit_log
FOR INSERT
TO service_role
WITH CHECK (true);

-- 4.2 expenses - SKIPPED per user request (feature not in use)
-- DROP POLICY IF EXISTS "Service role can manage expenses" ON public.expenses;
-- ...

-- 4.3 files
DROP POLICY IF EXISTS "Service role can manage files" ON public.files;
CREATE POLICY "Service role can manage files" ON public.files
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4.4 payments
DROP POLICY IF EXISTS "payments_access_policy" ON public.payments;
CREATE POLICY "payments_access_policy" ON public.payments
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.company_id = payments.company_id
    )
);

CREATE POLICY "payments_service_role_policy" ON public.payments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMIT;
