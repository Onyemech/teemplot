BEGIN;

-- ============================================================================
-- COMPANY LOCATIONS TABLE (Multiple Clocking Points)
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  address TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  geofence_radius_meters INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT company_locations_radius_positive CHECK (geofence_radius_meters > 0),
  CONSTRAINT company_locations_latitude_valid CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT company_locations_longitude_valid CHECK (longitude >= -180 AND longitude <= 180)
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_company_locations_company_id ON company_locations(company_id);
CREATE INDEX IF NOT EXISTS idx_company_locations_active ON company_locations(company_id, is_active);

-- ============================================================================
-- USERS TABLE UPDATE
-- ============================================================================

-- Add flag to allow employees to clock in from any company location
ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_multi_location_clockin BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE company_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY company_locations_tenant_isolation ON company_locations
  FOR ALL
  USING (company_id = current_setting('app.current_tenant_id', true)::UUID);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_company_locations_updated_at ON company_locations;
CREATE TRIGGER update_company_locations_updated_at
  BEFORE UPDATE ON company_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
