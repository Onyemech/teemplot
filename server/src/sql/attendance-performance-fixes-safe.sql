-- Performance optimization scripts for attendance system
-- Run these to fix the identified bottlenecks
-- NOTE: CREATE INDEX CONCURRENTLY must be run outside of transactions

-- 1. Fix N+1 query problem by adding indexes
-- Run these commands separately outside of any transaction:

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_company_date 
-- ON attendance_records(company_id, clock_in_time DESC);

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_status
-- ON attendance_records(status, clock_in_time DESC);

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_breaks_record_id
-- ON attendance_breaks(attendance_record_id);

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_user_current_date
-- ON attendance_records(user_id, (clock_in_time::DATE)) 
-- WHERE clock_out_time IS NULL;

-- 2. Create functions and views that can run in transactions

-- Create function for optimized geofence checking
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
$$ LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE;

-- Add row-level locking function for concurrent operations
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
$$ LANGUAGE plpgsql;

-- Create optimized function for dashboard statistics
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
$$ LANGUAGE plpgsql STABLE PARALLEL SAFE;

-- Create index for working days calculations
-- Note: This can be run in transaction if needed, but better to run outside
-- CREATE INDEX IF NOT EXISTS idx_attendance_working_days 
-- ON attendance_records(company_id, clock_in_time) 
-- WHERE clock_in_time IS NOT NULL;

-- Add connection pool monitoring table
CREATE TABLE IF NOT EXISTS connection_pool_stats (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    active_connections INTEGER,
    idle_connections INTEGER,
    total_connections INTEGER,
    waiting_clients INTEGER
);

-- Create function to log pool stats
CREATE OR REPLACE FUNCTION log_connection_pool_stats()
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
$$ LANGUAGE plpgsql;

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_attendance_dashboard()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_attendance_dashboard;
END;
$$ LANGUAGE plpgsql;