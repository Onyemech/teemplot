-- Migration: Role-Based Dashboard System Schema
-- Date: 2025-12-05
-- Description: Complete schema for enterprise-grade role-based dashboard with tenant isolation
-- Requirements: 1.6, 2.3, 11.5, 12.6, 15.1-15.7, 16.1-16.7

BEGIN;

-- ============================================================================
-- COMPANIES TABLE UPDATES
-- ============================================================================

-- Add subscription management columns
ALTER TABLE companies ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ DEFAULT NOW() + INTERVAL '365 days';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'free';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS employee_limit INTEGER DEFAULT 5;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS add_on_seats INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_billing_event JSONB;

-- Add office location columns for self-healing calibration
ALTER TABLE companies ADD COLUMN IF NOT EXISTS office_latitude DECIMAL(10, 8);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS office_longitude DECIMAL(11, 8);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS office_location_updated_at TIMESTAMPTZ;

-- Add CHECK constraint for plan values
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_plan_check;
ALTER TABLE companies ADD CONSTRAINT companies_plan_check 
  CHECK (plan IN ('free', 'silver', 'gold'));

-- Add CHECK constraint for employee limits
ALTER TABLE companies ADD CONSTRAINT companies_employee_limit_positive 
  CHECK (employee_limit > 0);
ALTER TABLE companies ADD CONSTRAINT companies_add_on_seats_non_negative 
  CHECK (add_on_seats >= 0);

-- ============================================================================
-- EMPLOYEE INVITATIONS TABLE UPDATES
-- ============================================================================

-- Ensure employee_invitations table has all required columns
ALTER TABLE employee_invitations ADD COLUMN IF NOT EXISTS company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE employee_invitations ADD COLUMN IF NOT EXISTS invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE employee_invitations ADD COLUMN IF NOT EXISTS email VARCHAR(255) NOT NULL;
ALTER TABLE employee_invitations ADD COLUMN IF NOT EXISTS first_name VARCHAR(100) NOT NULL;
ALTER TABLE employee_invitations ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) NOT NULL;
ALTER TABLE employee_invitations ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL;
ALTER TABLE employee_invitations ADD COLUMN IF NOT EXISTS position VARCHAR(100);
ALTER TABLE employee_invitations ADD COLUMN IF NOT EXISTS invitation_token VARCHAR(255) UNIQUE NOT NULL;
ALTER TABLE employee_invitations ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE employee_invitations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL;
ALTER TABLE employee_invitations ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE employee_invitations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Add CHECK constraint for invitation status
ALTER TABLE employee_invitations DROP CONSTRAINT IF EXISTS employee_invitations_status_check;
ALTER TABLE employee_invitations ADD CONSTRAINT employee_invitations_status_check 
  CHECK (status IN ('pending', 'accepted', 'expired'));

-- Add CHECK constraint for invitation role
ALTER TABLE employee_invitations DROP CONSTRAINT IF EXISTS employee_invitations_role_check;
ALTER TABLE employee_invitations ADD CONSTRAINT employee_invitations_role_check 
  CHECK (role IN ('owner', 'admin', 'staff'));

-- ============================================================================
-- COMPANY SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Working hours settings
  working_hours_start TIME NOT NULL DEFAULT '09:00:00',
  working_hours_end TIME NOT NULL DEFAULT '17:00:00',
  working_days INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5], -- 1=Monday, 7=Sunday
  
  -- Attendance settings
  late_grace_period_minutes INTEGER NOT NULL DEFAULT 15,
  geofence_radius_meters INTEGER NOT NULL DEFAULT 100,
  overtime_multiplier DECIMAL(3, 2) NOT NULL DEFAULT 1.5,
  
  -- Leave policy settings
  annual_leave_days INTEGER NOT NULL DEFAULT 20,
  leave_approval_workflow VARCHAR(50) NOT NULL DEFAULT 'single_admin',
  blackout_dates DATE[],
  leave_types JSONB NOT NULL DEFAULT '[]',
  
  -- Notification preferences
  notification_preferences JSONB NOT NULL DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT company_settings_grace_period_positive CHECK (late_grace_period_minutes >= 0),
  CONSTRAINT company_settings_geofence_positive CHECK (geofence_radius_meters > 0),
  CONSTRAINT company_settings_overtime_positive CHECK (overtime_multiplier > 0),
  CONSTRAINT company_settings_annual_leave_positive CHECK (annual_leave_days > 0),
  CONSTRAINT company_settings_working_days_valid CHECK (array_length(working_days, 1) > 0)
);

-- ============================================================================
-- OFFICE LOCATION CALIBRATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS office_location_calibration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  gps_accuracy_meters DECIMAL(6, 2) NOT NULL,
  clock_in_timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT calibration_latitude_valid CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT calibration_longitude_valid CHECK (longitude >= -180 AND longitude <= 180),
  CONSTRAINT calibration_accuracy_positive CHECK (gps_accuracy_meters > 0)
);

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT notifications_type_check CHECK (type IN ('attendance', 'task', 'leave', 'system', 'invitation', 'settings'))
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Companies indexes
CREATE INDEX IF NOT EXISTS idx_companies_current_period_end 
  ON companies(current_period_end) 
  WHERE current_period_end IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_companies_plan 
  ON companies(plan) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_companies_expiring_soon 
  ON companies(current_period_end) 
  WHERE current_period_end <= NOW() + INTERVAL '14 days' AND deleted_at IS NULL;

-- Employee invitations indexes
CREATE INDEX IF NOT EXISTS idx_invitations_company_id 
  ON employee_invitations(company_id);

CREATE INDEX IF NOT EXISTS idx_invitations_token 
  ON employee_invitations(invitation_token);

CREATE INDEX IF NOT EXISTS idx_invitations_status 
  ON employee_invitations(status);

CREATE INDEX IF NOT EXISTS idx_invitations_company_status 
  ON employee_invitations(company_id, status);

CREATE INDEX IF NOT EXISTS idx_invitations_expires_at 
  ON employee_invitations(expires_at) 
  WHERE status = 'pending';

-- Company settings indexes
CREATE INDEX IF NOT EXISTS idx_settings_company_id 
  ON company_settings(company_id);

-- Office location calibration indexes
CREATE INDEX IF NOT EXISTS idx_calibration_company_id 
  ON office_location_calibration(company_id);

CREATE INDEX IF NOT EXISTS idx_calibration_timestamp 
  ON office_location_calibration(clock_in_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_calibration_accuracy 
  ON office_location_calibration(gps_accuracy_meters) 
  WHERE gps_accuracy_meters <= 30;

CREATE INDEX IF NOT EXISTS idx_calibration_company_recent 
  ON office_location_calibration(company_id, clock_in_timestamp DESC) 
  WHERE gps_accuracy_meters <= 30;

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_company_id 
  ON audit_logs(company_id);

CREATE INDEX IF NOT EXISTS idx_audit_user_id 
  ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_created_at 
  ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_action 
  ON audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_audit_entity 
  ON audit_logs(entity_type, entity_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
  ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_company_id 
  ON notifications(company_id);

CREATE INDEX IF NOT EXISTS idx_notifications_read 
  ON notifications(read) 
  WHERE read = FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
  ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON notifications(user_id, read, created_at DESC) 
  WHERE read = FALSE;

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_location_calibration ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_invitations ENABLE ROW LEVEL SECURITY;

-- Company settings RLS policy
CREATE POLICY company_settings_tenant_isolation ON company_settings
  FOR ALL
  USING (company_id = current_setting('app.current_tenant_id', true)::UUID);

-- Office location calibration RLS policy
CREATE POLICY calibration_tenant_isolation ON office_location_calibration
  FOR ALL
  USING (company_id = current_setting('app.current_tenant_id', true)::UUID);

-- Audit logs RLS policy (read-only for users)
CREATE POLICY audit_tenant_isolation ON audit_logs
  FOR SELECT
  USING (company_id = current_setting('app.current_tenant_id', true)::UUID);

-- Notifications RLS policy (user can only see their own)
CREATE POLICY notifications_user_isolation ON notifications
  FOR ALL
  USING (
    company_id = current_setting('app.current_tenant_id', true)::UUID
    AND user_id = current_setting('app.current_user_id', true)::UUID
  );

-- Employee invitations RLS policy
CREATE POLICY invitations_tenant_isolation ON employee_invitations
  FOR ALL
  USING (company_id = current_setting('app.current_tenant_id', true)::UUID);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE company_settings IS 'Tenant-isolated company-wide settings for attendance, leave, and notifications';
COMMENT ON TABLE office_location_calibration IS 'Rolling buffer of clock-in coordinates for self-healing office location';
COMMENT ON TABLE audit_logs IS 'Append-only audit trail of all settings changes and critical actions';
COMMENT ON TABLE notifications IS 'User notifications for attendance, tasks, leave requests, and system alerts';

COMMENT ON COLUMN companies.current_period_end IS 'Subscription expiry timestamp for billing and warnings';
COMMENT ON COLUMN companies.plan IS 'Subscription plan: free, silver, or gold';
COMMENT ON COLUMN companies.employee_limit IS 'Maximum employees allowed (declared + add-on seats)';
COMMENT ON COLUMN companies.add_on_seats IS 'Additional employee seats purchased mid-cycle';
COMMENT ON COLUMN companies.last_billing_event IS 'JSONB audit of last billing transaction';

COMMENT ON COLUMN company_settings.working_days IS 'Array of working days (1=Monday, 7=Sunday)';
COMMENT ON COLUMN company_settings.leave_types IS 'JSONB array of leave types with day allocations';
COMMENT ON COLUMN company_settings.notification_preferences IS 'JSONB of notification delivery rules';

COMMENT ON COLUMN office_location_calibration.gps_accuracy_meters IS 'GPS accuracy in meters (only ≤30m used for calibration)';

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for company_settings
DROP TRIGGER IF EXISTS update_company_settings_updated_at ON company_settings;
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all tables exist
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM information_schema.tables 
          WHERE table_name IN ('company_settings', 'office_location_calibration', 'audit_logs', 'notifications')) = 4,
         'Not all required tables were created';
  
  RAISE NOTICE 'Migration completed successfully. All tables and indexes created.';
END $$;

