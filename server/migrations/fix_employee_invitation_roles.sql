-- Fix employee_invitations role constraint to match actual system roles
-- This migration updates the role check constraint to include the correct roles

-- Drop the existing constraint
ALTER TABLE employee_invitations DROP CONSTRAINT IF EXISTS employee_invitations_role_check;

-- Add the updated constraint with correct roles
ALTER TABLE employee_invitations ADD CONSTRAINT employee_invitations_role_check 
  CHECK (role IN ('owner', 'admin', 'employee', 'department_manager'));

-- Also update the users table role constraint if it exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('owner', 'admin', 'employee', 'department_manager'));