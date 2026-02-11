-- PART 4: SECURITY FIXES - Run these in a transaction
BEGIN;

-- 1. Fix "Function Search Path Mutable" errors
-- Explicitly set search_path to public for security

ALTER FUNCTION public.refresh_attendance_dashboard() 
SET search_path = public;

ALTER FUNCTION public.log_connection_pool_stats() 
SET search_path = public;

ALTER FUNCTION public.check_geofence_optimized(UUID, DOUBLE PRECISION, DOUBLE PRECISION) 
SET search_path = public;

ALTER FUNCTION public.get_attendance_for_update(UUID, UUID) 
SET search_path = public;

ALTER FUNCTION public.get_attendance_stats_optimized(UUID, DATE, DATE) 
SET search_path = public;

ALTER FUNCTION public.get_eligible_auto_clockin_employees(UUID, TIME, INTEGER) 
SET search_path = public;

ALTER FUNCTION public.get_eligible_auto_clockout_employees(UUID, TIME, INTEGER) 
SET search_path = public;

ALTER FUNCTION public.process_auto_attendance_job(INTEGER, INTEGER) 
SET search_path = public;


-- 2. Fix "Materialized View in API" warnings
-- Revoke access from API roles (anon, authenticated) to prevent public exposure
REVOKE ALL ON TABLE public.mv_attendance_dashboard FROM anon, authenticated;
REVOKE ALL ON TABLE public.mv_auto_attendance_eligible FROM anon, authenticated;


-- 3. Fix "RLS Disabled in Public" errors
-- Enable Row Level Security on internal tables
ALTER TABLE public.auto_attendance_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_pool_stats ENABLE ROW LEVEL SECURITY;

-- Add policies to allow system-only access (service_role) or restricted access
-- For auto_attendance_jobs, we might want managers to view them, but for now, strict security:
CREATE POLICY "Enable access to service_role only" ON public.auto_attendance_jobs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable access to service_role only" ON public.connection_pool_stats
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMIT;
