
-- Migration: Add KPI Settings and Performance Gamification
-- Date: 2026-01-30

BEGIN;

-- 1. Add KPI Weights to Company Settings
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS kpi_settings JSONB DEFAULT '{"attendanceWeight": 40, "taskCompletionWeight": 40, "taskConsistencyWeight": 20}'::jsonb;

-- 2. Add function to calculate weighted score
-- This is a helper for SQL-based reporting if needed, though we primarily use Node.js logic
-- We'll stick to Node.js for complex logic to allow for easier iteration

-- 3. Create Performance History Table (for trends)
-- This table will store daily/weekly snapshots of employee scores for fast historical querying
CREATE TABLE IF NOT EXISTS performance_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    period_type VARCHAR(20) DEFAULT 'daily', -- daily, weekly, monthly
    
    -- Raw Metrics
    attendance_score DECIMAL(5,2),
    task_completion_score DECIMAL(5,2),
    task_consistency_score DECIMAL(5,2),
    
    -- Final Weighted Score
    overall_score DECIMAL(5,2),
    
    -- Gamification
    tier VARCHAR(20), -- Bronze, Silver, Gold, Platinum
    rank_position INTEGER, -- Rank within company at this snapshot
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, user_id, date, period_type)
);

-- Index for fast trend retrieval
CREATE INDEX IF NOT EXISTS idx_perf_snapshots_user_date 
ON performance_snapshots(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_perf_snapshots_company_date 
ON performance_snapshots(company_id, date DESC);

COMMIT;
