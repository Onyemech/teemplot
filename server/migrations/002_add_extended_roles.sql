-- Migration: Add Extended Roles (Department Head, Manager)
-- Date: 2025-12-28
-- Description: Extends role system to support hierarchical permissions

BEGIN;

-- Update role check constraints on users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('owner', 'admin', 'department_head', 'manager', 'employee', 'staff'));

-- Update role check constraints on employee_invitations table
ALTER TABLE employee_invitations DROP CONSTRAINT IF EXISTS employee_invitations_role_check;
ALTER TABLE employee_invitations ADD CONSTRAINT employee_invitations_role_check 
  CHECK (role IN ('owner', 'admin', 'department_head', 'manager', 'employee', 'staff'));

-- Create tasks table if not exists (ensure it supports hierarchical views)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, awaiting_review, approved
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT tasks_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'awaiting_review', 'approved', 'rejected'))
);

-- Index for department-level task queries
CREATE INDEX IF NOT EXISTS idx_tasks_department_status ON tasks(department_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);

COMMIT;
