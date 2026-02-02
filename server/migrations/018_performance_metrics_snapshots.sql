-- Migration: Performance Metrics View + User Department FK
-- Date: 2026-02-01
-- Description: Adds users.department_id (if missing) and exposes performance_metrics view over performance_snapshots.

BEGIN;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);

DROP VIEW IF EXISTS performance_metrics;
CREATE VIEW performance_metrics AS
SELECT
  company_id,
  user_id AS employee_id,
  overall_score AS score,
  attendance_score,
  task_completion_score AS task_score,
  rank_position AS rank,
  created_at AS calculated_at
FROM performance_snapshots
WHERE period_type = 'daily';

COMMIT;
