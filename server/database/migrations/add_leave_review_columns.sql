ALTER TABLE IF EXISTS leave_requests
  ADD COLUMN IF NOT EXISTS review_stage TEXT DEFAULT 'manager',
  ADD COLUMN IF NOT EXISTS reviewed_by_manager UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at_manager TIMESTAMP,
  ADD COLUMN IF NOT EXISTS manager_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by_admin UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at_admin TIMESTAMP,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by_owner UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at_owner TIMESTAMP,
  ADD COLUMN IF NOT EXISTS owner_notes TEXT;
