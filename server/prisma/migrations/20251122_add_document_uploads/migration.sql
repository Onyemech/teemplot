-- CreateEnum for document verification status
CREATE TYPE "DocumentVerificationStatus" AS ENUM ('PENDING', 'AI_APPROVED', 'AI_REJECTED', 'ADMIN_APPROVED', 'ADMIN_REJECTED', 'REQUIRES_REVIEW');

-- CreateEnum for document types
CREATE TYPE "DocumentType" AS ENUM ('CAC', 'PROOF_OF_ADDRESS', 'COMPANY_POLICY', 'OTHER');

-- CreateTable for document uploads
CREATE TABLE "document_uploads" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "verification_status" "DocumentVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "ai_validation_result" JSONB,
    "ai_confidence" INTEGER,
    "admin_notes" TEXT,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_uploads_company_id_idx" ON "document_uploads"("company_id");
CREATE INDEX "document_uploads_verification_status_idx" ON "document_uploads"("verification_status");
CREATE INDEX "document_uploads_document_type_idx" ON "document_uploads"("document_type");

-- AddForeignKey
ALTER TABLE "document_uploads" ADD CONSTRAINT "document_uploads_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_uploads" ADD CONSTRAINT "document_uploads_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (optional - for admin verification)
ALTER TABLE "document_uploads" ADD CONSTRAINT "document_uploads_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
