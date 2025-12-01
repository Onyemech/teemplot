-- SQLite Migration: Add geocoding fields to companies table
-- Date: 2025-01-30
-- Purpose: Add detailed geocoding fields for accurate location tracking

-- Add geocoding fields to companies table
ALTER TABLE companies ADD COLUMN formatted_address TEXT;
ALTER TABLE companies ADD COLUMN street_number TEXT;
ALTER TABLE companies ADD COLUMN street_name TEXT;
ALTER TABLE companies ADD COLUMN place_id TEXT;
ALTER TABLE companies ADD COLUMN geocoding_accuracy TEXT;
ALTER TABLE companies ADD COLUMN geocoding_source TEXT DEFAULT 'google_places';
ALTER TABLE companies ADD COLUMN geocoded_at TEXT;

-- Create index for place_id lookups
CREATE INDEX IF NOT EXISTS idx_companies_place_id ON companies(place_id);

-- Create index for geospatial queries
CREATE INDEX IF NOT EXISTS idx_companies_location ON companies(office_latitude, office_longitude);
