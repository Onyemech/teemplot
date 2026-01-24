-- Migration: Add task policy settings to company_settings
-- Description: Introduces require_attachments_for_tasks flag to control task completion policy
-- Date: 2026-01-24

BEGIN;

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS require_attachments_for_tasks BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN company_settings.require_attachments_for_tasks IS 'When true, employees must attach at least one file to mark tasks complete';

COMMIT;
