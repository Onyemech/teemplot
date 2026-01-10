import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { logger } from '../utils/logger';
import { fileUploadService } from './FileUploadService'; // Assuming this exists based on codebase patterns; adjust if necessary
import * as crypto from 'crypto';

interface FileExistsParams {
  hash: string;
  filename: string;
  size: number;
  mimeType: string;
}

interface UploadParams {
  hash: string;
  buffer: Buffer;
  filename: string;
  mimeType: string;
  uploadedBy: string;
}

interface AttachParams {
  fileId: string;
  companyId: string;
  documentType: string;
  purpose?: string;
  metadata?: Record<string, any>;
}

export class FileService {
  private db;

  constructor() {
    this.db = DatabaseFactory.getPrimaryDatabase();
  }

  private async getOrCreateCompanyId(userId: string, jwtCompanyId: string): Promise<string> {
    try {
      let candidateId = jwtCompanyId;

      let companyCheck = await this.db.query(
        'SELECT id FROM companies WHERE id = $1',
        [candidateId]
      );

      if (companyCheck.rows.length === 0) {
        const userCheck = await this.db.query(
          'SELECT company_id, email FROM users WHERE id = $1',
          [userId]
        );

        if (userCheck.rows.length === 0) {
          throw new Error('User not found');
        }

        candidateId = userCheck.rows[0].company_id;

        if (candidateId) {
          companyCheck = await this.db.query(
            'SELECT id FROM companies WHERE id = $1',
            [candidateId]
          );

          if (companyCheck.rows.length === 0) {
            await this.db.query(
              `INSERT INTO companies (id, name, email, subscription_plan, subscription_status, is_active, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
               ON CONFLICT (id) DO NOTHING`,
              [candidateId, 'Pending Setup', userCheck.rows[0].email, 'trial', 'active', true]
            );

            logger.info({ companyId: candidateId, userId }, 'Created placeholder company');
          }
        } else {
          throw new Error('User has no associated company ID');
        }
      }

      return candidateId;
    } catch (error: any) {
      logger.error({ error, userId, jwtCompanyId }, 'Failed to get or create company ID');
      throw error;
    }
  }

  async checkFileExists(params: FileExistsParams): Promise<any> {
    try {
      const result = await fileUploadService.checkFileExists(params);
      return result;
    } catch (error: any) {
      logger.error({ error, params }, 'Failed to check file existence');
      throw error;
    }
  }

  async uploadFile(params: UploadParams & { clientHash?: string }): Promise<any> {
    try {
      // Compute hash
      const computedHash = crypto.createHash('sha256').update(params.buffer).digest('hex');
      
      if (params.clientHash && params.clientHash !== computedHash) {
        throw new Error('Hash mismatch - file may be corrupted');
      }

      const hash = computedHash;

      // Check existence
      const existing = await this.checkFileExists({
        hash,
        filename: params.filename,
        size: params.buffer.length,
        mimeType: params.mimeType
      });

      if (existing.exists && existing.file) {
        return {
          file: existing.file,
          deduplicated: true
        };
      }

      const uploadResult = await fileUploadService.uploadToCloudinary({ ...params, hash });

      // Save to db if needed (assuming uploadToCloudinary handles it, or add here)

      return {
        file: uploadResult.file,
        deduplicated: false
      };
    } catch (error: any) {
      logger.error({ error, params }, 'Failed to upload file');
      throw error;
    }
  }

  async attachFileToCompany(params: AttachParams, userId: string, jwtCompanyId: string): Promise<any> {
    try {
      const companyId = await this.getOrCreateCompanyId(userId, jwtCompanyId);

      // Attach logic
      await this.db.query(
        `INSERT INTO company_files (company_id, file_id, document_type, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [companyId, params.fileId, params.documentType]
      );

      logger.info({ params }, 'File attached to company');
    } catch (error: any) {
      logger.error({ error, params }, 'Failed to attach file to company');
      throw error;
    }
  }

  async getCompanyFiles(companyId: string, documentType?: string): Promise<any[]> {
    try {
      let queryStr = `SELECT f.id, f.filename, f.mime_type, f.size, cf.document_type, cf.created_at as attached_at
                      FROM files f
                      INNER JOIN company_files cf ON f.id = cf.file_id
                      WHERE cf.company_id = $1`;
      const params: any[] = [companyId];

      if (documentType) {
        queryStr += ' AND cf.document_type = $2';
        params.push(documentType);
      }

      const result = await this.db.query(queryStr, params);
      return result.rows;
    } catch (error: any) {
      logger.error({ error, companyId, documentType }, 'Failed to get company files');
      throw error;
    }
  }

  async deleteFile(fileId: string, userId: string, companyId: string): Promise<void> {
    try {
      // Check permissions and tenant ownership
      const permissionCheck = await this.db.query(
        `SELECT f.uploaded_by 
         FROM files f
         JOIN company_files cf ON f.id = cf.file_id
         WHERE f.id = $1 AND cf.company_id = $2`,
        [fileId, companyId]
      );

      if (permissionCheck.rows.length === 0) {
        throw new Error('File not found or access denied');
      }

      if (permissionCheck.rows[0].uploaded_by !== userId) {
        // Optionally allow admins to delete any file in their company
        const adminCheck = await this.db.query(
          'SELECT role FROM users WHERE id = $1 AND company_id = $2',
          [userId, companyId]
        );
        
        if (adminCheck.rows.length === 0 || !['admin', 'owner'].includes(adminCheck.rows[0].role)) {
          throw new Error('Unauthorized to delete file');
        }
      }

      await fileUploadService.deleteFile(fileId);

      await this.db.query('DELETE FROM company_files WHERE file_id = $1 AND company_id = $2', [fileId, companyId]);
      // Only delete from files table if it's not used by other companies (if sharing were allowed)
      // For now, assuming 1:1 or 1:N but strict deletion, we delete the file record.
      // Ideally we should check if other links exist, but for this strict SaaS, maybe just delete.
      // Safe approach: delete if no other company_files links exist.
      
      const links = await this.db.query('SELECT count(*) as count FROM company_files WHERE file_id = $1', [fileId]);
      if (links.rows[0].count === 0) {
         await this.db.query('DELETE FROM files WHERE id = $1', [fileId]);
      }

      logger.info({ fileId, userId, companyId }, 'File deleted');
    } catch (error: any) {
      logger.error({ error, fileId, userId, companyId }, 'Failed to delete file');
      throw error;
    }
  }

  // Add other methods as needed, e.g., generateUploadSignature if it's business logic
}

export const fileService = new FileService();