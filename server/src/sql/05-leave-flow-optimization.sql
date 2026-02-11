-- PART 1: OPTIMIZATION INDEXES
-- Run these OUTSIDE of a transaction block (if running manually one-by-one)

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_company_status 
ON leave_requests(company_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_employee 
ON leave_requests(employee_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_dates 
ON leave_requests(start_date, end_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_overlap 
ON leave_requests(employee_id, start_date, end_date) 
WHERE status IN ('pending', 'approved');

-- PART 2: FUNCTIONS & LOGIC
-- Run this in a transaction
BEGIN;

-- Function to check for overlapping leave requests
-- Returns TRUE if overlap exists, FALSE otherwise
CREATE OR REPLACE FUNCTION check_leave_overlap(
    employee_id_param UUID,
    start_date_param DATE,
    end_date_param DATE
)
RETURNS BOOLEAN AS $$
DECLARE
    overlap_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM leave_requests 
        WHERE employee_id = employee_id_param
        AND status IN ('pending', 'approved')
        AND (
            (start_date <= end_date_param) AND (end_date >= start_date_param)
        )
    ) INTO overlap_exists;
    
    RETURN overlap_exists;
END;
$$ LANGUAGE plpgsql STABLE;

-- Secure the function
ALTER FUNCTION check_leave_overlap(UUID, DATE, DATE) OWNER TO postgres;
ALTER FUNCTION check_leave_overlap(UUID, DATE, DATE) SET search_path = public;

COMMIT;
