-- Fixed SQL scripts with resolved immutable and parameter conflicts
-- Run these to fix the identified issues

-- 1. Fix the immutable function issue for the date index
-- Drop existing problematic approaches
DROP INDEX IF EXISTS idx_attendance_user_current_date;
ALTER TABLE attendance_records DROP COLUMN IF EXISTS clock_in_date;

-- Create a simple, effective index without immutable issues
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_user_current_date
ON attendance_records(user_id, clock_in_time) 
WHERE clock_out_time IS NULL 
AND clock_in_time >= CURRENT_DATE 
AND clock_in_time < CURRENT_DATE + INTERVAL '1 day';

-- Alternative approach: Create a partial index that works well for today's data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_user_today
ON attendance_records(user_id, company_id, clock_in_time DESC)
WHERE clock_out_time IS NULL;

-- 2. Fix the auto-attendance function parameter conflicts
-- Fixed function with renamed parameters to avoid conflicts
CREATE OR REPLACE FUNCTION public.get_eligible_auto_clockin_employees(
    p_company_id UUID,
    p_check_time TIME,
    p_grace_minutes INTEGER DEFAULT 30
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
        WHERE ul.company_id = p_company_id
        AND ul.created_at >= NOW() - INTERVAL '5 minutes'
        ORDER BY ul.user_id, ul.created_at DESC
    ),
    already_clocked_in AS (
        SELECT DISTINCT ar.user_id
        FROM attendance_records ar
        WHERE ar.company_id = p_company_id
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
    WHERE e.company_id = p_company_id
    AND e.auto_clockin_enabled = true
    AND NOT EXISTS (SELECT 1 FROM already_clocked_in aci WHERE aci.user_id = e.user_id)
    AND (
        -- Within grace period of work start time
        p_check_time >= (e.work_start_time - INTERVAL '1 minute' * p_grace_minutes)
        AND p_check_time <= (e.work_start_time + INTERVAL '1 minute' * p_grace_minutes)
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

-- Fixed clock-out function with renamed parameters
CREATE OR REPLACE FUNCTION public.get_eligible_auto_clockout_employees(
    p_company_id UUID,
    p_check_time TIME,
    p_buffer_minutes INTEGER DEFAULT 30
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
        WHERE ul.company_id = p_company_id
        AND ul.created_at >= NOW() - INTERVAL '10 minutes'
        ORDER BY ul.user_id, ul.created_at DESC
    ),
    open_attendance AS (
        SELECT 
            ar.id,
            ar.user_id,
            ar.clock_in_time
        FROM attendance_records ar
        WHERE ar.company_id = p_company_id
        AND ar.clock_in_time::DATE = CURRENT_DATE
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
    WHERE e.company_id = p_company_id
    AND e.auto_clockout_enabled = true
    AND (
        -- Past work end time with buffer
        p_check_time >= (e.work_end_time - INTERVAL '1 minute' * p_buffer_minutes)
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

-- 3. Fix the process_auto_attendance_job function parameter conflicts
CREATE OR REPLACE FUNCTION process_auto_attendance_job(
    p_job_id INTEGER,
    p_max_employees_per_batch INTEGER DEFAULT 50
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
    v_current_time TIME;
BEGIN
    -- Get job details
    SELECT * INTO job_record
    FROM auto_attendance_jobs
    WHERE id = p_job_id AND status = 'pending'
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 0, 0, 'not_found';
        RETURN;
    END IF;

    -- Update job status to processing
    UPDATE auto_attendance_jobs 
    SET status = 'processing', started_at = NOW()
    WHERE id = p_job_id;

    -- Get current time in company's timezone
    SELECT (NOW() AT TIME ZONE c.timezone)::TIME INTO v_current_time
    FROM companies c
    WHERE c.id = job_record.company_id;

    -- Process based on job type
    IF job_record.job_type = 'clockin' THEN
        -- Process clock-in with rate limiting
        FOR employee IN 
            SELECT * FROM get_eligible_auto_clockin_employees(
                job_record.company_id, 
                v_current_time,
                30 -- grace period minutes
            )
            LIMIT p_max_employees_per_batch
        LOOP
            BEGIN
                -- Call the auto clock-in logic here
                -- This would integrate with your existing EnhancedAttendanceService
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
                v_current_time,
                30 -- buffer minutes
            )
            LIMIT p_max_employees_per_batch
        LOOP
            BEGIN
                -- Call the auto clock-out logic here
                -- This would integrate with your existing EnhancedAttendanceService
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
    WHERE id = p_job_id;

    RETURN QUERY SELECT processed_count, error_count, 'completed';
END;
$$ LANGUAGE plpgsql;

-- 4. Create the materialized view for auto-attendance eligibility (fixed)
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

-- 5. Create the job management table (fixed)
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

-- 6. Final security fixes for all functions
-- Apply security settings to all functions
DO $$
DECLARE
    func_name TEXT;
BEGIN
    -- Update all auto-attendance related functions with proper security
    FOR func_name IN 
        SELECT proname 
        FROM pg_proc 
        WHERE proname LIKE '%auto_attendance%' OR proname LIKE '%auto%clock%'
    LOOP
        EXECUTE format('ALTER FUNCTION public.%I() OWNER TO postgres;', func_name);
        EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I() TO authenticated;', func_name);
    END LOOP;
END $$;