-- WebAuthn Credentials Table for biometric authentication
CREATE TABLE webauthn_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    credential_id VARCHAR(255) NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter INTEGER DEFAULT 0,
    credential_type VARCHAR(50) DEFAULT 'public-key',
    transports JSONB,
    attestation_type VARCHAR(50),
    user_verified BOOLEAN DEFAULT false,
    backup_eligible BOOLEAN DEFAULT false,
    backup_state BOOLEAN DEFAULT false,
    device_name VARCHAR(255),
    device_type VARCHAR(50), -- 'fingerprint', 'face', 'voice', 'iris'
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webauthn_credentials_user_id ON webauthn_credentials(user_id);
CREATE INDEX idx_webauthn_credentials_company_id ON webauthn_credentials(company_id);
CREATE INDEX idx_webauthn_credentials_credential_id ON webauthn_credentials(credential_id);
CREATE INDEX idx_webauthn_credentials_active ON webauthn_credentials(is_active) WHERE is_active = true;

-- WebAuthn Challenges Table for temporary challenge storage
CREATE TABLE webauthn_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    challenge VARCHAR(255) NOT NULL UNIQUE,
    challenge_type VARCHAR(50) NOT NULL, -- 'registration' or 'authentication'
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webauthn_challenges_user_id ON webauthn_challenges(user_id);
CREATE INDEX idx_webauthn_challenges_company_id ON webauthn_challenges(company_id);
CREATE INDEX idx_webauthn_challenges_challenge ON webauthn_challenges(challenge);
CREATE INDEX idx_webauthn_challenges_expires ON webauthn_challenges(expires_at) WHERE used = false;

-- User biometric preferences
ALTER TABLE users ADD COLUMN IF NOT EXISTS biometric_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS biometric_preference JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_biometric_used TIMESTAMPTZ;

-- Company biometric settings
ALTER TABLE companies ADD COLUMN IF NOT EXISTS biometric_required BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS biometric_timeout_minutes INTEGER DEFAULT 30;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS biometric_device_types JSONB DEFAULT '["fingerprint", "face"]';