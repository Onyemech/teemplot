CREATE TABLE IF NOT EXISTS public.email_verification_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_email ON public.email_verification_codes(email, code) WHERE verified_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_email_verification_expires ON public.email_verification_codes(expires_at) WHERE verified_at IS NULL;
