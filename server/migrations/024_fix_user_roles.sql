
-- Fix users role check constraint to include department_head
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('owner', 'admin', 'manager', 'staff', 'employee', 'department_head'));
