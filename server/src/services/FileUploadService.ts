import { v2 as cloudinary } from 'cloudinary';
import { query } from '../config/database';
import { logger } from '../utils/logger';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export interface FileCheckRequest {
  hash: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface FileCheckResponse {
  exists: boolean;
  file?: {
    id: string;
    hash: string;
    public_id: string;
    url: string;
    secure_url: string;
    file_size: number;
    mime_type: string;
  };
}

export interface FileUploadRequest {
  hash: string;
  buffer: Buffer;
  filename: string;
  mimeType: string;
  uploadedBy: string;
  resourceType?: 'image' | 'raw' | 'video' | 'auto';
}

export interface FileUploadResponse {
  success: boolean;
  file: {
    id: string;
    hash: string;
    public_id: string;
    url: string;
    secure_url: string;
    file_size: number;
    mime_type: string;
  };
}

export interface AttachFileToCompanyRequest {
  companyId: string;
  fileId: string;
  documentType: string;
  uploadedBy: string;
  purpose?: string;
  metadata?: Record<string, any>;
}

class FileUploadService {
  /**
   * Check if a file with the given hash already exists
   */
  async checkFileExists(request: FileCheckRequest): Promise<FileCheckResponse> {
    try {
      const result = await query(
        `SELECT id, hash, public_id, url, secure_url, file_size, mime_type, status
         FROM files
         WHERE hash = $1 AND status = 'uploaded' AND deleted_at IS NULL`,
        [request.hash]
      );

      if (result.rows.length > 0) {
        const file = result.rows[0];
        
        // Increment upload_count to track deduplication
        await query(
          `UPDATE files SET upload_count = upload_count + 1, updated_at = NOW()
           WHERE id = $1`,
          [file.id]
        );

        logger.info({
          fileId: file.id,
          hash: request.hash,
          filename: request.filename
        }, 'File already exists - deduplication successful');

        return {
          exists: true,
          file: {
            id: file.id,
            hash: file.hash,
            public_id: file.public_id,
            url: file.url,
            secure_url: file.secure_url,
            file_size: file.file_size,
            mime_type: file.mime_type
          }
        };
      }

      return { exists: false };
    } catch (error: any) {
      logger.error({ err: error, hash: request.hash }, 'Error checking file existence');
      throw new Error('Failed to check file existence');
    }
  }

  /**
   * Upload file to Cloudinary using hash as public_id
   */
  async uploadToCloudinary(request: FileUploadRequest): Promise<FileUploadResponse> {
    try {
      // Determine resource type based on MIME type
      const resourceType = request.resourceType || this.getResourceType(request.mimeType);
      
      // Upload to Cloudinary with hash as public_id
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            public_id: request.hash,
            resource_type: resourceType,
            overwrite: false, // Don't overwrite if exists
            unique_filename: false, // Use our hash as-is
            folder: 'company-documents', // Organize in folder
            tags: ['company-document', request.mimeType.split('/')[0]]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        uploadStream.end(request.buffer);
      });

      // Save file metadata to database
      const result = await query(
        `INSERT INTO files (
          hash, public_id, url, secure_url, file_size, mime_type,
          original_filename, resource_type, format, uploaded_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'uploaded')
        RETURNING id, hash, public_id, url, secure_url, file_size, mime_type`,
        [
          request.hash,
          uploadResult.public_id,
          uploadResult.url,
          uploadResult.secure_url,
          request.buffer.length,
          request.mimeType,
          request.filename,
          uploadResult.resource_type,
          uploadResult.format,
          request.uploadedBy
        ]
      );

      const file = result.rows[0];

      logger.info({
        fileId: file.id,
        hash: request.hash,
        publicId: uploadResult.public_id,
        size: request.buffer.length
      }, 'File uploaded successfully to Cloudinary');

      return {
        success: true,
        file: {
          id: file.id,
          hash: file.hash,
          public_id: file.public_id,
          url: file.url,
          secure_url: file.secure_url,
          file_size: file.file_size,
          mime_type: file.mime_type
        }
      };
    } catch (error: any) {
      logger.error({ err: error, hash: request.hash }, 'Error uploading file to Cloudinary');
      
      // If it's a duplicate error from Cloudinary, try to fetch existing file
      if (error.message?.includes('already exists')) {
        const existingFile = await this.checkFileExists({
          hash: request.hash,
          filename: request.filename,
          size: request.buffer.length,
          mimeType: request.mimeType
        });

        if (existingFile.exists && existingFile.file) {
          return {
            success: true,
            file: existingFile.file
          };
        }
      }

      throw new Error('Failed to upload file to Cloudinary');
    }
  }

  /**
   * Attach a file to a company (creates company_files record)
   */
  async attachFileToCompany(request: AttachFileToCompanyRequest): Promise<void> {
    try {
      // Deactivate any existing active file for this document type
      await query(
        `UPDATE company_files
         SET is_active = FALSE, updated_at = NOW()
         WHERE company_id = $1 AND document_type = $2 AND is_active = TRUE`,
        [request.companyId, request.documentType]
      );

      // Create new company_files record
      await query(
        `INSERT INTO company_files (
          company_id, file_id, document_type, uploaded_by, purpose, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          request.companyId,
          request.fileId,
          request.documentType,
          request.uploadedBy,
          request.purpose || null,
          JSON.stringify(request.metadata || {})
        ]
      );

      // Update company table with document URL (for backward compatibility)
      const urlColumnMap: Record<string, string> = {
        'cac': 'cac_document_url',
        'proof_of_address': 'proof_of_address_url',
        'company_policy': 'company_policy_url'
      };

      const urlColumn = urlColumnMap[request.documentType];
      if (urlColumn) {
        const fileResult = await query(
          'SELECT secure_url FROM files WHERE id = $1',
          [request.fileId]
        );

        if (fileResult.rows.length > 0) {
          await query(
            `UPDATE companies SET ${urlColumn} = $1, updated_at = NOW() WHERE id = $2`,
            [fileResult.rows[0].secure_url, request.companyId]
          );
        }
      }

      logger.info({
        companyId: request.companyId,
        fileId: request.fileId,
        documentType: request.documentType
      }, 'File attached to company successfully');
    } catch (error: any) {
      logger.error({ err: error, request }, 'Error attaching file to company');
      throw new Error('Failed to attach file to company');
    }
  }

  /**
   * Get company files by document type
   */
  async getCompanyFiles(companyId: string, documentType?: string) {
    try {
      let queryText = `
        SELECT 
          cf.id as company_file_id,
          cf.document_type,
          cf.purpose,
          cf.metadata,
          cf.is_active,
          cf.created_at as attached_at,
          f.id as file_id,
          f.hash,
          f.public_id,
          f.url,
          f.secure_url,
          f.file_size,
          f.mime_type,
          f.original_filename,
          f.format
        FROM company_files cf
        JOIN files f ON cf.file_id = f.id
        WHERE cf.company_id = $1 AND cf.is_active = TRUE AND f.deleted_at IS NULL
      `;

      const params: any[] = [companyId];

      if (documentType) {
        queryText += ' AND cf.document_type = $2';
        params.push(documentType);
      }

      queryText += ' ORDER BY cf.created_at DESC';

      const result = await query(queryText, params);
      return result.rows;
    } catch (error: any) {
      logger.error({ err: error, companyId, documentType }, 'Error fetching company files');
      throw new Error('Failed to fetch company files');
    }
  }

  /**
   * Upload company logo
   */
  async uploadLogo(
    buffer: Buffer,
    companyId: string,
    metadata: { filename: string; mimeType: string; uploadedBy: string }
  ): Promise<{ url: string; secureUrl: string; publicId: string }> {
    try {
      // Upload to Cloudinary
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'company-logos',
            resource_type: 'image',
            transformation: [
              { width: 500, height: 500, crop: 'limit' },
              { quality: 'auto' },
              { fetch_format: 'auto' }
            ],
            tags: ['company-logo', companyId]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        uploadStream.end(buffer);
      });

      logger.info({
        companyId,
        publicId: uploadResult.public_id,
        size: buffer.length
      }, 'Company logo uploaded successfully');

      return {
        url: uploadResult.url,
        secureUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id
      };
    } catch (error: any) {
      logger.error({ err: error, companyId }, 'Error uploading company logo');
      throw new Error('Failed to upload company logo');
    }
  }

  /**
   * Upload company document
   */
  async uploadDocument(
    buffer: Buffer,
    companyId: string,
    documentType: string,
    metadata: { filename: string; mimeType: string; uploadedBy: string }
  ): Promise<{ url: string; secureUrl: string; publicId: string; fileId: string }> {
    try {
      // Determine resource type
      const resourceType = this.getResourceType(metadata.mimeType);

      // Upload to Cloudinary
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `company-documents/${documentType}`,
            resource_type: resourceType,
            tags: ['company-document', documentType, companyId]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        uploadStream.end(buffer);
      });

      // Save to database
      const result = await query(
        `INSERT INTO files (
          hash, public_id, url, secure_url, file_size, mime_type,
          original_filename, resource_type, format, uploaded_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'uploaded')
        RETURNING id`,
        [
          uploadResult.public_id, // Using public_id as hash for now
          uploadResult.public_id,
          uploadResult.url,
          uploadResult.secure_url,
          buffer.length,
          metadata.mimeType,
          metadata.filename,
          uploadResult.resource_type,
          uploadResult.format,
          metadata.uploadedBy
        ]
      );

      const fileId = result.rows[0].id;

      logger.info({
        companyId,
        documentType,
        publicId: uploadResult.public_id,
        fileId,
        size: buffer.length
      }, 'Company document uploaded successfully');

      return {
        url: uploadResult.url,
        secureUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        fileId
      };
    } catch (error: any) {
      logger.error({ err: error, companyId, documentType }, 'Error uploading company document');
      throw new Error('Failed to upload company document');
    }
  }

  /**
   * Delete file (soft delete)
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      await query(
        'UPDATE files SET deleted_at = NOW(), status = $1 WHERE id = $2',
        ['deleted', fileId]
      );

      logger.info({ fileId }, 'File soft deleted');
    } catch (error: any) {
      logger.error({ err: error, fileId }, 'Error deleting file');
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Determine Cloudinary resource type from MIME type
   */
  private getResourceType(mimeType: string): 'image' | 'raw' | 'video' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'raw';
  }
}

export const fileUploadService = new FileUploadService();
