BEGIN;

-- Add body column
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body TEXT;

-- Migrate message to body
UPDATE notifications SET body = message WHERE body IS NULL;

-- Migrate action_url to data if present
UPDATE notifications 
SET data = jsonb_build_object('url', action_url) 
WHERE action_url IS NOT NULL AND (data IS NULL OR data = '{}'::jsonb);

-- Ensure is_read exists and has default
ALTER TABLE notifications ALTER COLUMN is_read SET DEFAULT FALSE;

-- Ensure data exists and has default
ALTER TABLE notifications ALTER COLUMN data SET DEFAULT '{}'::jsonb;

-- Drop constraint if exists
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Drop old columns
ALTER TABLE notifications 
  DROP COLUMN IF EXISTS message,
  DROP COLUMN IF EXISTS read,
  DROP COLUMN IF EXISTS link,
  DROP COLUMN IF EXISTS read_at,
  DROP COLUMN IF EXISTS action_url,
  DROP COLUMN IF EXISTS metadata;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_is_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at_desc ON notifications(created_at DESC);

COMMIT;
