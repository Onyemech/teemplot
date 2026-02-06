-- Migration to fix missing columns and tables for Performance and Analytics

DO $$
BEGIN
    -- 1. Add deleted_at to tables if missing (Critical for AnalyticsService)
    
    -- Users
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'deleted_at') THEN
        ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
    END IF;

    -- Tasks (Note: Migration 022 might have dropped this column)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'deleted_at') THEN
        ALTER TABLE tasks ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
    END IF;

    -- Companies
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'deleted_at') THEN
        ALTER TABLE companies ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
    END IF;

    -- Departments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'deleted_at') THEN
        ALTER TABLE departments ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
    END IF;

    -- Attendance Records
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'deleted_at') THEN
        ALTER TABLE attendance_records ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
    END IF;

    -- 2. Ensure performance_snapshots table exists (Used by PerformanceSnapshotJobService)
    -- Migration 022 created 'performance_metrics' but code uses 'performance_snapshots'
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'performance_snapshots') THEN
        CREATE TABLE performance_snapshots (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
            date DATE NOT NULL,
            overall_score DECIMAL(5, 2) DEFAULT 0,
            attendance_score INTEGER DEFAULT 0,
            task_completion_score INTEGER DEFAULT 0,
            rank_position INTEGER DEFAULT 0,
            tier VARCHAR(20) DEFAULT 'bronze',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            
            UNIQUE(company_id, user_id, period_type, date)
        );
        
        -- Add indexes for performance
        CREATE INDEX idx_perf_snapshots_company_date ON performance_snapshots(company_id, date);
        CREATE INDEX idx_perf_snapshots_user ON performance_snapshots(user_id);
    END IF;

END $$;
