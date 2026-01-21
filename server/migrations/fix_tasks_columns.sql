-- Fix missing columns in tasks table
-- Run these SQL commands in your database

-- 1. Check if created_by column exists (it should, based on the code)
-- If it doesn't exist, add it:
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- 2. Add tags column for task categorization
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- 3. Check if other commonly needed columns exist
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS marked_complete_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS marked_complete_by UUID REFERENCES users(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_hours INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS review_status VARCHAR(50);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);

-- 4. Ensure the column exists in attendance_records for the break status
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_status_check;
ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_status_check 
CHECK (status IN ('present', 'late_arrival', 'early_departure', 'on_leave', 'absent', 'on_break'));

-- 5. Add location_last_updated_at for the location endpoint
ALTER TABLE companies ADD COLUMN IF NOT EXISTS location_last_updated_at TIMESTAMPTZ;

COMMIT;
