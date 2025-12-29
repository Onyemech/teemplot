-- Fix employee_invitations_role_check constraint to include all application roles
-- Previous constraint only allowed: 'owner', 'admin', 'staff'
-- New constraint allows: 'owner', 'admin', 'manager', 'department_head', 'employee'

BEGIN;

ALTER TABLE employee_invitations DROP CONSTRAINT IF EXISTS employee_invitations_role_check;

ALTER TABLE employee_invitations ADD CONSTRAINT employee_invitations_role_check 
  CHECK (role IN ('owner', 'admin', 'manager', 'department_head', 'employee'));

COMMIT;
