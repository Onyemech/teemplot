-- Updated manual index creation with security fixes
-- Run these commands separately outside transactions

-- 1. Fix the immutable function issue for the date index
-- First, add a computed column to avoid the immutable function issue
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS clock_in_date DATE 
GENERATED ALWAYS AS (clock_in_time::DATE) STORED;

-- Now create the index on the computed column (this will work)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_user_current_date
ON attendance_records(user_id, clock_in_date) 
WHERE clock_out_time IS NULL;

-- 2. Create the remaining indexes (these are safe to create)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_company_date 
ON attendance_records(company_id, clock_in_time DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_status
ON attendance_records(status, clock_in_time DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_breaks_record_id
ON attendance_breaks(attendance_record_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_working_days 
ON attendance_records(company_id, clock_in_time) 
WHERE clock_in_time IS NOT NULL;

-- 3. Create the materialized view for dashboard statistics
-- Note: Run this after all indexes are created for best performance
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

-- 4. Create optimized indexes for auto-attendance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_locations_recent 
ON user_locations(user_id, company_id, created_at DESC) 
WHERE created_at >= NOW() - INTERVAL '10 minutes';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_today_open 
ON attendance_records(user_id, company_id) 
WHERE clock_out_time IS NULL 
AND clock_in_time::DATE = CURRENT_DATE;