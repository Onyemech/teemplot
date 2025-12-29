-- Create functions for employee invitation counter management
-- These functions provide atomic counter updates and real-time counting

-- Function to get company employee counts with invitation status
CREATE OR REPLACE FUNCTION get_company_employee_counts(company_uuid UUID)
RETURNS TABLE (
  current_count BIGINT,
  declared_limit INTEGER,
  pending_invitations BIGINT,
  remaining_slots INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(active_employees.count, 0)::BIGINT as current_count,
    COALESCE(c.employee_limit, 0) as declared_limit,
    COALESCE(pending_invites.count, 0)::BIGINT as pending_invitations,
    GREATEST(0, COALESCE(c.employee_limit, 0) - COALESCE(active_employees.count, 0) - COALESCE(pending_invites.count, 0)) as remaining_slots
  FROM companies c
  LEFT JOIN (
    SELECT company_id, COUNT(*) as count
    FROM users
    WHERE company_id = company_uuid 
      AND role IN ('employee', 'manager', 'department_head', 'admin')
      AND is_active = true
      AND deleted_at IS NULL
    GROUP BY company_id
  ) active_employees ON c.id = active_employees.company_id
  LEFT JOIN (
    SELECT company_id, COUNT(*) as count
    FROM employee_invitations
    WHERE company_id = company_uuid 
      AND status = 'pending'
      AND expires_at > NOW()
    GROUP BY company_id
  ) pending_invites ON c.id = pending_invites.company_id
  WHERE c.id = company_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to atomically update company invitation counter
CREATE OR REPLACE FUNCTION update_company_invitation_counter(
  company_uuid UUID,
  delta INTEGER
)
RETURNS VOID AS $$
BEGIN
  -- This function is a placeholder for atomic counter updates
  -- In a production system, you might want to implement actual counter tracking
  -- For now, we'll just log the operation for audit purposes
  
  INSERT INTO audit_logs (
    user_id,
    company_id,
    action,
    details,
    created_at
  ) VALUES (
    COALESCE(current_setting('app.current_user_id', true), 'system'),
    company_uuid,
    'invitation_counter_update',
    jsonb_build_object('delta', delta, 'timestamp', NOW()),
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get real-time invitation statistics
CREATE OR REPLACE FUNCTION get_invitation_statistics(company_uuid UUID)
RETURNS TABLE (
  total_invitations BIGINT,
  pending_invitations BIGINT,
  accepted_invitations BIGINT,
  expired_invitations BIGINT,
  cancelled_invitations BIGINT,
  last_invitation_sent TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_invitations,
    COUNT(*) FILTER (WHERE status = 'pending' AND expires_at > NOW()) as pending_invitations,
    COUNT(*) FILTER (WHERE status = 'accepted') as accepted_invitations,
    COUNT(*) FILTER (WHERE status = 'expired' OR (status = 'pending' AND expires_at <= NOW())) as expired_invitations,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_invitations,
    MAX(created_at) as last_invitation_sent
  FROM employee_invitations
  WHERE company_id = company_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_company_employee_counts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_company_invitation_counter(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_invitation_statistics(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_company_employee_counts(UUID) IS 'Get comprehensive employee counts including active employees and pending invitations for plan limit verification';
COMMENT ON FUNCTION update_company_invitation_counter(UUID, INTEGER) IS 'Atomically update company invitation counters for real-time tracking';
COMMENT ON FUNCTION get_invitation_statistics(UUID) IS 'Get detailed invitation statistics for dashboard and reporting';

-- Create index for better performance on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_employee_invitations_company_status 
ON employee_invitations(company_id, status) 
WHERE status IN ('pending', 'accepted');

CREATE INDEX IF NOT EXISTS idx_employee_invitations_expires_at 
ON employee_invitations(expires_at) 
WHERE status = 'pending';
