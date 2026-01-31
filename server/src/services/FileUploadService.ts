import { v2 as cloudinary } from 'cloudinary';
import axios from 'axios';
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
   * Upload file via Integration Service (Cloudflare Worker or Image Service)
   */
  async uploadViaIntegrationService(request: FileUploadRequest): Promise<FileUploadResponse> {
    try {
      const formData = new FormData();
      const blob = new Blob([request.buffer], { type: request.mimeType });
      formData.append('image', blob, request.filename);
      formData.append('client', 'teemplot');

      const serviceUrl =
        process.env.FILE_INTEGRATION_URL ||
        'https://cf-image-worker.sabimage.workers.dev/upload';

      const response = await axios.post(serviceUrl, formData, {
        timeout: 120000
      });

      const data = response.data;
      const url: string = data.url || data.secure_url || data.location;
      const publicId: string = data.key || (url ? (url.split('/').pop()?.split('.')[0] || request.hash) : request.hash);

      const result = await query(
        `INSERT INTO files (
          hash, public_id, url, secure_url, file_size, mime_type,
          original_filename, resource_type, format, uploaded_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'uploaded')
        ON CONFLICT (hash) DO UPDATE SET
          updated_at = NOW(),
          upload_count = files.upload_count + 1
        RETURNING id, hash, public_id, url, secure_url, file_size, mime_type`,
        [
          request.hash,
          publicId,
          url,
          url,
          request.buffer.length,
          request.mimeType,
          request.filename,
          this.getResourceType(request.mimeType),
          (url && url.includes('.') ? url.split('.').pop() : null),
          request.uploadedBy
        ]
      );

      const file = result.rows[0];

      logger.info({
        fileId: file.id,
        hash: request.hash,
        publicId,
        size: request.buffer.length
      }, 'File uploaded via Integration Service');

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
      logger.error({ err: error?.message || error, filename: request.filename }, 'Integration upload failed');
      throw new Error('Failed to upload file via integration service');
    }
  }

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
   * Upload file to Cloudinary using hash as public_id with retry logic
   */
  async uploadToCloudinary(request: FileUploadRequest): Promise<FileUploadResponse> {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info({ hash: request.hash.substring(0, 8), attempt }, 'Attempting to upload file to Cloudinary');

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
              tags: ['company-document', request.mimeType.split('/')[0]],
              timeout: 60000 // 60 second timeout
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
          size: request.buffer.length,
          attempt
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
        lastError = error;
        
        // Check if it's a network/DNS error
        const isNetworkError = error.code === 'EAI_AGAIN' || 
                              error.code === 'ENOTFOUND' || 
                              error.code === 'ETIMEDOUT' ||
                              error.code === 'ECONNREFUSED';

        logger.warn({ 
          err: error, 
          hash: request.hash.substring(0, 8), 
          attempt,
          isNetworkError,
          willRetry: attempt < maxRetries
        }, `File upload attempt ${attempt} failed`);

        // If it's a network error and we have retries left, wait and retry
        if (isNetworkError && attempt < maxRetries) {
          const delay = attempt * 2000; // 2s, 4s, 6s
          logger.info({ delay, attempt }, 'Waiting before retry');
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

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

        // If not a network error or out of retries, break
        break;
      }
    }

    // All retries failed
    logger.error({ 
      err: lastError, 
      hash: request.hash.substring(0, 8),
      attempts: maxRetries 
    }, 'Failed to upload file after all retries');

    // Provide user-friendly error message
    if (lastError.code === 'EAI_AGAIN' || lastError.code === 'ENOTFOUND') {
      throw new Error('Unable to connect to file storage service. Please check your internet connection and try again.');
    } else if (lastError.code === 'ETIMEDOUT') {
      throw new Error('File upload timed out. Please try again with a smaller file or check your internet connection.');
    } else {
      throw new Error('Failed to upload file. Please try again.');
    }
  }

  /**
   * Attach a file to a company (creates company_files record)
   */
  async attachFileToCompany(request: AttachFileToCompanyRequest): Promise<void> {
    try {
      logger.info({
        companyId: request.companyId,
        fileId: request.fileId,
        documentType: request.documentType,
        uploadedBy: request.uploadedBy
      }, 'Starting to attach file to company');

      // Validate inputs
      if (!request.companyId) {
        throw new Error('Company ID is required');
      }
      if (!request.fileId) {
        throw new Error('File ID is required');
      }
      if (!request.documentType) {
        throw new Error('Document type is required');
      }

      // Deactivate any existing active file for this document type
      await query(
        `UPDATE company_files
         SET is_active = FALSE, updated_at = NOW()
         WHERE company_id = $1 AND document_type = $2 AND is_active = TRUE`,
        [request.companyId, request.documentType]
      );

      logger.info({ companyId: request.companyId, documentType: request.documentType }, 'Deactivated existing files');

      // Create new company_files record
      await query(
        `INSERT INTO company_files (
          company_id, file_id, document_type, uploaded_by, purpose, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          request.companyId,
          request.fileId,
          request.documentType,
          request.uploadedBy || null,
          request.purpose || null,
          JSON.stringify(request.metadata || {})
        ]
      );

      logger.info({ companyId: request.companyId, fileId: request.fileId }, 'Created company_files record');

      // Update company table with document URL (for backward compatibility)
      const urlColumnMap: Record<string, string> = {
        'cac': 'cac_document_url',
        'proof_of_address': 'proof_of_address_url',
        'company_policy': 'company_policy_url'
      };

      const urlColumn = urlColumnMap[request.documentType];
      if (urlColumn) {
        try {
          const fileResult = await query(
            'SELECT secure_url FROM files WHERE id = $1',
            [request.fileId]
          );

          if (fileResult.rows.length > 0) {
            const secureUrl = fileResult.rows[0].secure_url;
            
            // Use parameterized query with CASE statement to avoid SQL injection
            if (request.documentType === 'cac') {
              await query(
                'UPDATE companies SET cac_document_url = $1, updated_at = NOW() WHERE id = $2',
                [secureUrl, request.companyId]
              );
            } else if (request.documentType === 'proof_of_address') {
              await query(
                'UPDATE companies SET proof_of_address_url = $1, updated_at = NOW() WHERE id = $2',
                [secureUrl, request.companyId]
              );
            } else if (request.documentType === 'company_policy') {
              await query(
                'UPDATE companies SET company_policy_url = $1, updated_at = NOW() WHERE id = $2',
                [secureUrl, request.companyId]
              );
            }
            
            logger.info({
              companyId: request.companyId,
              documentType: request.documentType,
              urlColumn,
              secureUrl
            }, 'Updated company document URL');
          } else {
            logger.warn({
              fileId: request.fileId
            }, 'File not found when trying to update company URL');
          }
        } catch (urlUpdateError: any) {
          logger.error({ 
            err: urlUpdateError, 
            fileId: request.fileId,
            companyId: request.companyId,
            documentType: request.documentType
          }, 'Error updating company document URL');
          // Don't throw - file is already attached to company_files table
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
   * Upload company logo using Global Image Optimization Service
   */
  async uploadLogo(
    buffer: Buffer,
    companyId: string,
    metadata: { filename: string; mimeType: string; uploadedBy: string }
  ): Promise<{ url: string; secureUrl: string; publicId: string }> {
    try {
      const formData = new FormData();
      const blob = new Blob([buffer], { type: metadata.mimeType });
      formData.append('image', blob, metadata.filename);
      formData.append('client', 'teemplot');

      const serviceUrl = process.env.FILE_INTEGRATION_URL || 'https://cf-image-worker.sabimage.workers.dev/upload';

      const response = await axios.post(serviceUrl, formData, {
        timeout: 120000
      });

      const { url, key } = response.data;
      const publicId = key || (url.split('/').pop()?.split('.')[0] || `logo-${Date.now()}`);

      return {
        url,
        secureUrl: url,
        publicId
      };
    } catch (error: any) {
      logger.error({ err: error?.message || error, companyId }, 'Logo upload via Integration Service failed');
      throw new Error('Failed to upload company logo via integration service');
    }
  }

  /**
   * Upload company document with retry logic
   */
  async uploadDocument(
    buffer: Buffer,
    companyId: string,
    documentType: string,
    metadata: { filename: string; mimeType: string; uploadedBy: string }
  ): Promise<{ url: string; secureUrl: string; publicId: string; fileId: string }> {
    try {
      const upload = await this.uploadViaIntegrationService({
        hash: metadata.filename + '-' + Date.now(),
        buffer,
        filename: metadata.filename,
        mimeType: metadata.mimeType,
        uploadedBy: metadata.uploadedBy
      });

      const fileIdRes = await query(
        'SELECT id FROM files WHERE public_id = $1',
        [upload.file.public_id]
      );
      const fileId = fileIdRes.rows[0]?.id || upload.file.id;

      return {
        url: upload.file.url,
        secureUrl: upload.file.secure_url,
        publicId: upload.file.public_id,
        fileId
      };
    } catch (error: any) {
      logger.error({ err: error?.message || error, companyId, documentType }, 'Integration document upload failed');
      throw new Error('Failed to upload company document via integration service');
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
