-- PART 2: TABLES AND VIEWS - Run these in a transaction (all at once)
BEGIN;

-- Create materialized view for dashboard statistics
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

-- Create materialized view for auto-attendance eligibility
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

-- Create the job management table
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

COMMIT;