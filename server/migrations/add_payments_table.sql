
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  reference TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL, -- Amount in kobo/cents
  currency TEXT NOT NULL DEFAULT 'NGN',
  purpose TEXT NOT NULL, -- 'subscription', 'employee_limit_upgrade', 'plan_upgrade'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'cancelled'
  provider TEXT NOT NULL DEFAULT 'paystack', -- 'paystack', 'flutterwave', 'stripe'
  authorization_url TEXT,
  access_code TEXT,
  channel TEXT, -- 'card', 'bank', 'ussd', etc.
  metadata TEXT, -- JSON string with additional data
  created_at TEXT NOT NULL,
  verified_at TEXT,
  paid_at TEXT,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_purpose ON payments(purpose);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
