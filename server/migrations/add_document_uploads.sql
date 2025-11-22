-- Document Uploads Table for Onboarding Verification
-- Supports both AI validation and manual admin verification

-- CreateEnum for document verification status
CREATE TYPE document_verification_status AS (
    'PENDING',           -- Initial upload, awaiting validation
    'AI_APPROVED',       -- AI validated and approved
    'AI_REJECTED',       -- AI validated and rejected
    'AI_SUSPICIOUS',     -- AI flagged for manual review
    'ADMIN_REVIEW',      -- Flagged for admin review
    'ADMIN_APPROVED',    -- Manually approved by admin
    'ADMIN_REJECTED',    -- Manually rejected by admin
    'RESUBMIT_REQUIRED'  -- Needs resubmission
);

-- CreateEnum for document types
CREATE TYPE document_type AS (
    'CAC',                -- Certificate of Incorporation
    'PROOF_OF_ADDRESS',   -- Utility bill, bank statement, etc.
    'COMPANY_POLICY',     -- Company policy document
    'OTHER'               -- Other supporting documents
);

-- CreateTable for document uploads
CREATE TABLE IF NOT EXISTS document_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Document information
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('CAC', 'PROOF_OF_ADDRESS', 'COMPANY_POLICY', 'OTHER')),
    file_name VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64), -- SHA-256 hash for duplicate detection
    
    -- Verification status
    verification_status VARCHAR(50) NOT NULL DEFAULT 'PENDING' 
        CHECK (verification_status IN ('PENDING', 'AI_APPROVED', 'AI_REJECTED', 'AI_SUSPICIOUS', 'ADMIN_REVIEW', 'ADMIN_APPROVED', 'ADMIN_REJECTED', 'RESUBMIT_REQUIRED')),
    
    -- AI validation results
    ai_validation_result JSONB, -- Full AI validation response
    ai_confidence INTEGER CHECK (ai_confidence >= 0 AND ai_confidence <= 100),
    ai_status VARCHAR(20) CHECK (ai_status IN ('valid', 'suspicious', 'invalid')),
    ai_explanation TEXT,
    ai_issues JSONB DEFAULT '[]', -- Array of issues found
    ai_corrections JSONB DEFAULT '[]', -- Array of required corrections
    ai_validated_at TIMESTAMPTZ,
    
    -- Manual admin verification
    admin_notes TEXT,
    admin_decision VARCHAR(20) CHECK (admin_decision IN ('approved', 'rejected', 'needs_resubmit')),
    admin_rejection_reason TEXT,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Admin who verified
    verified_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}', -- Additional document metadata
    version INTEGER DEFAULT 1, -- For document resubmissions
    previous_version_id UUID REFERENCES document_uploads(id), -- Link to previous version
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_document_uploads_company_id ON document_uploads(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_document_uploads_uploaded_by ON document_uploads(uploaded_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_document_uploads_verification_status ON document_uploads(verification_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_document_uploads_document_type ON document_uploads(document_type, company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_document_uploads_admin_review ON document_uploads(verification_status, created_at DESC) 
    WHERE verification_status IN ('ADMIN_REVIEW', 'AI_SUSPICIOUS', 'PENDING') AND deleted_at IS NULL;
CREATE INDEX idx_document_uploads_file_hash ON document_uploads(file_hash) WHERE deleted_at IS NULL;
CREATE INDEX idx_document_uploads_ai_confidence ON document_uploads(ai_confidence) WHERE deleted_at IS NULL;

-- Composite index for company document verification
CREATE INDEX idx_document_uploads_company_verification ON document_uploads(company_id, document_type, verification_status) 
    WHERE deleted_at IS NULL;

-- Update trigger
CREATE TRIGGER update_document_uploads_updated_at 
BEFORE UPDATE ON document_uploads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check if company has all required documents approved
CREATE OR REPLACE FUNCTION check_company_documents_complete(p_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    has_cac BOOLEAN;
    has_proof_of_address BOOLEAN;
BEGIN
    -- Check if company has approved CAC document
    SELECT EXISTS(
        SELECT 1 FROM document_uploads
        WHERE company_id = p_company_id
        AND document_type = 'CAC'
        AND verification_status IN ('AI_APPROVED', 'ADMIN_APPROVED')
        AND deleted_at IS NULL
    ) INTO has_cac;
    
    -- Check if company has approved proof of address
    SELECT EXISTS(
        SELECT 1 FROM document_uploads
        WHERE company_id = p_company_id
        AND document_type = 'PROOF_OF_ADDRESS'
        AND verification_status IN ('AI_APPROVED', 'ADMIN_APPROVED')
        AND deleted_at IS NULL
    ) INTO has_proof_of_address;
    
    RETURN has_cac AND has_proof_of_address;
END;
$$ LANGUAGE plpgsql;

-- View for admin document review queue
CREATE OR REPLACE VIEW admin_document_review_queue AS
SELECT 
    du.id,
    du.company_id,
    c.name as company_name,
    c.email as company_email,
    du.document_type,
    du.file_name,
    du.file_size,
    du.verification_status,
    du.ai_confidence,
    du.ai_status,
    du.ai_explanation,
    du.ai_issues,
    du.ai_corrections,
    du.uploaded_by,
    u.first_name || ' ' || u.last_name as uploaded_by_name,
    u.email as uploader_email,
    du.created_at,
    du.ai_validated_at,
    -- Priority score (lower is higher priority)
    CASE 
        WHEN du.verification_status = 'PENDING' THEN 1
        WHEN du.verification_status = 'AI_SUSPICIOUS' THEN 2
        WHEN du.verification_status = 'ADMIN_REVIEW' THEN 3
        ELSE 4
    END as priority_score,
    -- Days waiting
    EXTRACT(DAY FROM NOW() - du.created_at) as days_waiting
FROM document_uploads du
JOIN companies c ON du.company_id = c.id
JOIN users u ON du.uploaded_by = u.id
WHERE du.verification_status IN ('PENDING', 'AI_SUSPICIOUS', 'ADMIN_REVIEW')
AND du.deleted_at IS NULL
ORDER BY priority_score ASC, days_waiting DESC, du.created_at ASC;

-- View for company document status
CREATE OR REPLACE VIEW company_document_status AS
SELECT 
    c.id as company_id,
    c.name as company_name,
    c.email as company_email,
    -- CAC document status
    MAX(CASE WHEN du.document_type = 'CAC' THEN du.verification_status END) as cac_status,
    MAX(CASE WHEN du.document_type = 'CAC' THEN du.ai_confidence END) as cac_confidence,
    MAX(CASE WHEN du.document_type = 'CAC' THEN du.created_at END) as cac_uploaded_at,
    -- Proof of address status
    MAX(CASE WHEN du.document_type = 'PROOF_OF_ADDRESS' THEN du.verification_status END) as proof_of_address_status,
    MAX(CASE WHEN du.document_type = 'PROOF_OF_ADDRESS' THEN du.ai_confidence END) as proof_of_address_confidence,
    MAX(CASE WHEN du.document_type = 'PROOF_OF_ADDRESS' THEN du.created_at END) as proof_of_address_uploaded_at,
    -- Company policy status
    MAX(CASE WHEN du.document_type = 'COMPANY_POLICY' THEN du.verification_status END) as company_policy_status,
    MAX(CASE WHEN du.document_type = 'COMPANY_POLICY' THEN du.ai_confidence END) as company_policy_confidence,
    MAX(CASE WHEN du.document_type = 'COMPANY_POLICY' THEN du.created_at END) as company_policy_uploaded_at,
    -- Overall status
    check_company_documents_complete(c.id) as all_required_documents_approved,
    COUNT(du.id) as total_documents_uploaded,
    COUNT(CASE WHEN du.verification_status IN ('AI_APPROVED', 'ADMIN_APPROVED') THEN 1 END) as approved_documents,
    COUNT(CASE WHEN du.verification_status IN ('AI_REJECTED', 'ADMIN_REJECTED') THEN 1 END) as rejected_documents,
    COUNT(CASE WHEN du.verification_status IN ('PENDING', 'ADMIN_REVIEW', 'AI_SUSPICIOUS') THEN 1 END) as pending_documents
FROM companies c
LEFT JOIN document_uploads du ON c.id = du.company_id AND du.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.name, c.email;

-- Add comment documentation
COMMENT ON TABLE document_uploads IS 'Stores uploaded business documents for verification during onboarding';
COMMENT ON COLUMN document_uploads.verification_status IS 'Current verification status: PENDING, AI_APPROVED, AI_REJECTED, AI_SUSPICIOUS, ADMIN_REVIEW, ADMIN_APPROVED, ADMIN_REJECTED, RESUBMIT_REQUIRED';
COMMENT ON COLUMN document_uploads.ai_validation_result IS 'Full JSON response from AI validation service';
COMMENT ON COLUMN document_uploads.ai_confidence IS 'AI confidence score (0-100)';
COMMENT ON COLUMN document_uploads.file_hash IS 'SHA-256 hash for duplicate detection';
COMMENT ON COLUMN document_uploads.version IS 'Document version number for resubmissions';
COMMENT ON COLUMN document_uploads.previous_version_id IS 'Links to previous version if document was resubmitted';

COMMENT ON FUNCTION check_company_documents_complete IS 'Checks if company has all required documents (CAC and Proof of Address) approved';
COMMENT ON VIEW admin_document_review_queue IS 'Queue of documents requiring admin review, ordered by priority';
COMMENT ON VIEW company_document_status IS 'Summary of document verification status for each company';
