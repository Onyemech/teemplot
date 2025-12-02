import { FastifyInstance } from 'fastify';
import { fileUploadService } from '../services/FileUploadService';
import { logger } from '../utils/logger';
import crypto from 'crypto';
import multipart from '@fastify/multipart';

export default async function filesRoutes(fastify: FastifyInstance) {
  // Register multipart for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    }
  });

  /**
   * Check if file exists by hash (before uploading)
   * POST /api/files/check
   */
  fastify.post('/check', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { hash, filename, size, mimeType } = request.body as {
        hash: string;
        filename: string;
        size: number;
        mimeType: string;
      };

      if (!hash || !filename || !size || !mimeType) {
        return reply.code(400).send({
          success: false,
          message: 'Missing required fields: hash, filename, size, mimeType'
        });
      }

      // Validate hash format (SHA-256 = 64 hex characters)
      if (!/^[a-f0-9]{64}$/i.test(hash)) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid hash format. Expected SHA-256 (64 hex characters)'
        });
      }

      const result = await fileUploadService.checkFileExists({
        hash,
        filename,
        size,
        mimeType
      });

      return reply.code(200).send({
        success: true,
        data: result,
        message: result.exists 
          ? 'File already exists - no upload needed' 
          : 'File does not exist - proceed with upload'
      });
    } catch (error: any) {
      logger.error({ 
        err: error, 
        userId: request.user?.userId 
      }, 'Error checking file existence');
      
      return reply.code(500).send({
        success: false,
        message: 'Failed to check file existence'
      });
    }
  });

  /**
   * Upload file (only if not exists)
   * POST /api/files/upload
   */
  fastify.post('/upload', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const data = await request.file();
      
      if (!data) {
        return reply.code(400).send({
          success: false,
          message: 'No file uploaded'
        });
      }

      const buffer = await data.toBuffer();
      
      // Compute hash server-side as verification
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      
      // Get hash from form data (should match computed hash)
      const clientHash = (request.body as any)?.hash;
      
      if (clientHash && clientHash !== hash) {
        return reply.code(400).send({
          success: false,
          message: 'Hash mismatch - file may be corrupted'
        });
      }

      // Check if file already exists (double-check)
      const existingFile = await fileUploadService.checkFileExists({
        hash,
        filename: data.filename,
        size: buffer.length,
        mimeType: data.mimetype
      });

      if (existingFile.exists && existingFile.file) {
        return reply.code(200).send({
          success: true,
          data: {
            file: existingFile.file,
            deduplicated: true
          },
          message: 'File already exists - using existing file'
        });
      }

      // Upload to Cloudinary
      const uploadResult = await fileUploadService.uploadToCloudinary({
        hash,
        buffer,
        filename: data.filename,
        mimeType: data.mimetype,
        uploadedBy: request.user.userId
      });

      return reply.code(200).send({
        success: true,
        data: {
          file: uploadResult.file,
          deduplicated: false
        },
        message: 'File uploaded successfully'
      });
    } catch (error: any) {
      logger.error({ 
        err: error, 
        userId: request.user?.userId 
      }, 'Error uploading file');
      
      return reply.code(500).send({
        success: false,
        message: 'Failed to upload file'
      });
    }
  });

  /**
   * Attach file to company
   * POST /api/files/attach-to-company
   */
  fastify.post('/attach-to-company', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { fileId, documentType, purpose, metadata } = request.body as {
        fileId: string;
        documentType: string;
        purpose?: string;
        metadata?: Record<string, any>;
      };

      logger.info({
        fileId,
        documentType,
        userId: request.user?.userId,
        companyId: request.user?.companyId
      }, 'Attach file to company request received');

      if (!fileId || !documentType) {
        return reply.code(400).send({
          success: false,
          message: 'Missing required fields: fileId, documentType'
        });
      }

      const companyId = request.user.companyId;
      if (!companyId) {
        logger.error({
          userId: request.user?.userId,
          user: request.user
        }, 'User is not associated with a company');
        
        return reply.code(400).send({
          success: false,
          message: 'User is not associated with a company. Please complete company setup first.'
        });
      }

      await fileUploadService.attachFileToCompany({
        companyId,
        fileId,
        documentType,
        uploadedBy: request.user.userId,
        purpose,
        metadata
      });

      return reply.code(200).send({
        success: true,
        message: 'File attached to company successfully'
      });
    } catch (error: any) {
      logger.error({ 
        err: error, 
        userId: request.user?.userId,
        companyId: request.user?.companyId 
      }, 'Error attaching file to company');
      
      return reply.code(500).send({
        success: false,
        message: 'Failed to attach file to company'
      });
    }
  });

  /**
   * Get company files
   * GET /api/files/company/:documentType?
   */
  fastify.get('/company/:documentType?', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { documentType } = request.params as { documentType?: string };
      const companyId = request.user.companyId;

      if (!companyId) {
        return reply.code(400).send({
          success: false,
          message: 'User is not associated with a company'
        });
      }

      const files = await fileUploadService.getCompanyFiles(companyId, documentType);

      return reply.code(200).send({
        success: true,
        data: files,
        message: 'Company files retrieved successfully'
      });
    } catch (error: any) {
      logger.error({ 
        err: error, 
        userId: request.user?.userId,
        companyId: request.user?.companyId 
      }, 'Error fetching company files');
      
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch company files'
      });
    }
  });

  /**
   * Delete file
   * DELETE /api/files/:fileId
   */
  fastify.delete('/:fileId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { fileId } = request.params as { fileId: string };

      // TODO: Add permission check - only allow file owner or admin to delete

      await fileUploadService.deleteFile(fileId);

      return reply.code(200).send({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error: any) {
      logger.error({ 
        err: error, 
        userId: request.user?.userId 
      }, 'Error deleting file');
      
      return reply.code(500).send({
        success: false,
        message: 'Failed to delete file'
      });
    }
  });

  /**
   * Get upload signature for client-side upload (optional - for direct uploads)
   * POST /api/files/signature
   */
  fastify.post('/signature', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { hash, resourceType = 'raw' } = request.body as {
        hash: string;
        resourceType?: 'image' | 'raw' | 'video';
      };

      if (!hash) {
        return reply.code(400).send({
          success: false,
          message: 'Hash is required'
        });
      }

      // Generate Cloudinary signature for client-side upload
      const timestamp = Math.round(Date.now() / 1000);
      const params = {
        timestamp,
        public_id: hash,
        folder: 'company-documents',
        resource_type: resourceType,
        overwrite: false
      };

      const signature = require('cloudinary').v2.utils.api_sign_request(
        params,
        process.env.CLOUDINARY_API_SECRET!
      );

      return reply.code(200).send({
        success: true,
        data: {
          signature,
          timestamp,
          api_key: process.env.CLOUDINARY_API_KEY,
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          public_id: hash,
          folder: 'company-documents',
          resource_type: resourceType
        },
        message: 'Upload signature generated'
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Error generating upload signature');
      
      return reply.code(500).send({
        success: false,
        message: 'Failed to generate upload signature'
      });
    }
  });
}
