-- Migration: Add onboarding columns to PostgreSQL
-- Date: 2025-11-22
-- Description: Add missing columns for onboarding flow

BEGIN;

-- Add missing columns to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS state_province VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS employee_count INTEGER DEFAULT 1;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS cac_document_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS proof_of_address_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_policy_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_first_name VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_last_name VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_email VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_phone VARCHAR(20);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_date_of_birth DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_identification_number VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ;

-- Fix role constraint to include 'owner'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('owner', 'admin', 'staff'));

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_companies_onboarding_completed 
  ON companies(onboarding_completed) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_companies_trial_end_date 
  ON companies(trial_end_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_companies_employee_count 
  ON companies(employee_count) WHERE deleted_at IS NULL;

COMMIT;
