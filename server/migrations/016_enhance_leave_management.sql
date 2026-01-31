-- Migration: Enhance Leave Management System
-- Description: Adds support for multiple leave balances, policy rules, and blackout periods

-- 1. Add leave_balances to users table
-- This allows storing balances for different leave types (e.g., {"sick": 5, "personal": 2})
ALTER TABLE users ADD COLUMN IF NOT EXISTS leave_balances JSONB DEFAULT '{}';

-- 2. Add leave_policy_rules to company_settings
-- This allows storing advanced configuration like accrual rates, carry-forward limits, etc.
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS leave_policy_rules JSONB DEFAULT '{}';

-- 3. Add blackout_periods to company_settings
-- This allows defining date ranges where leave cannot be requested (e.g., peak seasons)
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS blackout_periods JSONB DEFAULT '[]';

-- 4. Update leave_types in company_settings to ensure it has a structure that supports limits
-- (This is just a comment/reminder that the JSON structure for leave_types will now include 'limit' and 'accrual_rate')

-- 5. Create a function to initialize leave balances for a new user based on company settings
CREATE OR REPLACE FUNCTION initialize_user_leave_balances()
RETURNS TRIGGER AS $$
DECLARE
    settings RECORD;
    type JSONB;
    initial_balances JSONB := '{}';
BEGIN
    -- Get company settings
    SELECT * INTO settings FROM company_settings WHERE company_id = NEW.company_id;
    
    IF FOUND THEN
        -- Initialize balances based on leave_types limits
        FOR type IN SELECT * FROM jsonb_array_elements(settings.leave_types)
        LOOP
            -- If type has a limit, set it as the balance. Default to 0 if not specified.
            -- We assume annual leave is still handled by annual_leave_balance column for backward compatibility,
            -- but we can also mirror it here or migrate eventually.
            -- For now, we only initialize non-annual types here if they have a 'limit'.
            IF (type->>'name')::text != 'Annual' AND (type->>'limit') IS NOT NULL THEN
                initial_balances := jsonb_set(initial_balances, array[type->>'name'], (type->>'limit')::jsonb);
            END IF;
        END LOOP;
        
        NEW.leave_balances := initial_balances;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to initialize balances on user creation
DROP TRIGGER IF EXISTS trigger_initialize_leave_balances ON users;
CREATE TRIGGER trigger_initialize_leave_balances
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION initialize_user_leave_balances();
