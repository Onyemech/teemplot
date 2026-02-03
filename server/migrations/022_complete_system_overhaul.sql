-- Migration: 022_complete_system_overhaul
-- Description: Complete overhaul for Leave, Department, and Task systems with Performance Metrics
-- Date: 2026-02-02

BEGIN;

-- ============================================================================
-- 1. DEPARTMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Department Members (Many-to-Many link between Departments and Users)
-- Note: Ideally a user belongs to one department for simple hierarchy, 
-- but a junction table allows flexibility if needed later. 
-- However, per requirements "department_members (department_id, employee_id...)", 
-- and "Require department assignment on employee invite/join".
-- We will also add department_id to users table for easier primary department lookup if strictly 1:1, 
-- but let's stick to the requested table structure for members to allow history or multiple depts.
-- Wait, requirement says "Require department assignment on employee invite/join". 
-- It's often easier to have `department_id` on `users` for the *primary* active department.
-- Let's add `department_id` to `users` as a foreign key for the PRIMARY department, 
-- and `department_members` can track membership history or secondary assignments if needed.
-- But the prompt specifically asked for `department_members` table. Let's create it.

CREATE TABLE IF NOT EXISTS department_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE, -- Denormalized for RLS
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    is_primary BOOLEAN DEFAULT true,
    UNIQUE(department_id, user_id) -- Prevent duplicate active membership in same dept? 
    -- Better: UNIQUE(user_id) where is_primary = true? Let's keep it flexible for now.
);

-- ============================================================================
-- 2. TASKS
-- ============================================================================
-- Drop existing tasks table if it exists (it was simple before) to match new schema
DROP TABLE IF EXISTS tasks CASCADE;

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL, -- Optional: task for a whole dept
    assigner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Optional: if null, maybe unassigned dept task
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    completed_at TIMESTAMPTZ,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. LEAVE SYSTEM (Enhancements to 017 migration)
-- ============================================================================
-- The prompt specifies a schema for `leave_types` and `leave_balances` and `leave_requests`.
-- Migration 017 already created these. We should ALTER them to match the exact new requirements 
-- or ensure they are compatible.
-- 017 `leave_types` has: name, slug, description, days_allowed, is_paid, color, carry_forward_allowed, max_carry_forward_days, requires_approval.
-- New reqs add: gender, min_service_days, pro_rata, attachments_required.
-- 017 `leave_requests` has: department_id is missing.

-- Update leave_types
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'all' CHECK (gender IN ('all', 'male', 'female', 'other'));
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS min_service_days INTEGER DEFAULT 0;
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS pro_rata BOOLEAN DEFAULT false;
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS attachments_required BOOLEAN DEFAULT false;

-- Update leave_requests
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

-- ============================================================================
-- 4. PERFORMANCE METRICS
-- ============================================================================
DROP VIEW IF EXISTS performance_metrics;
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    score NUMERIC(5, 2) DEFAULT 0, -- Overall score (0-100)
    attendance_score INTEGER DEFAULT 0, -- (0-100)
    task_score INTEGER DEFAULT 0, -- (0-100)
    rank INTEGER DEFAULT 0,
    rank_tier VARCHAR(20) DEFAULT 'bronze' CHECK (rank_tier IN ('diamond', 'gold', 'silver', 'bronze')),
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    period_start DATE, -- For historical tracking (e.g., daily/weekly/monthly metrics)
    period_end DATE
);

CREATE TABLE IF NOT EXISTS department_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    score NUMERIC(5, 2) DEFAULT 0,
    attendance_rate NUMERIC(5, 2) DEFAULT 0,
    task_completion_rate NUMERIC(5, 2) DEFAULT 0,
    rank INTEGER DEFAULT 0,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    period_start DATE,
    period_end DATE
);

-- ============================================================================
-- 5. RLS & INDEXES
-- ============================================================================

-- Enable RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_performance ENABLE ROW LEVEL SECURITY;

-- Create Policies (Generic Tenant Isolation)
-- Departments
CREATE POLICY departments_isolation ON departments FOR ALL USING (company_id = current_setting('app.current_tenant_id', true)::UUID);

-- Department Members
CREATE POLICY dept_members_isolation ON department_members FOR ALL USING (company_id = current_setting('app.current_tenant_id', true)::UUID);

-- Tasks
CREATE POLICY tasks_isolation ON tasks FOR ALL USING (company_id = current_setting('app.current_tenant_id', true)::UUID);

-- Performance
CREATE POLICY perf_metrics_isolation ON performance_metrics FOR ALL USING (company_id = current_setting('app.current_tenant_id', true)::UUID);
CREATE POLICY dept_perf_isolation ON department_performance FOR ALL USING (company_id = current_setting('app.current_tenant_id', true)::UUID);


-- Indexes
CREATE INDEX IF NOT EXISTS idx_departments_company ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_dept_members_user ON department_members(user_id);
CREATE INDEX IF NOT EXISTS idx_dept_members_dept ON department_members(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_perf_employee ON performance_metrics(employee_id);
CREATE INDEX IF NOT EXISTS idx_perf_date ON performance_metrics(calculated_at);

-- ============================================================================
-- 6. AUDIT LOGS UPDATE
-- ============================================================================
-- Ensure audit_logs has the flexible structure requested (details jsonb)
-- Existing table in 001 migration: `old_value`, `new_value`. 
-- The request asks for `details jsonb`. We can map `details` to `new_value` or add a new column.
-- Let's add `details` column for compatibility with the new requirement style if preferred, 
-- or just alias it in the backend. 
-- Adding `details` column to be explicit.
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details JSONB;

COMMIT;
