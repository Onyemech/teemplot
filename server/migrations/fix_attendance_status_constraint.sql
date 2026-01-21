-- Fix attendance_records status check constraint to include 'on_break'
-- This allows employees to take breaks during their shift

BEGIN;

-- Drop the existing constraint if it exists
ALTER TABLE attendance_records 
DROP CONSTRAINT IF EXISTS attendance_records_status_check;

-- Add the new constraint with 'on_break' included
ALTER TABLE attendance_records 
ADD CONSTRAINT attendance_records_status_check 
CHECK (status IN ('present', 'late_arrival', 'early_departure', 'on_leave', 'absent', 'on_break'));

COMMIT;
