-- Add biometrics_required column to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS biometrics_required BOOLEAN DEFAULT false;
