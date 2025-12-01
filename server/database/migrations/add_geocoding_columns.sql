-- Migration: Add geocoding columns to companies table
-- Date: 2025-11-30
-- Description: Adds detailed address and geocoding columns for better location tracking

-- Add formatted_address column
ALTER TABLE companies ADD COLUMN formatted_address TEXT;

-- Add street_number column
ALTER TABLE companies ADD COLUMN street_number TEXT;

-- Add street_name column
ALTER TABLE companies ADD COLUMN street_name TEXT;

-- Add place_id column (Google Places ID)
ALTER TABLE companies ADD COLUMN place_id TEXT;

-- Add geocoding_accuracy column
ALTER TABLE companies ADD COLUMN geocoding_accuracy TEXT;

-- Add geocoding_source column (e.g., 'google', 'manual')
ALTER TABLE companies ADD COLUMN geocoding_source TEXT;

-- Add geocoded_at timestamp
ALTER TABLE companies ADD COLUMN geocoded_at TEXT;

-- Create index on place_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_place_id ON companies(place_id) WHERE deleted_at IS NULL;

-- Create index on geocoded_at for tracking
CREATE INDEX IF NOT EXISTS idx_companies_geocoded_at ON companies(geocoded_at) WHERE deleted_at IS NULL;
