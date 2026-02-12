-- Fix Tasks Review Status
-- Run this in a transaction
BEGIN;

-- 1. Ensure columns exist
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS review_status VARCHAR(50);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS marked_complete_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS marked_complete_by UUID REFERENCES users(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_hours INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Backfill existing data
-- If a task is 'completed', it implies it was reviewed and approved
UPDATE tasks 
SET review_status = 'approved' 
WHERE status = 'completed' AND review_status IS NULL;

-- If a task is 'in_progress' or 'pending', it has no review status
UPDATE tasks 
SET review_status = 'none' 
WHERE status IN ('pending', 'in_progress') AND review_status IS NULL;

-- 3. Fix any legacy data that might be stuck in "awaiting_review" status but missing the column value
UPDATE tasks
SET review_status = 'pending_review'
WHERE status = 'awaiting_review' AND review_status IS NULL;

COMMIT;
