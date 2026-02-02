BEGIN;

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS allow_remote_clockin_on_non_working_days BOOLEAN DEFAULT FALSE;

ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS allow_remote_clockin_on_non_working_days BOOLEAN DEFAULT FALSE;

COMMIT;

