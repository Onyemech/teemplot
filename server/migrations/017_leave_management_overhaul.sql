-- Migration: 017_leave_management_overhaul
-- Description: Complete overhaul of leave management schema based on new requirements

-- 1. Create Leave Types Table
DROP TABLE IF EXISTS leave_balances CASCADE;
DROP TABLE IF EXISTS leave_policies CASCADE;
DROP TABLE IF EXISTS leave_types CASCADE;

CREATE TABLE IF NOT EXISTS leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    days_allowed INTEGER NOT NULL DEFAULT 0,
    is_paid BOOLEAN DEFAULT true,
    color TEXT DEFAULT '#000000',
    carry_forward_allowed BOOLEAN DEFAULT false,
    max_carry_forward_days INTEGER DEFAULT 0,
    requires_approval BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, slug)
);

-- 2. Create Leave Policies Table
CREATE TABLE IF NOT EXISTS leave_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    accrual_method TEXT CHECK (accrual_method IN ('yearly_upfront', 'monthly', 'prorated')) DEFAULT 'yearly_upfront',
    reset_day INTEGER DEFAULT 1, -- 1 = Jan 1st
    negative_balance_allowed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, leave_type_id)
);

-- 3. Create Leave Balances Table
CREATE TABLE IF NOT EXISTS leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    total_allocated NUMERIC(10, 2) DEFAULT 0,
    used NUMERIC(10, 2) DEFAULT 0,
    pending NUMERIC(10, 2) DEFAULT 0,
    carry_forward NUMERIC(10, 2) DEFAULT 0,
    last_accrued_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, employee_id, leave_type_id)
);

-- 4. Recreate Leave Requests Table (Dropping old one to ensure clean schema)
DROP TABLE IF EXISTS leave_requests CASCADE;

CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    half_day_start BOOLEAN DEFAULT false,
    half_day_end BOOLEAN DEFAULT false,
    days_requested NUMERIC(10, 2) NOT NULL,
    reason TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
    approver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Cleanup Old Columns (Optional but recommended for "clean" state)
ALTER TABLE users DROP COLUMN IF EXISTS leave_balances;
ALTER TABLE company_settings DROP COLUMN IF EXISTS leave_types;
ALTER TABLE company_settings DROP COLUMN IF EXISTS leave_policy_rules;

-- 6. Add RLS Policies (Example for row level security)
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies: Users can see data from their company
CREATE POLICY "Users can view leave types of their company" ON leave_types
    FOR SELECT USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Owners can manage leave types" ON leave_types
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner' AND company_id = leave_types.company_id)
    );

-- (Adding comprehensive RLS policies would be extensive, focusing on schema first)
