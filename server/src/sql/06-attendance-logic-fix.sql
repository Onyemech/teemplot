-- PART 6: ATTENDANCE LOGIC FIXES - Run this in a transaction
BEGIN;

-- 0. CLEANUP: Fix existing duplicates before creating index
-- This finds users with multiple open sessions and closes the OLDER ones
WITH duplicates AS (
    SELECT id 
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY clock_in_time DESC) as rn
        FROM attendance_records
        WHERE clock_out_time IS NULL
    ) t
    WHERE rn > 1 -- Keep the newest one (rn=1), select all others
)
UPDATE attendance_records
SET 
    clock_out_time = clock_in_time::DATE + TIME '23:59:59',
    status = 'system_cleanup',
    notes = COALESCE(notes, '') || ' | Auto-closed duplicate open session',
    updated_at = NOW()
WHERE id IN (SELECT id FROM duplicates);

-- 1. Prevent multiple active sessions
-- This partial index ensures a user can only have ONE open session (clock_out_time IS NULL) at a time.
-- This effectively blocks "double clock-in" even if the previous one was yesterday.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_session 
ON attendance_records (user_id) 
WHERE clock_out_time IS NULL;


-- 2. Create the Force Clock-out Function
-- This function will be called by a nightly cron job (e.g., at 11:58 PM or 04:00 AM)
-- It finds ANY open session older than 16 hours and closes it.
CREATE OR REPLACE FUNCTION force_clockout_stale_sessions()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    WITH stale_sessions AS (
        SELECT id, user_id, clock_in_time 
        FROM attendance_records 
        WHERE clock_out_time IS NULL 
        AND clock_in_time < NOW() - INTERVAL '16 hours' -- Safety buffer
    ),
    updated_rows AS (
        UPDATE attendance_records ar
        SET 
            clock_out_time = ar.clock_in_time::DATE + TIME '23:59:59', -- Set to end of THAT day
            status = 'system_force_out', -- Special status flag
            notes = COALESCE(notes, '') || ' | System force clock-out (Forgot to clock out)',
            updated_at = NOW()
        FROM stale_sessions ss
        WHERE ar.id = ss.id
        RETURNING ar.id
    )
    SELECT COUNT(*) INTO updated_count FROM updated_rows;

    -- Note: Ideally we would insert into audit_logs here, but we'll return the count 
    -- and let the application layer handle detailed logging if needed.
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Secure the function
ALTER FUNCTION force_clockout_stale_sessions() OWNER TO postgres;
ALTER FUNCTION force_clockout_stale_sessions() SET search_path = public;

COMMIT;
