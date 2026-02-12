-- Fix missing started_at column in tasks table
-- Run this in a transaction
BEGIN;

-- 1. Check if started_at column exists
-- If it doesn't exist, add it:
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- 2. Backfill existing data
-- If a task is 'in_progress', set started_at to updated_at as a best guess
UPDATE tasks 
SET started_at = updated_at 
WHERE status = 'in_progress' AND started_at IS NULL;

-- If a task is 'completed' or 'awaiting_review', set started_at to created_at if missing (fallback)
UPDATE tasks
SET started_at = created_at
WHERE status IN ('completed', 'awaiting_review') AND started_at IS NULL;

COMMIT;
