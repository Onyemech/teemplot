-- Migration: Fix RLS Policy Conflicts
-- This migration removes conflicting Supabase auth-based RLS policies
-- and ensures ONLY session variable-based policies exist for Fastify authentication

-- ============================================================================
-- STEP 1: DROP ALL CONFLICTING SUPABASE AUTH-BASED POLICIES
-- ============================================================================

-- Drop old auth.uid() based policies on notifications
DROP POLICY IF EXISTS "Service role can manage notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;

-- Drop old auth.uid() based policies on audit_logs
DROP POLICY IF EXISTS "Service role can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can view company audit logs" ON audit_logs;

-- ============================================================================
-- STEP 2: ENSURE CORRECT SESSION VARIABLE-BASED POLICIES EXIST
-- ============================================================================

-- Notifications: User isolation (company_id + user_id from session variables)
DROP POLICY IF EXISTS "notifications_user_isolation" ON notifications;
CREATE POLICY "notifications_user_isolation" ON notifications
  FOR ALL
  USING (
    company_id = current_setting('app.current_tenant_id', true)::UUID
    AND user_id = current_setting('app.current_user_id', true)::UUID
  );

-- Audit Logs: Tenant isolation (company_id from session variable, read-only)
DROP POLICY IF EXISTS "audit_tenant_isolation" ON audit_logs;
CREATE POLICY "audit_tenant_isolation" ON audit_logs
  FOR SELECT
  USING (company_id = current_setting('app.current_tenant_id', true)::UUID);

-- Audit Logs: Allow service role to insert (for backend audit logging)
CREATE POLICY "audit_logs_insert_only" ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Company Settings: Tenant isolation (company_id from session variable)
DROP POLICY IF EXISTS "company_settings_tenant_isolation" ON company_settings;
CREATE POLICY "company_settings_tenant_isolation" ON company_settings
  FOR ALL
  USING (company_id = current_setting('app.current_tenant_id', true)::UUID);

-- ============================================================================
-- STEP 3: VERIFY NO CONFLICTING POLICIES REMAIN
-- ============================================================================

-- This query should return ONLY session variable-based policies
-- Run this to verify: SELECT tablename, policyname, qual FROM pg_policies 
-- WHERE tablename IN ('notifications', 'audit_logs', 'company_settings');

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================
-- To rollback this migration, you would need to:
-- 1. Drop the session variable-based policies
-- 2. Recreate the Supabase auth-based policies
-- However, this is NOT recommended as it would break Fastify authentication

COMMENT ON TABLE notifications IS 'RLS enforced via session variables (app.current_tenant_id, app.current_user_id)';
COMMENT ON TABLE audit_logs IS 'RLS enforced via session variables (app.current_tenant_id)';
COMMENT ON TABLE company_settings IS 'RLS enforced via session variables (app.current_tenant_id)';
