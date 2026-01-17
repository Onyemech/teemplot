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
   * Fuzzy address matching
   * Checks if two addresses are similar by comparing numbers and keywords
   */
  public verifyAddressMatch(address1: string, address2: string): { isMatch: boolean; score: number } {
    if (!address1 || !address2) return { isMatch: false, score: 0 };

    // Normalize: lowercase, remove special chars (keep numbers and spaces)
    const normalize = (str: string) => str.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const a1 = normalize(address1);
    const a2 = normalize(address2);

    // 1. Extract and compare numbers (critical for addresses)
    const getNumbers = (str: string): string[] => str.match(/\d+/g) || [];
    const nums1 = getNumbers(a1);
    const nums2 = getNumbers(a2);

    // If both have numbers, at least one significant number should match (e.g. house number)
    // We'll calculate a number match score
    let numberScore = 0;
    if (nums1.length > 0 && nums2.length > 0) {
      const intersection = nums1.filter(n => nums2.includes(n));
      // If we match the street number (usually the first number), that's a strong signal
      if (intersection.length > 0) {
        numberScore = 1.0;
      } else {
        // Mismatch in numbers is a strong negative signal for addresses
        numberScore = 0;
      }
    } else {
      // If one or both don't have numbers, ignore number scoring
      numberScore = 0.5;
    }

    // 2. Token overlap (keywords)
    const getTokens = (str: string) => str.split(' ').filter(t => t.length > 2); // Ignore short words
    const tokens1 = getTokens(a1);
    const tokens2 = getTokens(a2);

    if (tokens1.length === 0 || tokens2.length === 0) return { isMatch: false, score: 0 };

    const intersection = tokens1.filter(t => tokens2.some(t2 => t2.includes(t) || t.includes(t2)));
    const uniqueTokens = new Set([...tokens1, ...tokens2]);

    // Jaccard similarity-ish
    const tokenScore = intersection.length / Math.min(tokens1.length, tokens2.length);

    // Weighted final score
    // Numbers are very important for addresses, so give them weight if they exist
    const finalScore = (numberScore * 0.4) + (tokenScore * 0.6);

    // Threshold: Relaxed (0.3) to allow for "partial matches" as requested
    return {
      isMatch: finalScore >= 0.3,
      score: finalScore
    };
  }

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

    // Check file size (Relaxed to 1KB)
    if (analysis.fileSize < 1024) {
      issues.push('File size too small - likely not a real document');
      corrections.push('Upload a complete scanned or photographed CAC certificate');
      confidence -= 40;
    }

    // (Removed strict filename check)

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

    // Check file size (Relaxed to 1KB)
    if (analysis.fileSize < 1024) {
      issues.push('File size too small - likely not a real document');
      corrections.push('Upload a complete utility bill, bank statement, or official letter');
      confidence -= 40;
    }

    // (Removed strict filename check)

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

    // Check file size (Relaxed to 1KB)
    if (analysis.fileSize < 1024) {
      issues.push('File size too small - company policies typically contain multiple pages');
      corrections.push('Upload a complete company policy document with all sections');
      confidence -= 40;
    }

    // (Removed strict filename check)

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
      return `${docType} appears to be authentic.`;
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
