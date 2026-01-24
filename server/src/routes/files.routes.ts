import { FastifyInstance } from 'fastify';
import { fileUploadService } from '../services/FileUploadService';
import { logger } from '../utils/logger';
import { query } from '../config/database';
import crypto from 'crypto';
import multipart from '@fastify/multipart';
import { fileService } from '../services/FileService';
import { formatErrorResponse, getStatusCodeFromError } from '../middleware/error-formatter.middleware';

export async function filesRoutes(fastify: FastifyInstance) {

  // Security: Prevent directory traversal attacks by sanitizing filenames
  function sanitizeFilename(filename: string): string {
    if (!filename) return 'unnamed_file';

    // Remove any path components (directory traversal attempts)
    let sanitized = filename.replace(/^.*[\\\/]/, '');

    // Remove null bytes and other dangerous characters
    sanitized = sanitized.replace(/[\x00-\x1f\x80-\x9f]/g, '');

    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[<>:"|?*]/g, '_');

    // Limit length and ensure it's not empty
    sanitized = sanitized.trim() || 'unnamed_file';
    sanitized = sanitized.substring(0, 255);

    // Add timestamp prefix to ensure uniqueness and prevent overwrites
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);

    return `${timestamp}_${random}_${sanitized}`;
  }

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
      /* 
      if (!/^[a-f0-9]{64}$/i.test(hash)) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid hash format. Expected SHA-256 (64 hex characters)'
        });
      }
      */

      const result = await fileService.checkFileExists({
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

      // Extract client hash from form data if provided
      const formData = data.fields as any;
      const clientHash = formData?.hash?.value;

      // Calculate hash to verify/deduplicate
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');

      // Sanitize filename to prevent directory traversal attacks
      const sanitizedFilename = sanitizeFilename(data.filename);

      const uploadResult = await fileService.uploadFile({
        hash,
        buffer,
        filename: sanitizedFilename,
        mimeType: data.mimetype,
        uploadedBy: request.user.userId,
        clientHash
      });

      return reply.code(200).send({
        success: true,
        data: uploadResult,
        message: uploadResult.deduplicated ? 'File already exists - using existing file' : 'File uploaded successfully'
      });
    } catch (error: any) {
      logger.error({
        err: error,
        userId: request.user?.userId
      }, 'Error uploading file');

      const statusCode = getStatusCodeFromError(error);
      const formattedResponse = formatErrorResponse(error, 'Failed to upload file');
      return reply.code(statusCode).send(formattedResponse);
    }
  });


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
        tokenCompanyId: request.user?.companyId
      }, 'Attach file to company request received');

      if (!fileId || !documentType) {
        return reply.code(400).send({
          success: false,
          message: 'Missing required fields: fileId, documentType'
        });
      }

      if (!request.user.companyId) {
        return reply.code(400).send({
          success: false,
          message: 'Authentication error: No company ID in session. Please log in again.'
        });
      }

      const attachResult = await fileService.attachFileToCompany({
        fileId,
        companyId: request.user.companyId,
        documentType,
        purpose,
        metadata
      }, request.user.userId, request.user.companyId);

      return reply.code(200).send({
        success: true,
        message: 'File attached to company successfully',
        data: attachResult
      });
    } catch (error: any) {
      logger.error({
        err: error,
        userId: request.user?.userId,
        companyId: request.user?.companyId
      }, 'Error attaching file to company');

      const statusCode = getStatusCodeFromError(error);
      const formattedResponse = formatErrorResponse(error, 'Failed to attach file to company');
      return reply.code(statusCode).send(formattedResponse);
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

      const files = await fileService.getCompanyFiles(companyId, documentType);

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

      await fileService.deleteFile(fileId, request.user.userId, request.user.companyId);

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

 
}
