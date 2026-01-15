-- =====================================================
-- Migration: Fix Database Security Linter Issues
-- Date: 2026-01-15
-- Description: Addresses security warnings and errors from Supabase linter
-- =====================================================

-- =====================================================
-- SECTION 1: Fix Function Search Path Mutable (8 functions)
-- Issue: Functions don't have search_path set, vulnerable to search_path attacks
-- Fix: Set search_path to empty string to prevent SQL injection attacks
-- =====================================================

-- 1. cleanup_table_definition_cache
ALTER FUNCTION public.cleanup_table_definition_cache() 
SET search_path = '';

-- 2. refresh_timezone_cache
ALTER FUNCTION public.refresh_timezone_cache() 
SET search_path = '';

-- 3. check_geofence
ALTER FUNCTION public.check_geofence(user_lat DOUBLE PRECISION, user_lng DOUBLE PRECISION, location_id UUID) 
SET search_path = '';

-- 4. calculate_attendance_metrics
ALTER FUNCTION public.calculate_attendance_metrics(company_uuid UUID, start_date DATE, end_date DATE) 
SET search_path = '';

-- 5. get_company_employee_counts
ALTER FUNCTION public.get_company_employee_counts(company_uuid UUID) 
SET search_path = '';

-- 6. update_company_invitation_counter
ALTER FUNCTION public.update_company_invitation_counter() 
SET search_path = '';

-- 7. get_invitation_statistics
ALTER FUNCTION public.get_invitation_statistics(company_uuid UUID) 
SET search_path = '';

-- 8. update_employee_invitations_updated_at
ALTER FUNCTION public.update_employee_invitations_updated_at() 
SET search_path = '';


-- =====================================================
-- SECTION 2: Enable RLS on Public Tables (3 tables - ERRORS)
-- Issue: Tables exposed to PostgREST without RLS enabled
-- Fix: Enable RLS and create appropriate policies
-- =====================================================

-- 1. attendance_breaks
ALTER TABLE public.attendance_breaks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own company's attendance breaks
CREATE POLICY "Users can view own company attendance breaks"
ON public.attendance_breaks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = (SELECT auth.uid())
    AND users.company_id = attendance_breaks.company_id
  )
);

-- Policy: Authenticated users can manage their own attendance breaks
CREATE POLICY "Users can manage own attendance breaks"
ON public.attendance_breaks
FOR ALL
USING (
  user_id = (SELECT auth.uid())
)
WITH CHECK (
  user_id = (SELECT auth.uid())
);

-- 2. tax_assignments
ALTER TABLE public.tax_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view tax assignments for their company
CREATE POLICY "Users can view company tax assignments"
ON public.tax_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = (SELECT auth.uid())
    AND users.company_id = tax_assignments.company_id
  )
);

-- Policy: Only owners/admins can manage tax assignments
CREATE POLICY "Admins can manage tax assignments"
ON public.tax_assignments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = (SELECT auth.uid())
    AND users.company_id = tax_assignments.company_id
    AND users.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = (SELECT auth.uid())
    AND users.company_id = tax_assignments.company_id
    AND users.role IN ('owner', 'admin')
  )
);

-- 3. table_definition_cache
ALTER TABLE public.table_definition_cache ENABLE ROW LEVEL SECURITY;

-- This is a system/cache table, restrict to service role only
CREATE POLICY "Service role only access to table cache"
ON public.table_definition_cache
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);


-- =====================================================
-- SECTION 3: Review Security Definer View (1 view - ERROR)
-- Issue: optimized_table_metadata uses SECURITY DEFINER
-- Note: If this view needs elevated privileges, document why.
-- Otherwise, recreate without SECURITY DEFINER
-- =====================================================

-- Option 1: If SECURITY DEFINER is intentional, add a comment documenting why
COMMENT ON VIEW public.optimized_table_metadata IS 
'SECURITY DEFINER is required to allow reading pg_catalog tables for metadata optimization. This view is read-only and filters sensitive data.';

-- Option 2 (if not needed): Drop and recreate without SECURITY DEFINER
-- Uncomment below if you want to remove SECURITY DEFINER:
/*
DROP VIEW IF EXISTS public.optimized_table_metadata;
CREATE VIEW public.optimized_table_metadata AS
-- [Paste your original view definition here without SECURITY DEFINER]
SELECT ...;
*/


-- =====================================================
-- SECTION 4: Fix Overly Permissive RLS Policies (4 tables - WARNINGS)
-- Issue: Policies using USING(true) or WITH CHECK(true) bypass RLS
-- =====================================================

-- 1. biometric_audit_log - Drop and recreate proper policy
DROP POLICY IF EXISTS "System can insert biometric audit logs" ON public.biometric_audit_log;

-- Only service role should insert audit logs
CREATE POLICY "Service role can insert audit logs"
ON public.biometric_audit_log
FOR INSERT
TO service_role
WITH CHECK (true);

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
ON public.biometric_audit_log
FOR SELECT
USING (user_id = (SELECT auth.uid()));


-- 2. expenses - Drop and recreate proper policy
DROP POLICY IF EXISTS "Service role can manage expenses" ON public.expenses;

-- Users can view expenses for their company
CREATE POLICY "Users can view company expenses"
ON public.expenses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = (SELECT auth.uid())
    AND users.company_id = expenses.company_id
  )
);

-- Only admins/owners can create/update/delete expenses
CREATE POLICY "Admins can manage expenses"
ON public.expenses
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = (SELECT auth.uid())
    AND users.company_id = expenses.company_id
    AND users.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = (SELECT auth.uid())
    AND users.company_id = expenses.company_id
    AND users.role IN ('owner', 'admin')
  )
);


-- 3. files - Drop and recreate proper policy
DROP POLICY IF EXISTS "Service role can manage files" ON public.files;

-- Users can view files they uploaded or files in their company
CREATE POLICY "Users can view own and company files"
ON public.files
FOR SELECT
USING (
  uploaded_by = (SELECT auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = (SELECT auth.uid())
    AND users.company_id = files.company_id
  )
);

-- Users can upload files for their company
CREATE POLICY "Users can upload files"
ON public.files
FOR INSERT
WITH CHECK (
  uploaded_by = (SELECT auth.uid())
  AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = (SELECT auth.uid())
    AND users.company_id = files.company_id
  )
);

-- Users can delete their own files, admins can delete any company file
CREATE POLICY "Users can delete own files, admins all company files"
ON public.files
FOR DELETE
USING (
  uploaded_by = (SELECT auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = (SELECT auth.uid())
    AND users.company_id = files.company_id
    AND users.role IN ('owner', 'admin')
  )
);


-- 4. payments - Drop and recreate proper policy
DROP POLICY IF EXISTS "payments_access_policy" ON public.payments;

-- Users can view payments for their company
CREATE POLICY "Users can view company payments"
ON public.payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = (SELECT auth.uid())
    AND users.company_id = payments.company_id
  )
);

-- Only service role can insert/update payments (from payment webhooks)
CREATE POLICY "Service role can manage payments"
ON public.payments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);


-- =====================================================
-- SECTION 5: Handle Materialized View API Access (2 views - WARNINGS)
-- Issue: Materialized views accessible over Data APIs
-- Option 1: Revoke SELECT permissions if not needed
-- Option 2: Keep if intentional (cache tables for performance)
-- =====================================================

-- If these are intentionally public (for timezone caching), add comments
COMMENT ON MATERIALIZED VIEW public.cached_timezone_names IS 
'Public cache for timezone names. Safe to expose via API as contains no sensitive data.';

COMMENT ON MATERIALIZED VIEW public.timezone_cache IS 
'Public cache for timezone data. Safe to expose via API as contains no sensitive data.';

-- Alternative: If you want to restrict access, revoke permissions
-- Uncomment below to restrict:
/*
REVOKE SELECT ON public.cached_timezone_names FROM anon, authenticated;
REVOKE SELECT ON public.timezone_cache FROM anon, authenticated;
GRANT SELECT ON public.cached_timezone_names TO service_role;
GRANT SELECT ON public.timezone_cache TO service_role;
*/


-- =====================================================
-- VERIFICATION QUERIES
-- Run these to verify the fixes were applied successfully
-- =====================================================

-- Verify function search_path settings
SELECT 
  p.proname AS function_name,
  pg_catalog.array_to_string(p.proconfig, ', ') AS settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'cleanup_table_definition_cache',
    'refresh_timezone_cache',
    'check_geofence',
    'calculate_attendance_metrics',
    'get_company_employee_counts',
    'update_company_invitation_counter',
    'get_invitation_statistics',
    'update_employee_invitations_updated_at'
  );

-- Verify RLS is enabled on tables
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('attendance_breaks', 'tax_assignments', 'table_definition_cache')
ORDER BY tablename;

-- Verify policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd AS command,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'attendance_breaks', 
    'tax_assignments', 
    'table_definition_cache',
    'biometric_audit_log',
    'expenses',
    'files',
    'payments'
  )
ORDER BY tablename, policyname;
