
-- Add annual_leave_balance to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'annual_leave_balance') THEN
        ALTER TABLE users ADD COLUMN annual_leave_balance NUMERIC(5,2) DEFAULT 0;
    END IF;
END $$;
