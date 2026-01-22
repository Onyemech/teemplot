-- Add overtime_minutes column to attendance_records table
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS overtime_minutes INTEGER DEFAULT 0;
