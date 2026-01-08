-- Add remote clocking settings
BEGIN;

-- Add allow_remote_clockin to company_settings
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS allow_remote_clockin BOOLEAN DEFAULT FALSE;

-- Add remote_work_days to users
-- Stores array of day integers (0=Sunday, 1=Monday, etc. or 1-7 ISO)
-- Let's assume ISO 1-7 (Monday-Sunday) to match company_settings.working_days
ALTER TABLE users ADD COLUMN IF NOT EXISTS remote_work_days INTEGER[] DEFAULT ARRAY[]::INTEGER[];

COMMIT;
