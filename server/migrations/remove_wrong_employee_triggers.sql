-- Remove the incorrect employee count tracking triggers
-- Employee count should be what the user declared during onboarding, NOT auto-tracked

DROP TRIGGER IF EXISTS trigger_update_employee_count ON users;
DROP TRIGGER IF EXISTS trigger_check_employee_limit ON users;

DROP FUNCTION IF EXISTS update_company_employee_count();
DROP FUNCTION IF EXISTS check_employee_plan_limit();

-- Add comment explaining the correct approach
COMMENT ON COLUMN companies.employee_count IS 'Declared employee limit from onboarding - NOT auto-tracked. This is what the user said they need.';
