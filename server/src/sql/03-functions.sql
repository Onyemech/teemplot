-- PART 3: FUNCTIONS - Run these in a transaction (all at once)
BEGIN;

-- Fixed function with renamed parameters (no more current_time conflicts)
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
        check_time_param >= (e.work_start_time - INTERVAL '1 minute' * grace_minutes_param)
        AND check_time_param <= (e.work_start_time + INTERVAL '1 minute' * grace_minutes_param)
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Fixed clock-out function
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
    AND check_time_param >= (e.work_end_time - INTERVAL '1 minute' * buffer_minutes_param);
END;
$$ LANGUAGE plpgsql STABLE;

-- Fixed job processing function
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
    employee RECORD;
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

-- Add security settings to all functions
ALTER FUNCTION public.get_eligible_auto_clockin_employees(UUID, TIME, INTEGER) OWNER TO postgres;
ALTER FUNCTION public.get_eligible_auto_clockout_employees(UUID, TIME, INTEGER) OWNER TO postgres;
ALTER FUNCTION public.process_auto_attendance_job(INTEGER, INTEGER) OWNER TO postgres;

COMMIT;