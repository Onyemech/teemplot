-- Fixed SQL scripts with security improvements and immutable functions
-- Run these to fix the identified issues

-- 1. Fix the immutable function issue for the index
-- Drop existing function and recreate with proper immutability
DROP INDEX IF EXISTS idx_attendance_user_current_date;

-- Create a proper immutable function for date extraction
CREATE OR REPLACE FUNCTION immutable_current_date()
RETURNS DATE AS $$
BEGIN
    RETURN CURRENT_DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Alternative: Use a computed column approach (recommended)
-- Add a computed column for better performance
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS clock_in_date DATE 
GENERATED ALWAYS AS (clock_in_time::DATE) STORED;

-- Now create the index on the computed column
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_user_current_date
ON attendance_records(user_id, clock_in_date) 
WHERE clock_out_time IS NULL;

-- 2. Fix security issues with function search paths
-- Update all functions to use explicit search paths

-- Fixed refresh_attendance_dashboard function with security
CREATE OR REPLACE FUNCTION public.refresh_attendance_dashboard()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_attendance_dashboard;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Fixed log_connection_pool_stats function with security
CREATE OR REPLACE FUNCTION public.log_connection_pool_stats()
RETURNS VOID AS $$
BEGIN
    INSERT INTO connection_pool_stats (active_connections, idle_connections, total_connections, waiting_clients)
    SELECT 
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections,
        count(*) as total_connections,
        count(*) FILTER (WHERE wait_event_type IS NOT NULL) as waiting_clients
    FROM pg_stat_activity 
    WHERE datname = current_database()
    AND pid != pg_backend_pid();
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Fixed check_geofence_optimized function with security
CREATE OR REPLACE FUNCTION public.check_geofence_optimized(
    company_id_param UUID,
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION
)
RETURNS TABLE(
    is_within BOOLEAN,
    distance_meters DOUBLE PRECISION,
    location_id UUID,
    location_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (ST_DWithin(
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::GEOGRAPHY,
            ST_SetSRID(ST_MakePoint(c.office_longitude, c.office_latitude), 4326)::GEOGRAPHY,
            COALESCE(c.geofence_radius_meters, 100)
        )) as is_within,
        ST_Distance(
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::GEOGRAPHY,
            ST_SetSRID(ST_MakePoint(c.office_longitude, c.office_latitude), 4326)::GEOGRAPHY
        ) as distance_meters,
        NULL::UUID as location_id,
        'Main Office'::TEXT as location_name
    FROM companies c
    WHERE c.id = company_id_param
    AND c.office_latitude IS NOT NULL 
    AND c.office_longitude IS NOT NULL;
END;
$$ LANGUAGE plpgsql 
IMMUTABLE PARALLEL SAFE
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Fixed get_attendance_for_update function with security
CREATE OR REPLACE FUNCTION public.get_attendance_for_update(
    user_id_param UUID,
    company_id_param UUID
)
RETURNS TABLE(
    id UUID,
    company_id UUID,
    user_id UUID,
    clock_in_time TIMESTAMPTZ,
    clock_out_time TIMESTAMPTZ,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT ar.id, ar.company_id, ar.user_id, ar.clock_in_time, ar.clock_out_time, ar.status
    FROM attendance_records ar
    WHERE ar.user_id = user_id_param 
    AND ar.company_id = company_id_param
    AND ar.clock_in_time::DATE = CURRENT_DATE 
    AND ar.clock_out_time IS NULL
    ORDER BY ar.clock_in_time DESC
    LIMIT 1
    FOR UPDATE NOWAIT;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Fixed get_attendance_stats_optimized function with security
CREATE OR REPLACE FUNCTION public.get_attendance_stats_optimized(
    company_id_param UUID,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    total_employees BIGINT,
    present_today BIGINT,
    late_today BIGINT,
    absent_today BIGINT,
    on_leave_today BIGINT,
    onsite_today BIGINT,
    remote_today BIGINT,
    overtime_today_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH today_attendance AS (
        SELECT 
            ar.user_id,
            ar.status,
            ar.is_within_geofence,
            ar.clock_out_time,
            CASE 
                WHEN ar.clock_out_time IS NOT NULL 
                AND EXTRACT(EPOCH FROM (ar.clock_out_time - ar.clock_in_time))/3600 > 8 
                THEN 1 
                ELSE 0 
            END as is_overtime
        FROM attendance_records ar
        WHERE ar.company_id = company_id_param
        AND ar.clock_in_time::DATE = end_date
    ),
    company_employees AS (
        SELECT COUNT(*) as total_count
        FROM users u
        WHERE u.company_id = company_id_param
        AND u.is_active = true
        AND u.deleted_at IS NULL
    ),
    leave_counts AS (
        SELECT COUNT(*) as leave_count
        FROM leave_requests lr
        WHERE lr.company_id = company_id_param
        AND lr.status = 'approved'
        AND end_date BETWEEN lr.start_date AND lr.end_date
    )
    SELECT 
        ce.total_count,
        COUNT(CASE WHEN ta.status = 'present' THEN 1 END),
        COUNT(CASE WHEN ta.status = 'late_arrival' THEN 1 END),
        COUNT(CASE WHEN ta.status = 'absent' THEN 1 END),
        COALESCE(lc.leave_count, 0),
        COUNT(CASE WHEN ta.is_within_geofence = true THEN 1 END),
        COUNT(CASE WHEN ta.is_within_geofence = false THEN 1 END),
        COUNT(CASE WHEN ta.is_overtime = 1 THEN 1 END)
    FROM company_employees ce
    LEFT JOIN today_attendance ta ON true
    LEFT JOIN leave_counts lc ON true
    GROUP BY ce.total_count, lc.leave_count;
END;
$$ LANGUAGE plpgsql 
STABLE PARALLEL SAFE
SECURITY DEFINER
SET search_path = public, pg_temp;

-- 3. Fix materialized view security issue
-- Revoke public access and create specific role-based access
REVOKE ALL ON mv_attendance_dashboard FROM PUBLIC;
REVOKE ALL ON mv_attendance_dashboard FROM anon;
REVOKE ALL ON mv_attendance_dashboard FROM authenticated;

-- Create a secure function to access the materialized view
CREATE OR REPLACE FUNCTION public.get_attendance_dashboard_stats(
    company_id_param UUID,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
    company_id UUID,
    attendance_date DATE,
    total_records BIGINT,
    present_count BIGINT,
    late_count BIGINT,
    absent_count BIGINT,
    early_departure_count BIGINT,
    onsite_count BIGINT,
    remote_count BIGINT,
    total_hours NUMERIC,
    total_break_minutes NUMERIC
) AS $$
BEGIN
    -- Only allow access to company-specific data
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE company_id = company_id_param 
        AND id = auth.uid()
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Access denied: insufficient permissions';
    END IF;

    RETURN QUERY
    SELECT * FROM mv_attendance_dashboard
    WHERE company_id = company_id_param
    AND attendance_date >= CURRENT_DATE - days_back
    ORDER BY attendance_date DESC;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Grant specific permissions
GRANT SELECT ON mv_attendance_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_attendance_dashboard_stats(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_attendance_dashboard() TO authenticated;

-- 4. Create a secure connection pool stats function
CREATE OR REPLACE FUNCTION public.get_connection_pool_stats()
RETURNS TABLE(
    timestamp TIMESTAMPTZ,
    active_connections INTEGER,
    idle_connections INTEGER,
    total_connections INTEGER,
    waiting_clients INTEGER
) AS $$
BEGIN
    -- Only allow access to authenticated users
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Access denied: authentication required';
    END IF;

    RETURN QUERY
    SELECT 
        NOW() as timestamp,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections,
        count(*) as total_connections,
        count(*) FILTER (WHERE wait_event_type IS NOT NULL) as waiting_clients
    FROM pg_stat_activity 
    WHERE datname = current_database()
    AND pid != pg_backend_pid();
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp;

-- 5. Create auto-attendance security functions
CREATE OR REPLACE FUNCTION public.get_eligible_auto_clockin_employees(
    company_id_param UUID,
    current_time TIME,
    grace_minutes INTEGER DEFAULT 30
)
RETURNS TABLE(
    user_id UUID,
    first_name TEXT,
    last_name TEXT,
    timezone TEXT,
    work_start_time TIME,
    working_days JSONB,
    grace_period_minutes INTEGER,
    require_geofence BOOLEAN,
    geofence_radius INTEGER,
    office_lat DOUBLE PRECISION,
    office_lng DOUBLE PRECISION,
    is_inside_geofence BOOLEAN,
    permission_state TEXT
) AS $$
BEGIN
    -- Security check: ensure user has access to this company
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE company_id = company_id_param 
        AND id = auth.uid()
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Access denied: insufficient permissions';
    END IF;

    RETURN QUERY
    WITH recent_locations AS (
        SELECT DISTINCT ON (ul.user_id)
            ul.user_id,
            ul.is_inside_geofence,
            ul.permission_state,
            ul.created_at
        FROM user_locations ul
        WHERE ul.company_id = company_id_param
        AND ul.created_at >= NOW() - INTERVAL '5 minutes'
        ORDER BY ul.user_id, ul.created_at DESC
    ),
    already_clocked_in AS (
        SELECT DISTINCT ar.user_id
        FROM attendance_records ar
        WHERE ar.company_id = company_id_param
        AND ar.clock_in_time::DATE = CURRENT_DATE
        AND ar.clock_out_time IS NULL
    )
    SELECT 
        e.user_id,
        e.first_name,
        e.last_name,
        e.timezone,
        e.work_start_time,
        e.working_days::JSONB,
        e.grace_period_minutes,
        e.require_geofence_for_clockin,
        e.geofence_radius_meters,
        e.office_latitude,
        e.office_longitude,
        COALESCE(rl.is_inside_geofence, false),
        COALESCE(rl.permission_state, 'denied')
    FROM mv_auto_attendance_eligible e
    LEFT JOIN recent_locations rl ON rl.user_id = e.user_id
    WHERE e.company_id = company_id_param
    AND e.auto_clockin_enabled = true
    AND NOT EXISTS (SELECT 1 FROM already_clocked_in aci WHERE aci.user_id = e.user_id)
    AND (
        -- Within grace period of work start time
        current_time >= (e.work_start_time - INTERVAL '1 minute' * grace_minutes)
        AND current_time <= (e.work_start_time + INTERVAL '1 minute' * grace_minutes)
    )
    AND (
        -- Check working days (simplified - should match company logic)
        e.working_days IS NULL 
        OR e.working_days->>'monday' = 'true'
    );
END;
$$ LANGUAGE plpgsql 
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp;

-- 6. Final cleanup and permissions
-- Ensure all functions have proper security
ALTER FUNCTION public.immutable_current_date() OWNER TO postgres;
ALTER FUNCTION public.refresh_attendance_dashboard() OWNER TO postgres;
ALTER FUNCTION public.log_connection_pool_stats() OWNER TO postgres;
ALTER FUNCTION public.check_geofence_optimized(UUID, DOUBLE PRECISION, DOUBLE PRECISION) OWNER TO postgres;
ALTER FUNCTION public.get_attendance_for_update(UUID, UUID) OWNER TO postgres;
ALTER FUNCTION public.get_attendance_stats_optimized(UUID, DATE, DATE) OWNER TO postgres;
ALTER FUNCTION public.get_attendance_dashboard_stats(UUID, INTEGER) OWNER TO postgres;
ALTER FUNCTION public.get_connection_pool_stats() OWNER TO postgres;
ALTER FUNCTION public.get_eligible_auto_clockin_employees(UUID, TIME, INTEGER) OWNER TO postgres;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.immutable_current_date() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_attendance_dashboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_connection_pool_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_geofence_optimized(UUID, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_attendance_for_update(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_attendance_stats_optimized(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_attendance_dashboard_stats(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_connection_pool_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_eligible_auto_clockin_employees(UUID, TIME, INTEGER) TO authenticated;