-- Migration: Enable RLS on Remaining Public Tables
-- Date: 2026-01-30
-- Description: Explicitly enables RLS and adds policies for performance_snapshots, tax_assignments, and table_definition_cache.

BEGIN;

-- ============================================================================
-- 1. PERFORMANCE SNAPSHOTS
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

-- ============================================================================
-- 2. TAX ASSIGNMENTS
-- ============================================================================
ALTER TABLE public.tax_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tax_assignments_read_policy" ON public.tax_assignments;
CREATE POLICY "tax_assignments_read_policy" ON public.tax_assignments
FOR SELECT
USING (
    -- Users see their own assignments
    user_id = auth.uid()
    OR
    -- Admins/Owners see company assignments
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
-- 3. TABLE DEFINITION CACHE
-- ============================================================================
ALTER TABLE public.table_definition_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "table_definition_cache_service_only" ON public.table_definition_cache;
CREATE POLICY "table_definition_cache_service_only" ON public.table_definition_cache
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMIT;
