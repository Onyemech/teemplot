BEGIN;

-- Migrate existing data (safest fallback is department_head or employee, choosing department_head for managers)
UPDATE users SET role = 'department_head' WHERE role = 'manager';
UPDATE employee_invitations SET role = 'department_head' WHERE role = 'manager';

-- Update users constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('owner', 'admin', 'department_head', 'employee'));

-- Update employee_invitations constraint
ALTER TABLE employee_invitations DROP CONSTRAINT IF EXISTS employee_invitations_role_check;
ALTER TABLE employee_invitations ADD CONSTRAINT employee_invitations_role_check 
  CHECK (role IN ('owner', 'admin', 'department_head', 'employee'));

COMMIT;
