-- Add missing address and geocoding columns to SQLite schema
-- These columns exist in Supabase but are missing from SQLite

-- Add formatted_address column
ALTER TABLE companies ADD COLUMN formatted_address TEXT;

-- Add street_number column
ALTER TABLE companies ADD COLUMN street_number TEXT;

-- Add street_name column
ALTER TABLE companies ADD COLUMN street_name TEXT;

-- Add place_id column
ALTER TABLE companies ADD COLUMN place_id TEXT;

-- Add geocoding_accuracy column
ALTER TABLE companies ADD COLUMN geocoding_accuracy TEXT;

-- Add geocoding_source column
ALTER TABLE companies ADD COLUMN geocoding_source TEXT DEFAULT 'google_places';

-- Add geocoded_at column
ALTER TABLE companies ADD COLUMN geocoded_at TEXT;

-- Add time_format column
ALTER TABLE companies ADD COLUMN time_format TEXT DEFAULT '24h';

-- Add date_format column
ALTER TABLE companies ADD COLUMN date_format TEXT DEFAULT 'DD/MM/YYYY';

-- Add currency column
ALTER TABLE companies ADD COLUMN currency TEXT DEFAULT 'NGN';

-- Add language column
ALTER TABLE companies ADD COLUMN language TEXT DEFAULT 'en';

-- Create index on place_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_place_id ON companies(place_id) WHERE place_id IS NOT NULL;
