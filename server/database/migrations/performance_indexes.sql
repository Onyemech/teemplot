-- Performance optimization indexes for authentication and core operations
-- This migration adds critical indexes to improve query performance

-- ============================================
-- AUTHENTICATION PERFORMANCE INDEXES
-- ============================================

-- Email verification codes - optimize for login/registration flows
CREATE INDEX IF NOT EXISTS idx_email_verification_active 
ON email_verification_codes(email, code, expires_at) 
WHERE verified_at IS NULL AND expires_at > NOW();

-- Users - optimize for authentication queries
CREATE INDEX IF NOT EXISTS idx_users_auth_lookup 
ON users(email, company_id, is_active) 
WHERE deleted_at IS NULL;

-- Users - optimize for company-based queries
CREATE INDEX IF NOT EXISTS idx_users_company_active 
ON users(company_id, is_active, role) 
WHERE deleted_at IS NULL;

-- ============================================
-- SESSION MANAGEMENT INDEXES
-- ============================================

-- Refresh tokens - optimize for token validation
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active 
ON refresh_tokens(user_id, expires_at) 
WHERE revoked_at IS NULL AND expires_at > NOW();

-- Refresh tokens - optimize for super admin sessions
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_super_admin_active 
ON refresh_tokens(super_admin_id, expires_at) 
WHERE revoked_at IS NULL AND expires_at > NOW();

-- ============================================
-- COMPANY & TENANCY INDEXES
-- ============================================

-- Companies - optimize for subscription queries
CREATE INDEX IF NOT EXISTS idx_companies_subscription_lookup 
ON companies(subscription_status, subscription_end_date, is_active) 
WHERE deleted_at IS NULL;

-- Companies - optimize for slug-based queries
CREATE INDEX IF NOT EXISTS idx_companies_slug_active 
ON companies(slug, is_active) 
WHERE deleted_at IS NULL;

-- ============================================
-- ATTENDANCE PERFORMANCE INDEXES
-- ============================================

-- Attendance records - optimize for daily queries
CREATE INDEX IF NOT EXISTS idx_attendance_daily_lookup 
ON attendance_records(user_id, company_id, clock_in_time::date) 
WHERE created_at > NOW() - INTERVAL '90 days';

-- Attendance records - optimize for geofence checks
CREATE INDEX IF NOT EXISTS idx_attendance_geofence_check 
ON attendance_records(user_id, is_within_geofence, clock_in_time) 
WHERE created_at > NOW() - INTERVAL '7 days';

-- ============================================
-- AUDIT LOG PERFORMANCE INDEXES
-- ============================================

-- Audit logs - optimize for security event queries
CREATE INDEX IF NOT EXISTS idx_audit_security_events 
ON audit_logs(action, user_id, created_at DESC) 
WHERE action IN ('login', 'logout', 'failed_login', 'password_reset', 'suspicious_activity', 'access_denied');

-- Audit logs - optimize for recent activity queries
CREATE INDEX IF NOT EXISTS idx_audit_recent_activity 
ON audit_logs(company_id, created_at DESC) 
WHERE created_at > NOW() - INTERVAL '30 days';

-- ============================================
-- EMPLOYEE INVITATION INDEXES
-- ============================================

-- Employee invitations - optimize for invitation validation
CREATE INDEX IF NOT EXISTS idx_invitations_email_status 
ON employee_invitations(email, status, expires_at) 
WHERE expires_at > NOW();

-- Employee invitations - optimize for company-based queries
CREATE INDEX IF NOT EXISTS idx_invitations_company_status 
ON employee_invitations(company_id, status, created_at DESC) 
WHERE deleted_at IS NULL;

-- ============================================
-- TASK MANAGEMENT INDEXES
-- ============================================

-- Tasks - optimize for user task queries
CREATE INDEX IF NOT EXISTS idx_tasks_user_status 
ON tasks(assigned_to, status, due_date) 
WHERE deleted_at IS NULL;

-- Tasks - optimize for company task overview
CREATE INDEX IF NOT EXISTS idx_tasks_company_status 
ON tasks(company_id, status, priority, due_date) 
WHERE deleted_at IS NULL;

-- ============================================
-- LEAVE MANAGEMENT INDEXES (TENANCY-ALIGNED)
-- ============================================

-- Leave requests - optimize for company and review stage
CREATE INDEX IF NOT EXISTS idx_leave_company_stage_status
ON leave_requests(company_id, review_stage, status, user_id, created_at DESC);

-- Leave requests - optimize for department manager visibility
CREATE INDEX IF NOT EXISTS idx_leave_user_department_lookup
ON users(id, company_id, department_id)
WHERE is_active = true;

-- ============================================
-- TAX ASSIGNMENT INDEXES (TENANCY-ALIGNED)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tax_company_status
ON tax_assignments(company_id, status, user_id, created_at DESC);

-- ============================================
-- NOTIFICATION INDEXES
-- ============================================

-- Notifications - optimize for unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread 
ON notifications(user_id, is_read, created_at DESC) 
WHERE deleted_at IS NULL;

-- Notifications - optimize for company notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_company_unread 
ON notifications(company_id, user_id, is_read, created_at DESC) 
WHERE deleted_at IS NULL;

-- ============================================
-- SUBSCRIPTION & BILLING INDEXES
-- ============================================

-- Subscriptions - optimize for active subscription queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_active_lookup 
ON subscriptions(company_id, status, current_period_end) 
WHERE status IN ('active', 'trialing') AND deleted_at IS NULL;

-- Payment methods - optimize for billing queries
CREATE INDEX IF NOT EXISTS idx_payment_methods_company_default 
ON payment_methods(company_id, is_default, is_active) 
WHERE deleted_at IS NULL;

-- ============================================
-- INDEX MAINTENANCE & MONITORING
-- ============================================

-- Update statistics for query planner
ANALYZE;

-- Log successful migration
INSERT INTO audit_logs (action, entity_type, entity_id, changes, ip_address, user_agent, created_at) 
VALUES ('migration_applied', 'database', 'performance_indexes', 
        '{"description": "Added performance optimization indexes for authentication and core operations"}', 
        '127.0.0.1', 'migration_script', NOW());

-- Verify index creation
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE indexname LIKE 'idx_%' 
AND tablename IN ('users', 'email_verification_codes', 'refresh_tokens', 'companies', 'attendance_records', 'audit_logs', 'employee_invitations', 'tasks', 'notifications', 'subscriptions', 'payment_methods')
ORDER BY tablename, indexname;
