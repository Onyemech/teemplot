-- Teemplot SQLite Database Schema
-- Simplified version for development/testing

-- ============================================
-- CORE TABLES
-- ============================================

-- Companies Table
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    phone_number TEXT,
    address TEXT,
    city TEXT,
    state_province TEXT,
    country TEXT,
    postal_code TEXT,
    logo_url TEXT,
    industry TEXT,
    company_size TEXT,
    employee_count INTEGER DEFAULT 1,
    timezone TEXT DEFAULT 'UTC',
    subscription_plan TEXT DEFAULT 'trial',
    subscription_status TEXT DEFAULT 'active',
    subscription_start_date TEXT,
    subscription_end_date TEXT,
    trial_start_date TEXT,
    trial_end_date TEXT,
    is_active INTEGER DEFAULT 1,
    onboarding_completed INTEGER DEFAULT 0,
    settings TEXT DEFAULT '{}',
    -- Working days configuration
    working_days TEXT DEFAULT '{"monday":true,"tuesday":true,"wednesday":true,"thursday":true,"friday":true,"saturday":false,"sunday":false}',
    work_start_time TEXT DEFAULT '09:00:00',
    work_end_time TEXT DEFAULT '17:00:00',
    auto_clockin_enabled INTEGER DEFAULT 0,
    auto_clockout_enabled INTEGER DEFAULT 0,
    grace_period_minutes INTEGER DEFAULT 15,
    -- Geofencing
    office_latitude REAL,
    office_longitude REAL,
    geofence_radius_meters INTEGER DEFAULT 100,
    require_geofence_for_clockin INTEGER DEFAULT 1,
    -- Notifications
    notify_early_departure INTEGER DEFAULT 1,
    early_departure_threshold_minutes INTEGER DEFAULT 30,
    -- Onboarding documents
    cac_document_url TEXT,
    proof_of_address_url TEXT,
    company_policy_url TEXT,
    -- Owner details (if different from registrant)
    owner_first_name TEXT,
    owner_last_name TEXT,
    owner_email TEXT,
    owner_phone TEXT,
    owner_date_of_birth TEXT,
    -- Tax info
    tax_identification_number TEXT,
    website TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email) WHERE deleted_at IS NULL;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone_number TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
    employee_id TEXT,
    department_id TEXT,
    position TEXT,
    date_of_birth TEXT,
    hire_date TEXT,
    is_active INTEGER DEFAULT 1,
    email_verified INTEGER DEFAULT 0,
    google_id TEXT,
    last_login_at TEXT,
    settings TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE(company_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(company_id, role) WHERE deleted_at IS NULL;

-- ============================================
-- AUTHENTICATION & AUTHORIZATION
-- ============================================

-- Email Verification Codes
CREATE TABLE IF NOT EXISTS email_verification_codes (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    verified_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_email_verification_email ON email_verification_codes(email, code) WHERE verified_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_email_verification_expires ON email_verification_codes(expires_at) WHERE verified_at IS NULL;

-- Refresh Tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    revoked_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at) WHERE revoked_at IS NULL;

-- ============================================
-- ORGANIZATION
-- ============================================

-- Departments
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    manager_id TEXT,
    parent_department_id TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (manager_id) REFERENCES users(id),
    FOREIGN KEY (parent_department_id) REFERENCES departments(id),
    UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_departments_company_id ON departments(company_id) WHERE deleted_at IS NULL;

-- ============================================
-- ATTENDANCE
-- ============================================

-- Attendance Records
CREATE TABLE IF NOT EXISTS attendance_records (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    clock_in_time TEXT NOT NULL,
    clock_out_time TEXT,
    clock_in_location TEXT,
    clock_out_location TEXT,
    clock_in_distance_meters REAL,
    clock_out_distance_meters REAL,
    is_within_geofence INTEGER DEFAULT 1,
    is_early_departure INTEGER DEFAULT 0,
    early_departure_notified INTEGER DEFAULT 0,
    total_hours REAL,
    status TEXT DEFAULT 'present' CHECK (status IN ('present', 'late', 'absent', 'half_day', 'early_departure')),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attendance_company_user ON attendance_records(company_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(company_id, status, created_at DESC);

-- ============================================
-- TASKS
-- ============================================

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to TEXT,
    assigned_by TEXT,
    department_id TEXT,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'awaiting_review', 'approved', 'rejected', 'cancelled')),
    category TEXT,
    due_date TEXT,
    completed_at TEXT,
    marked_complete_at TEXT,
    marked_complete_by TEXT,
    reviewed_at TEXT,
    reviewed_by TEXT,
    review_status TEXT CHECK (review_status IN ('pending_review', 'approved', 'rejected')),
    review_notes TEXT,
    rejection_reason TEXT,
    estimated_hours REAL,
    actual_hours REAL,
    attachments TEXT DEFAULT '[]',
    metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id),
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON tasks(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(company_id, status, due_date) WHERE deleted_at IS NULL;

-- Task Comments
CREATE TABLE IF NOT EXISTS task_comments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    comment TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id) WHERE deleted_at IS NULL;

-- ============================================
-- PERFORMANCE
-- ============================================

-- Performance Metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    tasks_assigned INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    tasks_on_time INTEGER DEFAULT 0,
    tasks_overdue INTEGER DEFAULT 0,
    attendance_days INTEGER DEFAULT 0,
    working_days INTEGER DEFAULT 0,
    total_hours REAL DEFAULT 0,
    performance_score REAL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_performance_company ON performance_metrics(company_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_performance_user ON performance_metrics(user_id, period_start DESC);

-- ============================================
-- PAYMENTS
-- ============================================

-- Payment Transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'NGN',
    payment_method TEXT,
    payment_gateway TEXT DEFAULT 'paystack',
    transaction_reference TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'successful', 'failed', 'cancelled')),
    metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payment_company ON payment_transactions(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_status ON payment_transactions(status);

-- ============================================
-- NOTIFICATIONS
-- ============================================

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    company_id TEXT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success', 'early_departure', 'geofence_violation', 'task_review')),
    data TEXT DEFAULT '{}',
    is_read INTEGER DEFAULT 0,
    read_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- ============================================
-- INVITATIONS
-- ============================================

-- Onboarding Progress
CREATE TABLE IF NOT EXISTS onboarding_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    company_id TEXT NOT NULL,
    current_step INTEGER NOT NULL DEFAULT 1,
    completed_steps TEXT DEFAULT '[]',
    form_data TEXT DEFAULT '{}',
    last_saved_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_company ON onboarding_progress(company_id);

-- Employee Invitations
CREATE TABLE IF NOT EXISTS invitations (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    department_id TEXT,
    invited_by TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    accepted_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (invited_by) REFERENCES users(id),
    UNIQUE(company_id, email)
);

CREATE INDEX IF NOT EXISTS idx_invitations_company ON invitations(company_id) WHERE accepted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token) WHERE accepted_at IS NULL;

-- ============================================
-- AUDIT LOGS
-- ============================================

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    changes TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_company ON audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action, created_at DESC);

-- ============================================
-- SUPER ADMINS (Missing in SQLite)
-- ============================================

CREATE TABLE IF NOT EXISTS super_admins (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone_number TEXT,
    avatar_url TEXT,
    is_active INTEGER DEFAULT 1,
    email_verified INTEGER DEFAULT 0,
    google_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_super_admins_email ON super_admins(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_super_admins_google_id ON super_admins(google_id) WHERE deleted_at IS NULL;

-- ============================================
-- SUBSCRIPTION PLANS (Missing in SQLite)
-- ============================================

CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    currency TEXT DEFAULT 'NGN',
    billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    max_users INTEGER,
    features TEXT DEFAULT '[]',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug ON subscription_plans(slug) WHERE is_active = 1;

-- Insert default subscription plans
INSERT OR IGNORE INTO subscription_plans (id, name, slug, description, price, billing_cycle, max_users, features) VALUES
('plan-1', 'Trial', 'trial', '14-day free trial', 0, 'monthly', 5, '["Basic attendance", "Task management", "5 users max"]'),
('plan-2', 'Silver Monthly', 'silver_monthly', 'For small teams', 1200, 'monthly', 20, '["Attendance tracking", "Task management", "Basic reports", "20 users"]'),
('plan-3', 'Silver Yearly', 'silver_yearly', 'For small teams (yearly)', 12000, 'yearly', 20, '["Attendance tracking", "Task management", "Basic reports", "20 users", "16.7% discount"]'),
('plan-4', 'Gold Monthly', 'gold_monthly', 'For growing companies', 2500, 'monthly', 100, '["Advanced attendance", "Task management", "Performance metrics", "Reports", "100 users", "30-day FREE trial"]'),
('plan-5', 'Gold Yearly', 'gold_yearly', 'For growing companies (yearly)', 25000, 'yearly', 100, '["Advanced attendance", "Task management", "Performance metrics", "Reports", "100 users", "16.7% discount"]');

-- ============================================
-- MISSING INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_companies_subscription_status ON companies(subscription_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_companies_trial_end_date ON companies(trial_end_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_companies_onboarding_completed ON companies(onboarding_completed) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON invitations(expires_at) WHERE accepted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON notifications(company_id, created_at DESC);
