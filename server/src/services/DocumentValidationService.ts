import { logger } from '../utils/logger';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import crypto from 'crypto';

export interface DocumentValidationResult {
  isValid: boolean;
  status: 'valid' | 'suspicious' | 'invalid';
  confidence: number; // 0-100
  explanation: string;
  issues: string[];
  requiredCorrections: string[];
  documentType: string;
  verificationStatus: 'PENDING' | 'AI_APPROVED' | 'AI_REJECTED' | 'AI_SUSPICIOUS' | 'ADMIN_REVIEW';
  requiresManualReview: boolean;
  metadata?: {
    fileSize: number;
    fileType: string;
    pageCount?: number;
    hasText: boolean;
    hasImages: boolean;
  };
}

export interface DocumentAnalysis {
  documentType: 'cac' | 'proof_of_address' | 'company_policy';
  fileName: string;
  fileSize: number;
  mimeType: string;
  buffer: Buffer;
}

export class DocumentValidationService {
  /**
   * Validate CAC (Corporate Affairs Commission) Document
   */
  private validateCACDocument(analysis: DocumentAnalysis): DocumentValidationResult {
    const issues: string[] = [];
    const corrections: string[] = [];
    let confidence = 100;

    // Check file type
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(analysis.mimeType)) {
      issues.push('Invalid file type for CAC document');
      corrections.push('Upload a PDF, JPEG, or PNG file');
      confidence -= 50;
    }

    // Check file size (should be reasonable for a scanned document)
    if (analysis.fileSize < 10000) { // Less than 10KB
      issues.push('File size too small - likely not a real document');
      corrections.push('Upload a complete scanned or photographed CAC certificate');
      confidence -= 40;
    }

    if (analysis.fileSize > 10 * 1024 * 1024) { // More than 10MB
      issues.push('File size too large');
      corrections.push('Compress the file or ensure it\'s a single document');
      confidence -= 20;
    }

    // Check filename patterns
    const suspiciousPatterns = [
      /test/i, /dummy/i, /sample/i, /fake/i, /temp/i, 
      /placeholder/i, /example/i, /demo/i, /untitled/i
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(analysis.fileName))) {
      issues.push('Filename suggests this is a test or placeholder document');
      corrections.push('Upload your actual CAC certificate from Corporate Affairs Commission');
      confidence -= 60;
    }

    // Expected CAC document characteristics
    const expectedElements = [
      'Should contain company registration number',
      'Should show Corporate Affairs Commission header/logo',
      'Should include company name and registration date',
      'Should have official stamps or seals',
      'Should show registered address',
      'Should include directors\' names'
    ];

    const status = confidence >= 70 ? 'valid' : confidence >= 40 ? 'suspicious' : 'invalid';
    const requiresManualReview = status === 'suspicious' || confidence < 70;
    const verificationStatus = status === 'valid' ? 'AI_APPROVED' : status === 'suspicious' ? 'AI_SUSPICIOUS' : 'AI_REJECTED';

    return {
      isValid: confidence >= 70,
      status,
      confidence,
      explanation: this.generateExplanation('CAC', status, issues),
      issues,
      requiredCorrections: corrections,
      documentType: 'CAC Certificate',
      verificationStatus,
      requiresManualReview,
      metadata: {
        fileSize: analysis.fileSize,
        fileType: analysis.mimeType,
        hasText: true,
        hasImages: true,
      }
    };
  }

  /**
   * Validate Proof of Address Document
   */
  private validateProofOfAddress(analysis: DocumentAnalysis): DocumentValidationResult {
    const issues: string[] = [];
    const corrections: string[] = [];
    let confidence = 100;

    // Check file type
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(analysis.mimeType)) {
      issues.push('Invalid file type for proof of address');
      corrections.push('Upload a PDF, JPEG, or PNG file');
      confidence -= 50;
    }

    // Check file size
    if (analysis.fileSize < 10000) {
      issues.push('File size too small - likely not a real document');
      corrections.push('Upload a complete utility bill, bank statement, or official letter');
      confidence -= 40;
    }

    // Check filename patterns
    const suspiciousPatterns = [
      /test/i, /dummy/i, /sample/i, /fake/i, /temp/i, 
      /placeholder/i, /example/i, /demo/i
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(analysis.fileName))) {
      issues.push('Filename suggests this is a test or placeholder document');
      corrections.push('Upload an actual utility bill, bank statement, or government-issued document');
      confidence -= 60;
    }

    // Expected proof of address characteristics
    const expectedElements = [
      'Should be a utility bill, bank statement, or government letter',
      'Should show company name and address clearly',
      'Should be dated within the last 3 months',
      'Should have issuer\'s logo/header (utility company, bank, etc.)',
      'Should include account/reference numbers',
      'Should not be handwritten'
    ];

    const status = confidence >= 70 ? 'valid' : confidence >= 40 ? 'suspicious' : 'invalid';
    const requiresManualReview = status === 'suspicious' || confidence < 70;
    const verificationStatus = status === 'valid' ? 'AI_APPROVED' : status === 'suspicious' ? 'AI_SUSPICIOUS' : 'AI_REJECTED';

    return {
      isValid: confidence >= 70,
      status,
      confidence,
      explanation: this.generateExplanation('Proof of Address', status, issues),
      issues,
      requiredCorrections: corrections,
      documentType: 'Proof of Address',
      verificationStatus,
      requiresManualReview,
      metadata: {
        fileSize: analysis.fileSize,
        fileType: analysis.mimeType,
        hasText: true,
        hasImages: true,
      }
    };
  }

  /**
   * Validate Company Policy Document
   */
  private validateCompanyPolicy(analysis: DocumentAnalysis): DocumentValidationResult {
    const issues: string[] = [];
    const corrections: string[] = [];
    let confidence = 100;

    // Check file type (policies are usually PDFs)
    if (!['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(analysis.mimeType)) {
      issues.push('Company policies should typically be PDF or Word documents');
      corrections.push('Upload a PDF or Word document containing your company policies');
      confidence -= 30;
    }

    // Check file size (policies should have substantial content)
    if (analysis.fileSize < 20000) { // Less than 20KB
      issues.push('File size too small - company policies typically contain multiple pages');
      corrections.push('Upload a complete company policy document with all sections');
      confidence -= 40;
    }

    // Check filename patterns
    const suspiciousPatterns = [
      /test/i, /dummy/i, /sample/i, /fake/i, /temp/i, 
      /placeholder/i, /example/i, /demo/i
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(analysis.fileName))) {
      issues.push('Filename suggests this is a test or placeholder document');
      corrections.push('Upload your actual company policy document');
      confidence -= 60;
    }

    // Expected company policy characteristics
    const expectedElements = [
      'Should contain company name and logo',
      'Should include policy sections (HR, attendance, leave, conduct, etc.)',
      'Should have table of contents or section headers',
      'Should be professionally formatted',
      'Should include effective date',
      'May include signatures or approval stamps'
    ];

    const status = confidence >= 70 ? 'valid' : confidence >= 40 ? 'suspicious' : 'invalid';
    const requiresManualReview = status === 'suspicious' || confidence < 70;
    const verificationStatus = status === 'valid' ? 'AI_APPROVED' : status === 'suspicious' ? 'AI_SUSPICIOUS' : 'AI_REJECTED';

    return {
      isValid: confidence >= 70,
      status,
      confidence,
      explanation: this.generateExplanation('Company Policy', status, issues),
      issues,
      requiredCorrections: corrections,
      documentType: 'Company Policy Document',
      verificationStatus,
      requiresManualReview,
      metadata: {
        fileSize: analysis.fileSize,
        fileType: analysis.mimeType,
        hasText: true,
        hasImages: false,
      }
    };
  }

  /**
   * Main validation method
   */
  async validateDocument(analysis: DocumentAnalysis): Promise<DocumentValidationResult> {
    logger.info(`Validating ${analysis.documentType} document: ${analysis.fileName}`);

    try {
      let result: DocumentValidationResult;

      switch (analysis.documentType) {
        case 'cac':
          result = this.validateCACDocument(analysis);
          break;
        case 'proof_of_address':
          result = this.validateProofOfAddress(analysis);
          break;
        case 'company_policy':
          result = this.validateCompanyPolicy(analysis);
          break;
        default:
          throw new Error(`Unknown document type: ${analysis.documentType}`);
      }

      logger.info({
        documentType: analysis.documentType,
        fileName: analysis.fileName,
        status: result.status,
        confidence: result.confidence,
        isValid: result.isValid
      }, 'Document validation completed');

      return result;
    } catch (error: any) {
      logger.error({ err: error, documentType: analysis.documentType }, 'Document validation failed');
      
      return {
        isValid: false,
        status: 'invalid',
        confidence: 0,
        explanation: 'Failed to validate document. Please try again.',
        issues: ['Validation error occurred'],
        requiredCorrections: ['Re-upload the document or contact support'],
        documentType: analysis.documentType,
        verificationStatus: 'AI_REJECTED',
        requiresManualReview: true,
      };
    }
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(docType: string, status: string, issues: string[]): string {
    if (status === 'valid') {
      return `${docType} appears to be authentic and properly formatted. The document structure, file size, and naming suggest this is a legitimate business document.`;
    }

    if (status === 'suspicious') {
      return `${docType} has some concerns: ${issues.join('; ')}. Please review and ensure you've uploaded the correct, complete document.`;
    }

    return `${docType} appears invalid or incomplete: ${issues.join('; ')}. Please upload a genuine, complete document.`;
  }

  /**
   * Batch validate multiple documents
   */
  async validateMultipleDocuments(documents: DocumentAnalysis[]): Promise<{
    allValid: boolean;
    results: DocumentValidationResult[];
    summary: string;
  }> {
    const results = await Promise.all(
      documents.map(doc => this.validateDocument(doc))
    );

    const allValid = results.every(r => r.isValid);
    const invalidCount = results.filter(r => !r.isValid).length;
    const suspiciousCount = results.filter(r => r.status === 'suspicious').length;

    let summary = '';
    if (allValid) {
      summary = 'All documents validated successfully';
    } else if (invalidCount > 0) {
      summary = `${invalidCount} document(s) failed validation. Please review and re-upload.`;
    } else if (suspiciousCount > 0) {
      summary = `${suspiciousCount} document(s) need review. Please ensure they are complete and authentic.`;
    }

    return {
      allValid,
      results,
      summary
    };
  }
}

export const documentValidationService = new DocumentValidationService();
