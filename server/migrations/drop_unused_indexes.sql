-- =====================================================
-- Migration: Remove Unused Indexes (Performance Optimization)
-- Date: 2026-01-15
-- Description: Drops unused indexes identified by Supabase database linter
-- Impact: Improves write performance and reduces storage space
-- =====================================================

-- IMPORTANT: These indexes have never been used according to pg_stat_user_indexes
-- Dropping them will improve INSERT/UPDATE/DELETE performance
-- If you later discover you need any of these, you can recreate them

-- =====================================================
-- ATTENDANCE & BREAKS (3 indexes)
-- =====================================================
DROP INDEX IF EXISTS idx_attendance_breaks_record_id;
DROP INDEX IF EXISTS idx_attendance_clock_in;
DROP INDEX IF EXISTS idx_attendance_clock_in_time;

-- =====================================================
-- USERS TABLE (18 indexes)
-- =====================================================
DROP INDEX IF EXISTS idx_users_email_company;
DROP INDEX IF EXISTS idx_users_active;
DROP INDEX IF EXISTS idx_users_company_id;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_users_google_id;
DROP INDEX IF EXISTS idx_users_company_role;
DROP INDEX IF EXISTS idx_users_email_active;
DROP INDEX IF EXISTS idx_users_email_verified;
DROP INDEX IF EXISTS idx_users_is_active;
DROP INDEX IF EXISTS idx_users_company_active;
DROP INDEX IF EXISTS idx_users_email_lower;
DROP INDEX IF EXISTS idx_users_biometric_enrolled;
DROP INDEX IF EXISTS idx_users_biometric_last_used;
DROP INDEX IF EXISTS idx_users_department_id;
DROP INDEX IF EXISTS idx_users_auth_lookup;

-- =====================================================
-- COMPANIES TABLE (15 indexes)
-- =====================================================
DROP INDEX IF EXISTS idx_companies_slug;
DROP INDEX IF EXISTS idx_companies_subscription_status;
DROP INDEX IF EXISTS idx_companies_active;
DROP INDEX IF EXISTS idx_companies_settings;
DROP INDEX IF EXISTS idx_companies_is_active;
DROP INDEX IF EXISTS idx_companies_subscription_active;
DROP INDEX IF EXISTS idx_companies_email;
DROP INDEX IF EXISTS idx_companies_onboarding_completed;
DROP INDEX IF EXISTS idx_companies_trial_end_date;
DROP INDEX IF EXISTS idx_companies_current_period_end;
DROP INDEX IF EXISTS idx_companies_place_id;
DROP INDEX IF EXISTS idx_companies_location;

-- =====================================================
-- REFRESH TOKENS (7 indexes)
-- =====================================================
DROP INDEX IF EXISTS idx_refresh_tokens_token_hash;
DROP INDEX IF EXISTS idx_refresh_tokens_user;
DROP INDEX IF EXISTS idx_refresh_tokens_user_id;
DROP INDEX IF EXISTS idx_refresh_tokens_super_admin_id;
DROP INDEX IF EXISTS idx_refresh_tokens_expires_at;
DROP INDEX IF EXISTS idx_refresh_tokens_revoked_at;

-- =====================================================
-- NOTIFICATIONS (6 indexes)
-- =====================================================
DROP INDEX IF EXISTS idx_notifications_is_read;
DROP INDEX IF EXISTS idx_notifications_created_at;
DROP INDEX IF EXISTS idx_notifications_user;
DROP INDEX IF EXISTS idx_notifications_created_at_desc;
DROP INDEX IF EXISTS idx_notifications_user_read;

-- =====================================================
-- AUDIT LOGS (5 indexes)
-- =====================================================
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_audit_logs_created_at;
DROP INDEX IF EXISTS idx_audit_company;
DROP INDEX IF EXISTS idx_audit_logs_metadata;

-- =====================================================
-- EMAIL VERIFICATION (6 indexes)
-- =====================================================
DROP INDEX IF EXISTS idx_email_verification_email;
DROP INDEX IF EXISTS idx_email_verification_codes_verified_at;
DROP INDEX IF EXISTS idx_email_verification_codes_email;
DROP INDEX IF EXISTS idx_email_verification_codes_expires_at;
DROP INDEX IF EXISTS idx_email_verification_verified;

-- =====================================================
-- ATTENDANCE RECORDS (8 indexes)
-- =====================================================
DROP INDEX IF EXISTS idx_attendance_user_date;
DROP INDEX IF EXISTS idx_attendance_company_id;
DROP INDEX IF EXISTS idx_attendance_status;
DROP INDEX IF EXISTS idx_attendance_company_date;
DROP INDEX IF EXISTS idx_attendance_early_departure;
DROP INDEX IF EXISTS idx_attendance_records_user_company;
DROP INDEX IF EXISTS idx_attendance_records_user_id;

-- =====================================================
-- TASKS (11 indexes)
-- =====================================================
DROP INDEX IF EXISTS idx_tasks_company_id;
DROP INDEX IF EXISTS idx_tasks_assigned_to;
DROP INDEX IF EXISTS idx_tasks_status;
DROP INDEX IF EXISTS idx_tasks_due_date;
DROP INDEX IF EXISTS idx_tasks_assigned_status;
DROP INDEX IF EXISTS idx_tasks_company_status;
DROP INDEX IF EXISTS idx_tasks_company_assigned;
DROP INDEX IF EXISTS idx_tasks_department_id;
DROP INDEX IF EXISTS idx_tasks_department;
DROP INDEX IF EXISTS idx_tasks_assigned_by;

-- =====================================================
-- SECURITY EVENTS (5 indexes)
-- =====================================================
DROP INDEX IF EXISTS idx_security_events_type;
DROP INDEX IF EXISTS idx_security_events_user_id;
DROP INDEX IF EXISTS idx_security_events_company_id;
DROP INDEX IF EXISTS idx_security_events_created_at;
DROP INDEX IF EXISTS idx_security_events_severity;

-- =====================================================
-- DEPARTMENTS (3 indexes)
-- =====================================================
DROP INDEX IF EXISTS idx_departments_company_id;
DROP INDEX IF EXISTS idx_departments_manager_id;
DROP INDEX IF EXISTS idx_departments_parent;

-- =====================================================
-- EXPENSE S (3 indexes)
-- =====================================================
DROP INDEX IF EXISTS idx_expenses_date;
DROP INDEX IF EXISTS idx_expenses_category;
DROP INDEX IF EXISTS idx_expenses_created_by;

-- =====================================================
-- SUPER ADMINS (3 indexes)
-- =====================================================
DROP INDEX IF EXISTS idx_super_admins_email;
DROP INDEX IF EXISTS idx_super_admins_google_id;
DROP INDEX IF EXISTS idx_super_admins_active;

-- =====================================================
-- USER FILES (4 indexes)
-- =====================================================
DROP INDEX IF EXISTS idx_user_files_type;
DROP INDEX IF EXISTS idx_user_files_user_id;
DROP INDEX IF EXISTS idx_user_files_file_id;

-- =====================================================
-- EMPLOYEE INVITATIONS (11 indexes)
-- =====================================================
DROP INDEX IF EXISTS idx_employee_invitations_company_id;
DROP INDEX IF EXISTS idx_employee_invitations_email;
DROP INDEX IF EXISTS idx_employee_invitations_token;
DROP INDEX IF EXISTS idx_employee_invitations_status;
DROP INDEX IF EXISTS idx_employee_invitations_expires_at;
DROP INDEX IF EXISTS idx_employee_invitations_company_status;
DROP INDEX IF EXISTS idx_employee_invitations_department_id;
DROP INDEX IF EXISTS idx_employee_invitations_invited_by;
DROP INDEX IF EXISTS idx_employee_invitations_transaction_id;
DROP INDEX IF EXISTS idx_employee_invitations_retry_count;

-- =====================================================
-- ONBOARDING PROGRESS (4 indexes)
-- =====================================================
DROP INDEX IF EXISTS idx_onboarding_progress_user_id;
DROP INDEX IF EXISTS idx_onboarding_progress_company_id;
DROP INDEX IF EXISTS idx_onboarding_progress_updated_at;

-- =====================================================
-- DEMO VIDEOS (2 indexes)
-- =====================================================
DROP INDEX IF EXISTS idx_demo_videos_created_at;
DROP INDEX IF EXISTS idx_demo_videos_active;

-- =====================================================
-- COMPANY LOCATIONS (1 index)
-- =====================================================
DROP INDEX IF EXISTS idx_company_locations_company_id;

-- =====================================================
-- FILES (4 indexes)
-- =====================================================
DROP INDEX IF EXISTS idx_files_status;
DROP INDEX IF EXISTS idx_files_uploaded_by;
DROP INDEX IF EXISTS idx_files_id_status;

-- =====================================================
-- COMPANY FILES (5 indexes)
-- =====================================================
DROP INDEX IF EXISTS idx_company_files_document_type;
DROP INDEX IF EXISTS idx_company_files_company;
DROP INDEX IF EXISTS idx_company_files_company_document;
DROP INDEX IF EXISTS idx_company_files_active;

-- =====================================================
-- PAYMENTS (12 indexes)
-- =====================================================
DROP INDEX IF EXISTS idx_payments_status;
DROP INDEX IF EXISTS idx_payments_provider_payment_id;
DROP INDEX IF EXISTS idx_payments_provider_subscription_id;
DROP INDEX IF EXISTS idx_payments_created_at;
DROP INDEX IF EXISTS idx_payments_period_end;
DROP INDEX IF EXISTS idx_payments_company_status;
DROP INDEX IF EXISTS idx_payments_company_id;
DROP INDEX IF EXISTS idx_payments_reference;
DROP INDEX IF EXISTS idx_payments_purpose;

-- =====================================================
-- BIOMETRIC AUDIT LOG (5 indexes)
-- =====================================================
DROP INDEX IF EXISTS idx_biometric_audit_company_id;
DROP INDEX IF EXISTS idx_biometric_audit_created_at;
DROP INDEX IF EXISTS idx_biometric_audit_action;
DROP INDEX IF EXISTS idx_biometric_audit_log_user_id;

-- =====================================================
-- MULTIPLE CLOCKIN (1 index)
-- =====================================================
DROP INDEX IF EXISTS idx_multiple_clockin_enabled;

-- =====================================================
-- LEAVE REQUESTS (2 indexes)
-- =====================================================
DROP INDEX IF EXISTS idx_leave_requests_status;
DROP INDEX IF EXISTS idx_leave_requests_dates;

-- =====================================================
-- CACHE TABLES (4 indexes)
-- =====================================================
DROP INDEX IF EXISTS idx_cached_timezone_names;
DROP INDEX IF EXISTS idx_table_def_cache_updated;
DROP INDEX IF EXISTS idx_table_def_cache_oid;
DROP INDEX IF EXISTS idx_timezone_cache_name;


-- =====================================================
-- VERIFICATION QUERY
-- Check remaining indexes on key tables
-- =====================================================
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan AS times_used,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('users', 'companies', 'attendance_records', 'tasks', 'notifications')
ORDER BY tablename, indexname;

-- Check total space freed
SELECT 
  pg_size_pretty(SUM(pg_relation_size(indexrelid))) AS total_space_before_drop
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0;
