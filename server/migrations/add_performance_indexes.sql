-- Performance Indexes Migration
-- Created: December 1, 2025
-- Purpose: Optimize database queries for production workload

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email_company ON users(email, company_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Companies table indexes
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_companies_onboarding ON companies(onboarding_completed);

-- Security events indexes
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Onboarding progress indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_company_id ON onboarding_progress(company_id);

-- Refresh tokens indexes
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- Files indexes
CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);

-- User files indexes
CREATE INDEX IF NOT EXISTS idx_user_files_user_id ON user_files(user_id);
CREATE INDEX IF NOT EXISTS idx_user_files_file_id ON user_files(file_id);
CREATE INDEX IF NOT EXISTS idx_user_files_type ON user_files(file_type);

-- Super admins indexes
CREATE INDEX IF NOT EXISTS idx_super_admins_email ON super_admins(email);
CREATE INDEX IF NOT EXISTS idx_super_admins_google_id ON super_admins(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_super_admins_active ON super_admins(is_active) WHERE is_active = true;

-- Add comments for documentation
COMMENT ON INDEX idx_users_email IS 'Optimize user lookup by email during login';
COMMENT ON INDEX idx_users_email_company IS 'Composite index for company-scoped user queries';
COMMENT ON INDEX idx_companies_slug IS 'Optimize company lookup by slug for multi-tenant routing';
COMMENT ON INDEX idx_security_events_created_at IS 'Optimize security event queries by time range';

-- Analyze tables to update statistics
ANALYZE users;
ANALYZE companies;
ANALYZE security_events;
ANALYZE audit_logs;
ANALYZE onboarding_progress;
ANALYZE refresh_tokens;
ANALYZE files;
ANALYZE user_files;
ANALYZE super_admins;
