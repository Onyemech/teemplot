-- Add geocoding columns to companies table
-- Migration: add_geocoding_columns
-- Date: 2025-11-30

-- Add new geocoding columns
ALTER TABLE companies ADD COLUMN formatted_address TEXT;
ALTER TABLE companies ADD COLUMN street_number TEXT;
ALTER TABLE companies ADD COLUMN street_name TEXT;
ALTER TABLE companies ADD COLUMN place_id TEXT;
ALTER TABLE companies ADD COLUMN geocoding_accuracy TEXT;
ALTER TABLE companies ADD COLUMN geocoding_source TEXT DEFAULT 'google_places';
ALTER TABLE companies ADD COLUMN geocoded_at TEXT;

-- Create index for place_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_place_id ON companies(place_id) WHERE deleted_at IS NULL;

-- Update existing records to have geocoding_source
UPDATE companies SET geocoding_source = 'manual' WHERE geocoding_source IS NULL;
