-- Teemplot Database Schema
-- Optimized for multi-tenancy with partitioning, sharding, and comprehensive indexing
-- Database: PostgreSQL (Supabase)

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- CORE TABLES
-- ============================================

-- Super Admins Table
CREATE TABLE super_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    google_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_super_admins_email ON super_admins(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_super_admins_google_id ON super_admins(google_id) WHERE deleted_at IS NULL;

-- Companies Table (Multi-tenant root)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    address TEXT,
    logo_url TEXT,
    industry VARCHAR(100),
    company_size VARCHAR(50),
    timezone VARCHAR(50) DEFAULT 'UTC',
    subscription_plan VARCHAR(50) DEFAULT 'trial',
    subscription_status VARCHAR(50) DEFAULT 'active',
    subscription_start_date TIMESTAMPTZ,
    subscription_end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    -- Working days configuration for auto clock-in/out
    working_days JSONB DEFAULT '{"monday": true, "tuesday": true, "wednesday": true, "thursday": true, "friday": true, "saturday": false, "sunday": false}',
    work_start_time TIME DEFAULT '09:00:00',
    work_end_time TIME DEFAULT '17:00:00',
    auto_clockin_enabled BOOLEAN DEFAULT false,
    auto_clockout_enabled BOOLEAN DEFAULT false,
    grace_period_minutes INTEGER DEFAULT 15,
    -- Geofencing configuration
    office_latitude DECIMAL(10, 8),
    office_longitude DECIMAL(11, 8),
    geofence_radius_meters INTEGER DEFAULT 100,
    require_geofence_for_clockin BOOLEAN DEFAULT true,
    -- Notification settings
    notify_early_departure BOOLEAN DEFAULT true,
    early_departure_threshold_minutes INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_companies_slug ON companies(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_companies_subscription_status ON companies(subscription_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_companies_active ON companies(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_companies_settings ON companies USING gin(settings);

-- Users Table (Partitioned by company_id for multi-tenancy)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    avatar_url TEXT,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'staff')),
    employee_id VARCHAR(100),
    department_id UUID,
    position VARCHAR(100),
    date_of_birth DATE,
    hire_date DATE,
    biometric_data JSONB,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    google_id VARCHAR(255),
    last_login_at TIMESTAMPTZ,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(company_id, email)
) PARTITION BY HASH(company_id);

-- Create partitions for users (8 partitions for better distribution)
CREATE TABLE users_p0 PARTITION OF users FOR VALUES WITH (MODULUS 8, REMAINDER 0);
CREATE TABLE users_p1 PARTITION OF users FOR VALUES WITH (MODULUS 8, REMAINDER 1);
CREATE TABLE users_p2 PARTITION OF users FOR VALUES WITH (MODULUS 8, REMAINDER 2);
CREATE TABLE users_p3 PARTITION OF users FOR VALUES WITH (MODULUS 8, REMAINDER 3);
CREATE TABLE users_p4 PARTITION OF users FOR VALUES WITH (MODULUS 8, REMAINDER 4);
CREATE TABLE users_p5 PARTITION OF users FOR VALUES WITH (MODULUS 8, REMAINDER 5);
CREATE TABLE users_p6 PARTITION OF users FOR VALUES WITH (MODULUS 8, REMAINDER 6);
CREATE TABLE users_p7 PARTITION OF users FOR VALUES WITH (MODULUS 8, REMAINDER 7);

CREATE INDEX idx_users_company_id ON users(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(company_id, role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_google_id ON users(google_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_department ON users(department_id) WHERE deleted_at IS NULL;

-- Departments Table
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    manager_id UUID,
    parent_department_id UUID REFERENCES departments(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(company_id, name)
);

CREATE INDEX idx_departments_company_id ON departments(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_departments_manager ON departments(manager_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_departments_parent ON departments(parent_department_id) WHERE deleted_at IS NULL;

-- ============================================
-- AUTHENTICATION & AUTHORIZATION
-- ============================================

-- Refresh Tokens Table
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    super_admin_id UUID,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    CONSTRAINT chk_user_or_super_admin CHECK (
        (user_id IS NOT NULL AND super_admin_id IS NULL) OR
        (user_id IS NULL AND super_admin_id IS NOT NULL)
    )
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_refresh_tokens_super_admin ON refresh_tokens(super_admin_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at) WHERE revoked_at IS NULL;

-- Email Verification Codes
CREATE TABLE email_verification_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_verification_email ON email_verification_codes(email, code) WHERE verified_at IS NULL;
CREATE INDEX idx_email_verification_expires ON email_verification_codes(expires_at) WHERE verified_at IS NULL;

-- ============================================
-- ATTENDANCE MANAGEMENT
-- ============================================

-- Attendance Records (Partitioned by created_at for time-series data)
CREATE TABLE attendance_records (
    id UUID DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    clock_in_time TIMESTAMPTZ NOT NULL,
    clock_out_time TIMESTAMPTZ,
    clock_in_location JSONB,
    clock_out_location JSONB,
    clock_in_distance_meters DECIMAL(10, 2),
    clock_out_distance_meters DECIMAL(10, 2),
    is_within_geofence BOOLEAN DEFAULT true,
    is_early_departure BOOLEAN DEFAULT false,
    early_departure_notified BOOLEAN DEFAULT false,
    total_hours DECIMAL(5,2),
    status VARCHAR(50) DEFAULT 'present' CHECK (status IN ('present', 'late', 'absent', 'half_day', 'early_departure')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions (example for 2025)
CREATE TABLE attendance_records_2025_01 PARTITION OF attendance_records
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE attendance_records_2025_02 PARTITION OF attendance_records
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE attendance_records_2025_03 PARTITION OF attendance_records
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE attendance_records_2025_04 PARTITION OF attendance_records
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE attendance_records_2025_05 PARTITION OF attendance_records
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE attendance_records_2025_06 PARTITION OF attendance_records
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

CREATE INDEX idx_attendance_company_user ON attendance_records(company_id, user_id, created_at DESC);
CREATE INDEX idx_attendance_status ON attendance_records(company_id, status, created_at DESC);
CREATE INDEX idx_attendance_clock_in ON attendance_records(clock_in_time);

-- ============================================
-- TASK MANAGEMENT
-- ============================================

-- Tasks Table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID,
    assigned_by UUID,
    department_id UUID REFERENCES departments(id),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'awaiting_review', 'approved', 'rejected', 'cancelled')),
    category VARCHAR(100),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    -- Task review workflow
    marked_complete_at TIMESTAMPTZ,
    marked_complete_by UUID,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID,
    review_status VARCHAR(50) CHECK (review_status IN ('pending_review', 'approved', 'rejected')),
    review_notes TEXT,
    rejection_reason TEXT,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    attachments JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_tasks_company_id ON tasks(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_assigned_by ON tasks(assigned_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_status ON tasks(company_id, status, due_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE deleted_at IS NULL AND status != 'completed';
CREATE INDEX idx_tasks_priority ON tasks(company_id, priority) WHERE deleted_at IS NULL;

-- Task Comments
CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_task_comments_task ON task_comments(task_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_task_comments_user ON task_comments(user_id) WHERE deleted_at IS NULL;

-- ============================================
-- PERFORMANCE METRICS
-- ============================================

-- Performance Metrics (Aggregated data)
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    tasks_assigned INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    tasks_on_time INTEGER DEFAULT 0,
    tasks_overdue INTEGER DEFAULT 0,
    attendance_days INTEGER DEFAULT 0,
    working_days INTEGER DEFAULT 0,
    total_hours DECIMAL(10,2) DEFAULT 0,
    performance_score DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, period_start, period_end)
);

CREATE INDEX idx_performance_company ON performance_metrics(company_id, period_start DESC);
CREATE INDEX idx_performance_user ON performance_metrics(user_id, period_start DESC);
CREATE INDEX idx_performance_score ON performance_metrics(company_id, performance_score DESC);

-- ============================================
-- PAYMENTS & SUBSCRIPTIONS
-- ============================================

-- Payment Transactions
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'NGN',
    payment_method VARCHAR(50),
    payment_gateway VARCHAR(50) DEFAULT 'paystack',
    transaction_reference VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'successful', 'failed', 'cancelled')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_company ON payment_transactions(company_id, created_at DESC);
CREATE INDEX idx_payment_status ON payment_transactions(status);
CREATE INDEX idx_payment_reference ON payment_transactions(transaction_reference);

-- Subscription Plans
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'NGN',
    billing_cycle VARCHAR(50) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    max_users INTEGER,
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscription_plans_slug ON subscription_plans(slug) WHERE is_active = true;

-- ============================================
-- AUDIT & LOGGING
-- ============================================

-- Audit Logs (Partitioned by created_at)
CREATE TABLE audit_logs (
    id UUID DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID,
    super_admin_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for audit logs
CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE audit_logs_2025_02 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE audit_logs_2025_03 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

CREATE INDEX idx_audit_company ON audit_logs(company_id, created_at DESC);
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- ============================================
-- INVITATIONS
-- ============================================

-- Employee Invitations
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    department_id UUID REFERENCES departments(id),
    invited_by UUID NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, email)
);

CREATE INDEX idx_invitations_company ON invitations(company_id) WHERE accepted_at IS NULL;
CREATE INDEX idx_invitations_token ON invitations(token) WHERE accepted_at IS NULL;
CREATE INDEX idx_invitations_expires ON invitations(expires_at) WHERE accepted_at IS NULL;

-- ============================================
-- NOTIFICATIONS
-- ============================================

-- In-app Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success', 'early_departure', 'geofence_violation', 'task_review')),
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_company ON notifications(company_id, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type, created_at DESC);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_super_admins_updated_at BEFORE UPDATE ON super_admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Calculate attendance total hours
CREATE OR REPLACE FUNCTION calculate_attendance_hours()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.clock_out_time IS NOT NULL THEN
        NEW.total_hours = EXTRACT(EPOCH FROM (NEW.clock_out_time - NEW.clock_in_time)) / 3600;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_attendance_hours_trigger 
BEFORE INSERT OR UPDATE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION calculate_attendance_hours();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies will be defined based on authentication implementation

-- ============================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- ============================================

-- Company Dashboard Stats (Refreshed periodically)
CREATE MATERIALIZED VIEW company_dashboard_stats AS
SELECT 
    c.id as company_id,
    c.name as company_name,
    COUNT(DISTINCT u.id) as total_employees,
    COUNT(DISTINCT d.id) as total_departments,
    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'pending' THEN t.id END) as pending_tasks,
    AVG(pm.performance_score) as avg_performance_score
FROM companies c
LEFT JOIN users u ON c.id = u.company_id AND u.deleted_at IS NULL
LEFT JOIN departments d ON c.id = d.company_id AND d.deleted_at IS NULL
LEFT JOIN tasks t ON c.id = t.company_id AND t.deleted_at IS NULL
LEFT JOIN performance_metrics pm ON c.id = pm.company_id
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.name;

CREATE UNIQUE INDEX idx_company_dashboard_stats ON company_dashboard_stats(company_id);

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert default subscription plans
INSERT INTO subscription_plans (name, slug, description, price, billing_cycle, max_users, features) VALUES
('Trial', 'trial', '14-day free trial', 0, 'monthly', 5, '["Basic attendance", "Task management", "5 users max"]'),
('Starter', 'starter', 'For small teams', 5000, 'monthly', 20, '["Attendance tracking", "Task management", "Basic reports", "20 users"]'),
('Professional', 'professional', 'For growing companies', 15000, 'monthly', 100, '["Advanced attendance", "Task management", "Performance metrics", "Reports", "100 users"]'),
('Enterprise', 'enterprise', 'For large organizations', 50000, 'monthly', NULL, '["All features", "Unlimited users", "Priority support", "Custom integrations"]');
