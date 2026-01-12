-- Create attendance_breaks table
CREATE TABLE IF NOT EXISTS attendance_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id UUID NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_attendance_breaks_record_id ON attendance_breaks(attendance_record_id);

-- Alter companies table to add break settings
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS breaks_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS max_break_duration_minutes INTEGER DEFAULT 60;
