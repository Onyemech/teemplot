-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- COMPANIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  slug VARCHAR(255) UNIQUE,
  logo_url TEXT,
  website TEXT,
  phone VARCHAR(50),
  address TEXT,
  
  -- Settings
  timezone VARCHAR(50) DEFAULT 'UTC',
  work_start_time TIME DEFAULT '09:00:00',
  work_end_time TIME DEFAULT '17:00:00',
  grace_period_minutes INTEGER DEFAULT 15,
  early_departure_threshold_minutes INTEGER DEFAULT 0,
  notify_early_departure BOOLEAN DEFAULT FALSE,
  
  -- Subscription
  plan VARCHAR(20) DEFAULT 'free',
  employee_limit INTEGER DEFAULT 5,
  add_on_seats INTEGER DEFAULT 0,
  current_period_end TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  
  -- Location
  office_latitude DECIMAL(10, 8),
  office_longitude DECIMAL(11, 8),
  geofence_radius_meters INTEGER DEFAULT 100,
  require_geofence_for_clockin BOOLEAN DEFAULT TRUE,
  office_location_updated_at TIMESTAMPTZ,
  location_last_updated_at TIMESTAMPTZ,
  
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  employee_count INTEGER DEFAULT 0
);

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  role VARCHAR(20) CHECK (role IN ('owner', 'admin', 'manager', 'staff', 'employee')),
  
  -- Settings
  remote_work_days INTEGER[],
  allow_multi_location_clockin BOOLEAN DEFAULT FALSE,
  
  -- Meta
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  last_location_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- ATTENDANCE RECORDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  clock_in_time TIMESTAMPTZ NOT NULL,
  clock_out_time TIMESTAMPTZ,
  
  clock_in_location JSONB,
  clock_out_location JSONB,
  
  clock_in_distance_meters DECIMAL,
  clock_out_distance_meters DECIMAL,
  
  is_within_geofence BOOLEAN,
  is_early_departure BOOLEAN,
  is_late_arrival BOOLEAN,
  
  minutes_late INTEGER DEFAULT 0,
  minutes_early INTEGER DEFAULT 0,
  duration_minutes INTEGER DEFAULT 0,
  overtime_minutes INTEGER DEFAULT 0,
  
  status VARCHAR(50), -- present, late, etc.
  notes TEXT,
  early_departure_notified BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- COMPANY SETTINGS TABLE (from 001 migration)
-- ============================================================================
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  
  working_hours_start TIME NOT NULL DEFAULT '09:00:00',
  working_hours_end TIME NOT NULL DEFAULT '17:00:00',
  working_days INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  
  late_grace_period_minutes INTEGER NOT NULL DEFAULT 15,
  geofence_radius_meters INTEGER NOT NULL DEFAULT 100,
  overtime_multiplier DECIMAL(3, 2) NOT NULL DEFAULT 1.5,
  
  allow_remote_clockin BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- OTHER TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_verification_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance_records(user_id, clock_in_time);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
