BEGIN;

-- Create table to track per-user device location updates and permission state
CREATE TABLE IF NOT EXISTS user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  accuracy NUMERIC,
  permission_state VARCHAR(16) NOT NULL, -- 'granted' | 'denied' | 'prompt' | 'unavailable'
  is_inside_geofence BOOLEAN,            -- computed at insert based on check_geofence
  distance_meters NUMERIC,               -- distance to nearest geofence point
  location_id UUID REFERENCES company_locations(id) ON DELETE SET NULL,
  location_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast lookup in cron and queries
CREATE INDEX IF NOT EXISTS idx_user_locations_user_time ON user_locations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_locations_company_time ON user_locations(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_locations_geofence ON user_locations(company_id, is_inside_geofence);

-- Function to insert a user location and compute geofence state
CREATE OR REPLACE FUNCTION insert_user_location(
  p_company_id UUID,
  p_user_id UUID,
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_accuracy NUMERIC,
  p_permission_state VARCHAR
) RETURNS UUID AS $$
DECLARE
  gf RECORD;
  new_id UUID;
BEGIN
  -- Evaluate geofence using existing helper
  SELECT * INTO gf FROM check_geofence(p_company_id, p_latitude, p_longitude) LIMIT 1;

  INSERT INTO user_locations (
    company_id, user_id, latitude, longitude, accuracy,
    permission_state, is_inside_geofence, distance_meters,
    location_id, location_name
  ) VALUES (
    p_company_id, p_user_id, p_latitude, p_longitude, p_accuracy,
    p_permission_state,
    COALESCE(gf.is_within, NULL),
    COALESCE(gf.distance_meters, NULL),
    COALESCE(gf.location_id, NULL),
    COALESCE(gf.location_name, NULL)
  )
  RETURNING id INTO new_id;

  -- Update user's last_location_verified_at when permission is granted
  IF p_permission_state = 'granted' THEN
    UPDATE users
    SET last_location_verified_at = NOW()
    WHERE id = p_user_id;
  END IF;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;
