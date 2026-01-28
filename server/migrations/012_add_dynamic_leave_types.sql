
-- Create leave_types table
CREATE TABLE IF NOT EXISTS leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  days_allowed INTEGER NOT NULL DEFAULT 0,
  is_paid BOOLEAN DEFAULT TRUE,
  requires_approval BOOLEAN DEFAULT TRUE,
  color VARCHAR(20) DEFAULT '#0F5D5D',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create leave_balances table
CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID NOT NULL REFERENCES users(id),
  leave_type_id UUID NOT NULL REFERENCES leave_types(id),
  balance_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, leave_type_id, year)
);

-- Create default leave types for existing companies function
CREATE OR REPLACE FUNCTION create_default_leave_types(company_uuid UUID) RETURNS VOID AS $$
BEGIN
  INSERT INTO leave_types (company_id, name, description, days_allowed, color)
  VALUES 
    (company_uuid, 'Annual Leave', 'Standard annual leave', 20, '#0F5D5D'),
    (company_uuid, 'Sick Leave', 'Medical leave', 10, '#EF4444'),
    (company_uuid, 'Maternity Leave', 'Maternity leave', 90, '#EC4899'),
    (company_uuid, 'Paternity Leave', 'Paternity leave', 14, '#3B82F6'),
    (company_uuid, 'Unpaid Leave', 'Leave without pay', 0, '#6B7280')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;
