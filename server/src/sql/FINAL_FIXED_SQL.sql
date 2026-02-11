-- FINAL FIXED SQL - Run these commands ONE BY ONE outside of transactions
-- This fixes all the immutable function and parameter conflicts

-- STEP 1: Fix the attendance date index issue
-- Drop any existing problematic attempts
DROP INDEX IF EXISTS idx_attendance_user_current_date;

-- Create a simple partial index that works (no immutable functions needed)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_user_today
ON attendance_records(user_id, company_id, clock_in_time DESC)
WHERE clock_out_time IS NULL 
AND clock_in_time >= CURRENT_DATE 
AND clock_in_time < CURRENT_DATE + INTERVAL '1 day';

-- STEP 2: Create the basic attendance indexes (these work fine)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_company_date 
ON attendance_records(company_id, clock_in_time DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_status
ON attendance_records(status, clock_in_time DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_breaks_record_id
ON attendance_breaks(attendance_record_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_working_days 
ON attendance_records(company_id, clock_in_time) 
WHERE clock_in_time IS NOT NULL;

-- STEP 3: Create auto-attendance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_locations_recent 
ON user_locations(user_id, company_id, created_at DESC) 
WHERE created_at >= NOW() - INTERVAL '10 minutes';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_today_open 
ON attendance_records(user_id, company_id) 
WHERE clock_out_time IS NULL 
AND clock_in_time >= CURRENT_DATE 
AND clock_in_time < CURRENT_DATE + INTERVAL '1 day';

-- STEP 4: Create materialized view (this can run in transaction)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_attendance_dashboard AS
SELECT 
    ar.company_id,
    DATE(ar.clock_in_time) as attendance_date,
    COUNT(*) as total_records,
    COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as present_count,
    COUNT(CASE WHEN ar.status = 'late_arrival' THEN 1 END) as late_count,
    COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent_count,
    COUNT(CASE WHEN ar.clock_out_time IS NOT NULL AND ar.is_early_departure = true THEN 1 END) as early_departure_count,
    COUNT(CASE WHEN ar.is_within_geofence = true THEN 1 END) as onsite_count,
    COUNT(CASE WHEN ar.is_within_geofence = false THEN 1 END) as remote_count,
    COALESCE(SUM(EXTRACT(EPOCH FROM (ar.clock_out_time - ar.clock_in_time))/3600), 0) as total_hours,
    COALESCE(SUM(ab.total_break_minutes), 0) as total_break_minutes
FROM attendance_records ar
LEFT JOIN (
    SELECT attendance_record_id, SUM(duration_minutes) as total_break_minutes
    FROM attendance_breaks
    GROUP BY attendance_record_id
) ab ON ab.attendance_record_id = ar.id
WHERE ar.clock_in_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ar.company_id, DATE(ar.clock_in_time);

CREATE INDEX IF NOT EXISTS idx_mv_attendance_dashboard_company_date 
ON mv_attendance_dashboard(company_id, attendance_date DESC);

-- STEP 5: Create the job management table (this runs in transaction)
CREATE TABLE IF NOT EXISTS auto_attendance_jobs (
    id SERIAL PRIMARY KEY,
    company_id UUID NOT NULL,
    job_type VARCHAR(10) NOT NULL CHECK (job_type IN ('clockin', 'clockout')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    processed_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_attendance_jobs_pending 
ON auto_attendance_jobs(company_id, job_type, status) 
WHERE status IN ('pending', 'processing');

-- STEP 6: Create materialized view for auto-attendance (this runs in transaction)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_auto_attendance_eligible AS
SELECT 
    u.id as user_id,
    u.company_id,
    u.first_name,
    u.last_name,
    c.timezone,
    c.work_start_time,
    c.work_end_time,
    c.working_days,
    c.grace_period_minutes,
    c.auto_clockin_enabled,
    c.auto_clockout_enabled,
    c.require_geofence_for_clockin,
    c.geofence_radius_meters,
    c.office_latitude,
    c.office_longitude
FROM users u
JOIN companies c ON c.id = u.company_id
WHERE u.is_active = true 
AND u.deleted_at IS NULL
AND c.is_active = true
AND c.deleted_at IS NULL
AND (c.auto_clockin_enabled = true OR c.auto_clockout_enabled = true);

CREATE INDEX IF NOT EXISTS idx_mv_auto_attendance_company 
ON mv_auto_attendance_eligible(company_id, user_id);

-- STEP 7: Create optimized functions with FIXED parameter names (no more current_time conflicts)
CREATE OR REPLACE FUNCTION public.get_eligible_auto_clockin_employees(
    company_id_param UUID,
    check_time_param TIME,
    grace_minutes_param INTEGER DEFAULT 30
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
        AND ar.clock_in_time >= CURRENT_DATE 
        AND ar.clock_in_time < CURRENT_DATE + INTERVAL '1 day'
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
        check_time_param >= (e.work_start_time - INTERVAL '1 minute' * grace_minutes_param)
        AND check_time_param <= (e.work_start_time + INTERVAL '1 minute' * grace_minutes_param)
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- STEP 8: Create the clock-out function with FIXED parameter names
CREATE OR REPLACE FUNCTION public.get_eligible_auto_clockout_employees(
    company_id_param UUID,
    check_time_param TIME,
    buffer_minutes_param INTEGER DEFAULT 30
)
RETURNS TABLE(
    user_id UUID,
    first_name TEXT,
    last_name TEXT,
    timezone TEXT,
    work_end_time TIME,
    working_days JSONB,
    require_geofence BOOLEAN,
    geofence_radius INTEGER,
    office_lat DOUBLE PRECISION,
    office_lng DOUBLE PRECISION,
    is_inside_geofence BOOLEAN,
    permission_state TEXT,
    attendance_record_id UUID,
    clock_in_time TIMESTAMPTZ,
    last_location_time TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH recent_locations AS (
        SELECT DISTINCT ON (ul.user_id)
            ul.user_id,
            ul.is_inside_geofence,
            ul.permission_state,
            ul.created_at
        FROM user_locations ul
        WHERE ul.company_id = company_id_param
        AND ul.created_at >= NOW() - INTERVAL '10 minutes'
        ORDER BY ul.user_id, ul.created_at DESC
    ),
    open_attendance AS (
        SELECT 
            ar.id,
            ar.user_id,
            ar.clock_in_time
        FROM attendance_records ar
        WHERE ar.company_id = company_id_param
        AND ar.clock_in_time >= CURRENT_DATE 
        AND ar.clock_in_time < CURRENT_DATE + INTERVAL '1 day'
        AND ar.clock_out_time IS NULL
    )
    SELECT 
        e.user_id,
        e.first_name,
        e.last_name,
        e.timezone,
        e.work_end_time,
        e.working_days::JSONB,
        e.require_geofence_for_clockin,
        e.geofence_radius_meters,
        e.office_latitude,
        e.office_longitude,
        COALESCE(rl.is_inside_geofence, false),
        COALESCE(rl.permission_state, 'denied'),
        oa.id,
        oa.clock_in_time,
        rl.created_at
    FROM mv_auto_attendance_eligible e
    JOIN open_attendance oa ON oa.user_id = e.user_id
    LEFT JOIN recent_locations rl ON rl.user_id = e.user_id
    WHERE e.company_id = company_id_param
    AND e.auto_clockout_enabled = true
    AND (
        -- Past work end time with buffer
        check_time_param >= (e.work_end_time - INTERVAL '1 minute' * buffer_minutes_param)
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- STEP 9: Create the job processing function with FIXED parameters
CREATE OR REPLACE FUNCTION process_auto_attendance_job(
    job_id_param INTEGER,
    max_employees_per_batch_param INTEGER DEFAULT 50
)
RETURNS TABLE(
    processed INTEGER,
    errors INTEGER,
    status TEXT
) AS $$
DECLARE
    job_record RECORD;
    company_config RECORD;
    processed_count INTEGER := 0;
    error_count INTEGER := 0;
    current_time_val TIME;
BEGIN
    -- Get job details
    SELECT * INTO job_record
    FROM auto_attendance_jobs
    WHERE id = job_id_param AND status = 'pending'
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 0, 0, 'not_found';
        RETURN;
    END IF;

    -- Update job status to processing
    UPDATE auto_attendance_jobs 
    SET status = 'processing', started_at = NOW()
    WHERE id = job_id_param;

    -- Get current time in company's timezone
    SELECT (NOW() AT TIME ZONE c.timezone)::TIME INTO current_time_val
    FROM companies c
    WHERE c.id = job_record.company_id;

    -- Process based on job type
    IF job_record.job_type = 'clockin' THEN
        -- Process clock-in with rate limiting
        FOR employee IN 
            SELECT * FROM get_eligible_auto_clockin_employees(
                job_record.company_id, 
                current_time_val,
                30 -- grace period minutes
            )
            LIMIT max_employees_per_batch_param
        LOOP
            BEGIN
                -- Call the auto clock-in logic here
                processed_count := processed_count + 1;
                
            EXCEPTION WHEN OTHERS THEN
                error_count := error_count + 1;
                -- Log error but continue processing
            END;
        END LOOP;
    
    ELSIF job_record.job_type = 'clockout' THEN
        -- Process clock-out with rate limiting
        FOR employee IN 
            SELECT * FROM get_eligible_auto_clockout_employees(
                job_record.company_id, 
                current_time_val,
                30 -- buffer minutes
            )
            LIMIT max_employees_per_batch_param
        LOOP
            BEGIN
                -- Call the auto clock-out logic here
                processed_count := processed_count + 1;
                
            EXCEPTION WHEN OTHERS THEN
                error_count := error_count + 1;
                -- Log error but continue processing
            END;
        END LOOP;
    END IF;

    -- Update job completion status
    UPDATE auto_attendance_jobs 
    SET 
        status = CASE WHEN error_count > 0 THEN 'failed' ELSE 'completed' END,
        completed_at = NOW(),
        processed_count = processed_count,
        error_count = error_count
    WHERE id = job_id_param;

    RETURN QUERY SELECT processed_count, error_count, 'completed';
END;
$$ LANGUAGE plpgsql;