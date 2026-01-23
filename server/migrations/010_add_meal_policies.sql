BEGIN;

-- Meal types lookup
CREATE TABLE IF NOT EXISTS meal_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) UNIQUE NOT NULL, -- e.g., 'lunch', 'dinner'
  name VARCHAR(64) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meal policies with scope
CREATE TABLE IF NOT EXISTS meal_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  meal_type_id UUID NOT NULL REFERENCES meal_types(id) ON DELETE RESTRICT,
  active BOOLEAN DEFAULT true,
  scope_type VARCHAR(20) CHECK (scope_type IN ('company','department','employee')) DEFAULT 'company',
  scope_id UUID NULL, -- department_id or user_id when applicable
  min_hours_worked DECIMAL(4,2) NULL, -- minimum hours required
  window_start TIME NULL,
  window_end TIME NULL,
  allow_weekends BOOLEAN DEFAULT false,
  created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_policies_company ON meal_policies(company_id, active);
CREATE INDEX IF NOT EXISTS idx_meal_policies_scope ON meal_policies(scope_type, scope_id);

-- Attendance meal eligibility records
CREATE TABLE IF NOT EXISTS attendance_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id UUID NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
  policy_id UUID NULL REFERENCES meal_policies(id) ON DELETE SET NULL,
  meal_type_id UUID NULL REFERENCES meal_types(id) ON DELETE SET NULL,
  eligibility_status VARCHAR(16) CHECK (eligibility_status IN ('eligible','ineligible','granted','denied')) NOT NULL,
  reason_code VARCHAR(64) NULL,
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_at TIMESTAMP WITH TIME ZONE NULL,
  granted_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_attendance_meals_record ON attendance_meals(attendance_record_id);

-- Denormalized columns on attendance_records for quick reads
ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS meal_eligible BOOLEAN,
  ADD COLUMN IF NOT EXISTS applied_meal_policy_id UUID REFERENCES meal_policies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS applied_meal_type_id UUID REFERENCES meal_types(id) ON DELETE SET NULL;

-- Seed default meal types
INSERT INTO meal_types (code, name)
SELECT 'lunch', 'Lunch'
WHERE NOT EXISTS (SELECT 1 FROM meal_types WHERE code = 'lunch');

INSERT INTO meal_types (code, name)
SELECT 'dinner', 'Dinner'
WHERE NOT EXISTS (SELECT 1 FROM meal_types WHERE code = 'dinner');

COMMIT;
