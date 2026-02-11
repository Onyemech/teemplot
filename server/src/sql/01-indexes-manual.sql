-- PART 1: INDEXES - Run these OUTSIDE transactions (one by one)
-- Copy and paste each CREATE INDEX line individually:

-- 1. Optimized index for finding ACTIVE (open) attendance records
-- Removed CURRENT_DATE check to fix "functions must be immutable" error
-- This is still very fast because it only includes rows where clock_out_time is NULL (a small % of table)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_active_sessions
ON attendance_records(user_id, company_id, clock_in_time DESC)
WHERE clock_out_time IS NULL;

-- 2. General index for filtering attendance by company and date (Historical lookups)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_company_date 
ON attendance_records(company_id, clock_in_time DESC);

-- 3. Index for status filtering (Dashboard stats)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_status
ON attendance_records(status, clock_in_time DESC);

-- 4. Index for breaks (Performance fix for joins)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_breaks_record_id
ON attendance_breaks(attendance_record_id);

-- 5. Index for working days calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_working_days 
ON attendance_records(company_id, clock_in_time) 
WHERE clock_in_time IS NOT NULL;

-- 6. Optimized index for User Locations
-- Removed NOW() check to fix "functions must be immutable" error
-- Standard B-Tree index is sufficient for fast time-range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_locations_lookup 
ON user_locations(user_id, company_id, created_at DESC);
