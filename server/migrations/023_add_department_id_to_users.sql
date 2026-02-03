-- Migration: 023_add_department_id_to_users
-- Description: Add department_id foreign key to users table for primary department association
-- Date: 2026-02-02

BEGIN;

-- Add department_id column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);

COMMIT;
