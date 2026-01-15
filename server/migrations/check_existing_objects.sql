-- =====================================================
-- STEP 1: Query to find what actually exists in your database
-- Run this first to see what functions, tables, and views you have
-- =====================================================

-- Check which functions actually exist
SELECT 
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_catalog.array_to_string(p.proconfig, ', ') AS current_settings
FROM pg_proc p
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
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
  )
ORDER BY p.proname;

-- Check which tables exist and if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
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
ORDER BY tablename;

-- Check which views exist
SELECT 
  schemaname,
  viewname
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('optimized_table_metadata')
ORDER BY viewname;

-- Check which materialized views exist
SELECT 
  schemaname,
  matviewname
FROM pg_matviews
WHERE schemaname = 'public'
  AND matviewname IN ('cached_timezone_names', 'timezone_cache')
ORDER BY matviewname;

-- Check existing RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd AS command,
  roles,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
