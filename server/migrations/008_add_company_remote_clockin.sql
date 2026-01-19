-- Migration: Add Global Remote Clocking Toggle
-- Description: Adds allow_remote_clockin to companies table for global management

BEGIN;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS allow_remote_clockin BOOLEAN DEFAULT FALSE;

-- Sync the setting if company_settings already has it (some migrations might have added it there)
-- Based on previous audit, company_settings.allow_remote_clockin might exist
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_settings' AND column_name='allow_remote_clockin') THEN
        UPDATE companies c
        SET allow_remote_clockin = cs.allow_remote_clockin
        FROM company_settings cs
        WHERE c.id = cs.company_id;
    END IF;
END $$;

COMMIT;
