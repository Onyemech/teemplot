-- Add invitation tracking for employee limits
-- This tracks when invitations are sent and accepted to enforce plan limits

-- Add invitation status tracking to employee_invitations table
ALTER TABLE employee_invitations ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE employee_invitations ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;
ALTER TABLE employee_invitations ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP;

-- Update existing invitations to have proper expiry (7 days from creation)
UPDATE employee_invitations 
SET expired_at = created_at + INTERVAL '7 days'
WHERE expired_at IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_employee_invitations_status ON employee_invitations(status);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_company_status ON employee_invitations(company_id, status);

-- Add comment
COMMENT ON COLUMN employee_invitations.status IS 'Invitation status: pending, accepted, expired, cancelled';
COMMENT ON COLUMN employee_invitations.accepted_at IS 'When the invitation was accepted';
COMMENT ON COLUMN employee_invitations.expired_at IS 'When the invitation expires (7 days from creation)';
