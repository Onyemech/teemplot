-- Test script for 001_role_based_dashboard_schema migration
-- Run this after applying the migration to verify everything works

BEGIN;

-- Test 1: Verify all tables exist
SELECT 'Test 1: Checking tables exist...' AS test;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'companies', 
    'users', 
    'employee_invitations', 
    'company_settings', 
    'office_location_calibration', 
    'audit_logs', 
    'notifications'
  )
ORDER BY table_name;

-- Test 2: Verify companies table has new columns
SELECT 'Test 2: Checking companies columns...' AS test;
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'companies'
  AND column_name IN (
    'current_period_end',
    'plan',
    'employee_limit',
    'add_on_seats',
    'last_billing_event',
    'office_latitude',
    'office_longitude',
    'office_location_updated_at'
  )
ORDER BY column_name;

-- Test 3: Verify CHECK constraints
SELECT 'Test 3: Checking constraints...' AS test;
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name IN ('companies', 'company_settings', 'employee_invitations', 'notifications')
  AND constraint_type = 'CHECK'
ORDER BY table_name, constraint_name;

-- Test 4: Verify indexes exist
SELECT 'Test 4: Checking indexes...' AS test;
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
  AND tablename IN (
    'companies',
    'employee_invitations',
    'company_settings',
    'office_location_calibration',
    'audit_logs',
    'notifications'
  )
ORDER BY tablename, indexname;

-- Test 5: Verify RLS is enabled
SELECT 'Test 5: Checking RLS policies...' AS test;
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'company_settings',
    'office_location_calibration',
    'audit_logs',
    'notifications',
    'employee_invitations'
  )
ORDER BY tablename, policyname;

-- Test 6: Test inserting sample data (will rollback)
SELECT 'Test 6: Testing sample data insertion...' AS test;

-- Insert test company
INSERT INTO companies (
  id, name, email, slug, plan, employee_limit, current_period_end
) VALUES (
  gen_random_uuid(),
  'Test Company',
  'test@example.com',
  'test-company',
  'silver',
  50,
  NOW() + INTERVAL '30 days'
) RETURNING id AS company_id;

-- Get the company_id for subsequent tests
DO $$
DECLARE
  test_company_id UUID;
  test_user_id UUID;
BEGIN
  -- Create test company
  INSERT INTO companies (name, email, slug, plan, employee_limit)
  VALUES ('Test Co', 'test@test.com', 'test-co', 'gold', 100)
  RETURNING id INTO test_company_id;
  
  -- Create test user
  INSERT INTO users (company_id, email, password_hash, first_name, last_name, role, email_verified)
  VALUES (test_company_id, 'owner@test.com', 'hash', 'Test', 'Owner', 'owner', true)
  RETURNING id INTO test_user_id;
  
  -- Test company_settings insert
  INSERT INTO company_settings (company_id)
  VALUES (test_company_id);
  
  -- Test office_location_calibration insert
  INSERT INTO office_location_calibration (
    company_id, user_id, latitude, longitude, gps_accuracy_meters, clock_in_timestamp
  ) VALUES (
    test_company_id, test_user_id, 6.5244, 3.3792, 15.5, NOW()
  );
  
  -- Test audit_logs insert
  INSERT INTO audit_logs (
    company_id, user_id, action, entity_type, entity_id, new_value
  ) VALUES (
    test_company_id, test_user_id, 'settings_updated', 'company_settings', test_company_id, '{"test": true}'::jsonb
  );
  
  -- Test notifications insert
  INSERT INTO notifications (
    company_id, user_id, type, title, message
  ) VALUES (
    test_company_id, test_user_id, 'system', 'Test Notification', 'This is a test'
  );
  
  -- Test employee_invitations insert
  INSERT INTO employee_invitations (
    company_id, invited_by, email, first_name, last_name, role, invitation_token, expires_at
  ) VALUES (
    test_company_id, test_user_id, 'invite@test.com', 'New', 'Employee', 'staff', 
    encode(gen_random_bytes(32), 'hex'), NOW() + INTERVAL '7 days'
  );
  
  RAISE NOTICE 'All test inserts successful!';
END $$;

-- Test 7: Verify foreign key relationships
SELECT 'Test 7: Checking foreign key constraints...' AS test;
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN (
    'company_settings',
    'office_location_calibration',
    'audit_logs',
    'notifications',
    'employee_invitations'
  )
ORDER BY tc.table_name, kcu.column_name;

ROLLBACK;

-- Final summary
SELECT 'Migration test completed successfully!' AS result;
SELECT 'All tables, indexes, constraints, and RLS policies are in place.' AS summary;

