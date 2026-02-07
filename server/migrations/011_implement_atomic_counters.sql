-- Migration: Implement Atomic Invitation Counters
-- Date: 2026-01-30
-- Description: Replaces placeholder counter function with actual atomic implementation

BEGIN;

-- 1. Add pending_invitations_count to companies if it doesn't exist
ALTER TABLE companies ADD COLUMN IF NOT EXISTS pending_invitations_count INTEGER DEFAULT 0;

-- 2. Backfill the counter with current data
UPDATE companies c
SET pending_invitations_count = (
  SELECT COUNT(*)
  FROM employee_invitations i
  WHERE i.company_id = c.id
    AND i.status = 'pending'
    AND i.expires_at > NOW()
);

-- 3. Replace the placeholder function with actual atomic implementation
CREATE OR REPLACE FUNCTION public.update_company_invitation_counter(company_uuid uuid, delta integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  actor_text text := current_setting('app.current_user_id', true);
  actor_uuid uuid := NULL;
BEGIN
  -- Atomically update the pending invitations counter
  -- Ensure we don't go below zero (safety check)
  UPDATE companies
  SET pending_invitations_count = GREATEST(0, COALESCE(pending_invitations_count, 0) + delta)
  WHERE id = company_uuid;

  -- Log critical changes for audit trail (keeping the logging but making it secondary)
  INSERT INTO audit_logs (
    user_id,
    company_id,
    action,
    details,
    created_at
  ) VALUES (
    CASE 
      WHEN actor_text IS NOT NULL 
       AND actor_text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      THEN actor_text::uuid
      ELSE NULL
    END,
    company_uuid,
    'invitation_counter_update',
    jsonb_build_object(
        'delta', delta, 
        'timestamp', NOW(),
        'actor_text', actor_text,
        'new_value', (SELECT pending_invitations_count FROM companies WHERE id = company_uuid)
    ),
    NOW()
  );
END;
$function$;

-- 4. Create trigger to automatically maintain the counter
CREATE OR REPLACE FUNCTION public.trigger_maintain_invitation_counter()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  -- Case 1: New pending invitation created
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending') THEN
    PERFORM public.update_company_invitation_counter(NEW.company_id::uuid, 1::integer);
  
  -- Case 2: Invitation status changed (e.g. accepted, expired, cancelled)
  ELSIF (TG_OP = 'UPDATE') THEN
    -- If moving FROM pending TO non-pending -> Decrement
    IF (OLD.status = 'pending' AND NEW.status != 'pending') THEN
      PERFORM public.update_company_invitation_counter(NEW.company_id::uuid, (-1)::integer);
    
    -- If moving FROM non-pending TO pending (rare, but possible) -> Increment
    ELSIF (OLD.status != 'pending' AND NEW.status = 'pending') THEN
      PERFORM public.update_company_invitation_counter(NEW.company_id::uuid, 1::integer);
    END IF;

  -- Case 3: Invitation deleted (should ideally be soft-deleted, but handle hard delete too)
  ELSIF (TG_OP = 'DELETE' AND OLD.status = 'pending') THEN
    PERFORM public.update_company_invitation_counter(OLD.company_id::uuid, (-1)::integer);
  END IF;

  RETURN NULL;
END;
$function$;

-- Drop trigger if exists to avoid duplication
DROP TRIGGER IF EXISTS trg_maintain_invitation_counter ON employee_invitations;

-- Attach trigger
CREATE TRIGGER trg_maintain_invitation_counter
AFTER INSERT OR UPDATE OR DELETE ON employee_invitations
FOR EACH ROW
EXECUTE FUNCTION public.trigger_maintain_invitation_counter();

-- 5. Update get_company_employee_counts to use the cached column for better performance
CREATE OR REPLACE FUNCTION public.get_company_employee_counts(company_uuid uuid)
RETURNS TABLE(current_count bigint, declared_limit integer, pending_invitations bigint, remaining_slots integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(active_employees.count, 0)::BIGINT as current_count,
    COALESCE(c.employee_limit, 0) as declared_limit,
    -- Use the cached column instead of counting on the fly
    COALESCE(c.pending_invitations_count, 0)::BIGINT as pending_invitations,
    GREATEST(0, COALESCE(c.employee_limit, 0) - COALESCE(active_employees.count, 0) - COALESCE(c.pending_invitations_count, 0)) as remaining_slots
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
  WHERE c.id = company_uuid;
END;
$function$;

COMMIT;
