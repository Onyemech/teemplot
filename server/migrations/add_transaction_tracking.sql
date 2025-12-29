-- Add transaction tracking columns to employee_invitations table
-- These columns support the fail-safe mechanism and retry logic

-- Add transaction_id for rollback support
ALTER TABLE employee_invitations 
ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(50) DEFAULT NULL;

-- Add retry_count for tracking retry attempts
ALTER TABLE employee_invitations 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Add updated_at timestamp for tracking changes
ALTER TABLE employee_invitations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index on transaction_id for efficient rollback queries
CREATE INDEX IF NOT EXISTS idx_employee_invitations_transaction_id 
ON employee_invitations(transaction_id) 
WHERE transaction_id IS NOT NULL;

-- Create index on retry_count for monitoring failed attempts
CREATE INDEX IF NOT EXISTS idx_employee_invitations_retry_count 
ON employee_invitations(retry_count);

-- Add comments for documentation
COMMENT ON COLUMN employee_invitations.transaction_id IS 'Transaction identifier for rollback support in case of failures';
COMMENT ON COLUMN employee_invitations.retry_count IS 'Number of retry attempts for this invitation (used for monitoring and debugging)';
COMMENT ON COLUMN employee_invitations.updated_at IS 'Last update timestamp for tracking changes';

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_employee_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_employee_invitations_updated_at ON employee_invitations;
CREATE TRIGGER trigger_update_employee_invitations_updated_at
  BEFORE UPDATE ON employee_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_invitations_updated_at();