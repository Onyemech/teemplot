-- Migration: Standardize audit_logs metadata
-- Date: 2026-02-01

BEGIN;

-- Add metadata column if it doesn't exist
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB;

-- If changes column exists, copy data to metadata (if metadata is null)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'changes') THEN
    UPDATE audit_logs SET metadata = changes WHERE metadata IS NULL;
  END IF;
END $$;

-- If new_value column exists, copy data to metadata (if metadata is null)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'new_value') THEN
    UPDATE audit_logs SET metadata = new_value WHERE metadata IS NULL;
  END IF;
END $$;

COMMIT;
