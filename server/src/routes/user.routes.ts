import { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { fileUploadService } from '../services/FileUploadService';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { logger } from '../utils/logger';
import { getStatusCodeFromError, formatErrorResponse } from '../middleware/error-formatter.middleware';
import crypto from 'crypto';

export default async function userRoutes(fastify: FastifyInstance) {
  const db = DatabaseFactory.getPrimaryDatabase();

  // Register multipart support for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
      files: 1, // Only 1 file allowed
    },
  });

  // Helper to sanitize filename
  function sanitizeFilename(filename: string): string {
    if (!filename) return 'profile_pic.jpg';
    let sanitized = filename.replace(/^.*[\\\/]/, ''); // Remove paths
    sanitized = sanitized.replace(/[\x00-\x1f\x80-\x9f]/g, ''); // Remove non-printable
    sanitized = sanitized.replace(/[<>:"|?*]/g, '_'); // Remove dangerous chars
    return sanitized.trim() || 'profile_pic.jpg';
  }

  /**
   * POST /api/user/profile-picture
   * Upload and update user profile picture
   */
  fastify.post('/profile-picture', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({
          success: false,
          message: 'No image file uploaded',
        });
      }

      // Validate mime type
      if (!data.mimetype.startsWith('image/')) {
        return reply.code(400).send({
          success: false,
          message: 'Only image files are allowed (JPG, PNG, etc.)',
        });
      }

      const buffer = await data.toBuffer();
      const sanitizedFilename = sanitizeFilename(data.filename);
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');

      // Upload using existing service
      const uploadResult = await fileUploadService.uploadViaIntegrationService({
        hash,
        buffer,
        filename: sanitizedFilename,
        mimeType: data.mimetype,
        uploadedBy: request.user.userId,
        resourceType: 'image',
      });

      if (!uploadResult.success || !uploadResult.file) {
        throw new Error('Failed to upload image');
      }

      const avatarUrl = uploadResult.file.secure_url || uploadResult.file.url;

      // Update user record
      await db.query(
        'UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2',
        [avatarUrl, request.user.userId]
      );

      logger.info({ userId: request.user.userId, avatarUrl }, 'User profile picture updated');

      return reply.code(200).send({
        success: true,
        message: 'Profile picture updated successfully',
        data: {
          avatarUrl,
        },
      });

    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Error updating profile picture');
      const statusCode = getStatusCodeFromError(error);
      return reply.code(statusCode).send(formatErrorResponse(error, 'Failed to update profile picture'));
    }
  });

  /**
   * PUT /api/user/profile
   * Update user profile information
   */
  fastify.put('/profile', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { firstName, lastName, phoneNumber, jobTitle, bio } = request.body as any;
      const userId = request.user.userId;

      // Update user record with provided fields
      const result = await db.query(
        `UPDATE users 
         SET first_name = COALESCE($1, first_name),
             last_name = COALESCE($2, last_name),
             phone_number = COALESCE($3, phone_number),
             job_title = COALESCE($4, job_title),
             bio = COALESCE($5, bio),
             updated_at = NOW() 
         WHERE id = $6
         RETURNING *`,
        [firstName, lastName, phoneNumber, jobTitle, bio, userId]
      );

      if (result.rowCount === 0) {
        return reply.code(404).send({
          success: false,
          message: 'User not found',
        });
      }

      logger.info({ userId }, 'User profile updated');

      return reply.code(200).send({
        success: true,
        message: 'Profile updated successfully',
        data: result.rows[0],
      });
    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Error updating profile');
      const statusCode = getStatusCodeFromError(error);
      return reply.code(statusCode).send(formatErrorResponse(error, 'Failed to update profile'));
    }
  });
}
