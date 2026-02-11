-- Manual index creation commands - Run these separately outside transactions
-- These must be executed individually to avoid transaction conflicts

-- 1. Index for company-wide attendance queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_company_date 
ON attendance_records(company_id, clock_in_time DESC);

-- 2. Index for status-based filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_status
ON attendance_records(status, clock_in_time DESC);

-- 3. Index for break record lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_breaks_record_id
ON attendance_breaks(attendance_record_id);

-- 4. Index for current day user queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_user_current_date
ON attendance_records(user_id, (clock_in_time::DATE)) 
WHERE clock_out_time IS NULL;

-- 5. Index for working days calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_working_days 
ON attendance_records(company_id, clock_in_time) 
WHERE clock_in_time IS NOT NULL;

-- 6. Materialized view for dashboard statistics (run this after indexes are created)
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

-- Index for the materialized view
CREATE INDEX IF NOT EXISTS idx_mv_attendance_dashboard_company_date 
ON mv_attendance_dashboard(company_id, attendance_date DESC);