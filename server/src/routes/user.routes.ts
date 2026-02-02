import { FastifyInstance } from 'fastify';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { logger } from '../utils/logger';
import { getStatusCodeFromError, formatErrorResponse } from '../middleware/error-formatter.middleware';

export default async function userRoutes(fastify: FastifyInstance) {
  const db = DatabaseFactory.getPrimaryDatabase();

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
   * Update user profile picture URL (after direct upload)
   */
  fastify.post('/profile-picture', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { avatarUrl } = request.body as { avatarUrl: string };

      if (!avatarUrl) {
        return reply.code(400).send({
          success: false,
          message: 'Avatar URL is required',
        });
      }

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
      const { firstName, lastName, phoneNumber, jobTitle, bio, dateOfBirth } = request.body as any;
      const userId = request.user.userId;

      // Update user record with provided fields
      const result = await db.query(
        `UPDATE users 
         SET first_name = COALESCE($1, first_name),
             last_name = COALESCE($2, last_name),
             phone_number = COALESCE($3, phone_number),
             job_title = COALESCE($4, job_title),
             bio = COALESCE($5, bio),
             date_of_birth = COALESCE($6, date_of_birth),
             updated_at = NOW() 
         WHERE id = $7
         RETURNING *`,
        [firstName, lastName, phoneNumber, jobTitle, bio, dateOfBirth, userId]
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
