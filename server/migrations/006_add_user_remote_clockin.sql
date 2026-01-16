-- Migration: Add Per-User Remote Clocking Flag
-- Description: Adds allow_remote_clockin to users table for individual permission management

BEGIN;

-- Add allow_remote_clockin to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_remote_clockin BOOLEAN DEFAULT FALSE;

-- Optional: If we want to allow admins to set specific remote work days
-- This was partially done in add_remote_clocking.sql but let's ensure it's here if needed
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS remote_work_days INTEGER[] DEFAULT ARRAY[]::INTEGER[];

COMMIT;
