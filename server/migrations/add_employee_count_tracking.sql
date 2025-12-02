-- Migration: Add employee count tracking and plan limit enforcement
-- Description: Automatically track employee count and enforce plan limits

-- Function to update employee count when users are added/removed
CREATE OR REPLACE FUNCTION update_company_employee_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment employee count
    UPDATE companies
    SET employee_count = employee_count + 1,
        updated_at = NOW()
    WHERE id = NEW.company_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement employee count
    UPDATE companies
    SET employee_count = GREATEST(0, employee_count - 1),
        updated_at = NOW()
    WHERE id = OLD.company_id;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- If user moved to different company (rare case)
    IF OLD.company_id != NEW.company_id THEN
      -- Decrement from old company
      UPDATE companies
      SET employee_count = GREATEST(0, employee_count - 1),
          updated_at = NOW()
      WHERE id = OLD.company_id;
      
      -- Increment to new company
      UPDATE companies
      SET employee_count = employee_count + 1,
          updated_at = NOW()
      WHERE id = NEW.company_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for users table
DROP TRIGGER IF EXISTS trigger_update_employee_count ON users;
CREATE TRIGGER trigger_update_employee_count
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION update_company_employee_count();

-- Function to validate plan limits before adding employees
CREATE OR REPLACE FUNCTION check_employee_plan_limit()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan TEXT;
  v_current_count INTEGER;
  v_limit INTEGER;
BEGIN
  -- Only check on INSERT
  IF TG_OP = 'INSERT' THEN
    -- Get company plan and current count
    SELECT subscription_plan, employee_count
    INTO v_plan, v_current_count
    FROM companies
    WHERE id = NEW.company_id;
    
    -- Determine limit based on plan
    v_limit := CASE v_plan
      WHEN 'free' THEN 10
      WHEN 'silver' THEN 50
      WHEN 'gold' THEN 999999 -- Effectively unlimited
      ELSE 10 -- Default to free plan limit
    END;
    
    -- Check if adding this employee would exceed the limit
    IF v_current_count >= v_limit THEN
      RAISE EXCEPTION 'Employee limit reached for % plan (% employees)', v_plan, v_limit
        USING HINT = 'Please upgrade your subscription plan to add more employees';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to check limits before insert
DROP TRIGGER IF EXISTS trigger_check_employee_limit ON users;
CREATE TRIGGER trigger_check_employee_limit
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION check_employee_plan_limit();

-- Initialize employee_count for existing companies
UPDATE companies c
SET employee_count = (
  SELECT COUNT(*)
  FROM users u
  WHERE u.company_id = c.id
    AND u.deleted_at IS NULL
)
WHERE employee_count IS NULL OR employee_count = 0;

-- Add comment
COMMENT ON FUNCTION update_company_employee_count() IS 'Automatically updates company employee_count when users are added/removed';
COMMENT ON FUNCTION check_employee_plan_limit() IS 'Validates that adding an employee does not exceed the company subscription plan limit';
