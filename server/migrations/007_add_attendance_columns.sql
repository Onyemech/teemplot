
BEGIN;

-- Add location_id (UUID)
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES company_locations(id) ON DELETE SET NULL;

-- Add location_address (VARCHAR)
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS location_address VARCHAR(255);

-- Ensure clock_in_location exists (JSONB)
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS clock_in_location JSONB;

-- Ensure clock_in_distance_meters exists (NUMERIC)
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS clock_in_distance_meters NUMERIC;

-- Ensure is_within_geofence exists (BOOLEAN)
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS is_within_geofence BOOLEAN;

-- Ensure check_in_method exists (VARCHAR)
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS check_in_method VARCHAR(50);

COMMIT;
