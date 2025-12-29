-- Migration to standardize roles and remove 'staff'
BEGIN;

-- Update existing users with 'staff' role to 'employee'
UPDATE users SET role = 'employee' WHERE role = 'staff';
UPDATE employee_invitations SET role = 'employee' WHERE role = 'staff';

-- Drop old constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE employee_invitations DROP CONSTRAINT IF EXISTS employee_invitations_role_check;

-- Add new constraints with standard roles
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('owner', 'admin', 'department_head', 'manager', 'employee'));

ALTER TABLE employee_invitations ADD CONSTRAINT employee_invitations_role_check 
  CHECK (role IN ('owner', 'admin', 'department_head', 'manager', 'employee'));

COMMIT;
