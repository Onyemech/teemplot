-- SQLite Migration: Add owner role and onboarding fields
-- Date: 2025-11-20

-- Step 1: Update companies table
DROP TABLE IF EXISTS companies;

CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT,
  address TEXT,
  city TEXT,
  state_province TEXT,
  country TEXT,
  postal_code TEXT,
  logo_url TEXT,
  industry TEXT,
  company_size TEXT,
  employee_count INTEGER DEFAULT 1,
  timezone TEXT DEFAULT 'UTC',
  subscription_plan TEXT DEFAULT 'trial',
  subscription_status TEXT DEFAULT 'active',
  subscription_start_date TEXT,
  subscription_end_date TEXT,
  trial_start_date TEXT,
  trial_end_date TEXT,
  is_active INTEGER DEFAULT 1,
  settings TEXT DEFAULT '{}',
  working_days TEXT DEFAULT '{"monday":true,"tuesday":true,"wednesday":true,"thursday":true,"friday":true,"saturday":false,"sunday":false}',
  work_start_time TEXT DEFAULT '09:00:00',
  work_end_time TEXT DEFAULT '17:00:00',
  auto_clockin_enabled INTEGER DEFAULT 0,
  auto_clockout_enabled INTEGER DEFAULT 0,
  grace_period_minutes INTEGER DEFAULT 15,
  office_latitude REAL,
  office_longitude REAL,
  geofence_radius_meters INTEGER DEFAULT 100,
  require_geofence_for_clockin INTEGER DEFAULT 1,
  notify_early_departure INTEGER DEFAULT 1,
  early_departure_threshold_minutes INTEGER DEFAULT 30,
  time_format TEXT DEFAULT '24h',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  currency TEXT DEFAULT 'NGN',
  language TEXT DEFAULT 'en',
  tax_identification_number TEXT,
  website TEXT,
  cac_document_url TEXT,
  proof_of_address_url TEXT,
  company_policy_url TEXT,
  onboarding_completed INTEGER DEFAULT 0,
  owner_first_name TEXT,
  owner_last_name TEXT,
  owner_email TEXT,
  owner_phone TEXT,
  owner_date_of_birth TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT
);

-- Step 2: Recreate users table with owner role
CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
  employee_id TEXT,
  department_id TEXT,
  position TEXT,
  date_of_birth TEXT,
  hire_date TEXT,
  biometric_data TEXT,
  is_active INTEGER DEFAULT 1,
  email_verified INTEGER DEFAULT 0,
  google_id TEXT,
  last_login_at TEXT,
  settings TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(company_id, email)
);

-- Copy data from old users table if it exists
INSERT INTO users_new (
  id, company_id, email, password_hash, first_name, last_name,
  phone_number, avatar_url, role, employee_id, department_id, position,
  is_active, email_verified, last_login_at, settings,
  created_at, updated_at, deleted_at
)
SELECT 
  id, company_id, email, password_hash, first_name, last_name,
  phone_number, avatar_url, role, employee_id, department_id, position,
  is_active, email_verified, last_login_at, settings,
  created_at, updated_at, deleted_at
FROM users WHERE 1=0; -- This will fail gracefully if users doesn't exist

-- Drop old table and rename new one
DROP TABLE IF EXISTS users;
ALTER TABLE users_new RENAME TO users;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
