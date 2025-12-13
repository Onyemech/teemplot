import { FastifyInstance } from 'fastify';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import bcrypt from 'bcrypt';
import { pipeline } from 'stream/promises';

export default async function usersRoutes(fastify: FastifyInstance) {
  // Register multipart support
  await fastify.register(require('@fastify/multipart'));

  // Get user profile
  fastify.get('/profile', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { userId } = request.user;

      const result = await query(
        `SELECT 
          first_name as "firstName",
          last_name as "lastName", 
          email,
          phone_number as "phoneNumber",
          avatar_url as avatar,
          position,
          department_id as "departmentId"
        FROM users 
        WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'User not found'
        });
      }

      return reply.code(200).send({
        success: true,
        data: result.rows[0],
        message: 'Profile retrieved successfully'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Failed to get user profile');
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve profile'
      });
    }
  });

  // Update user profile
  fastify.patch('/profile', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { userId } = request.user;
      const { firstName, lastName, phoneNumber } = request.body as {
        firstName?: string;
        lastName?: string;
        phoneNumber?: string;
      };

      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (firstName) {
        params.push(firstName);
        updates.push(`first_name = $${paramIndex++}`);
      }

      if (lastName) {
        params.push(lastName);
        updates.push(`last_name = $${paramIndex++}`);
      }

      if (phoneNumber) {
        params.push(phoneNumber);
        updates.push(`phone_number = $${paramIndex++}`);
      }

      if (updates.length === 0) {
        return reply.code(400).send({
          success: false,
          message: 'No updates provided'
        });
      }

      params.push(userId);
      updates.push('updated_at = NOW()');

      const result = await query(
        `UPDATE users 
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING first_name as "firstName", last_name as "lastName", phone_number as "phoneNumber"`,
        params
      );

      logger.info({
        userId,
        updates: Object.keys(request.body as object)
      }, 'User profile updated');

      return reply.code(200).send({
        success: true,
        data: result.rows[0],
        message: 'Profile updated successfully'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Failed to update user profile');
      return reply.code(500).send({
        success: false,
        message: 'Failed to update profile'
      });
    }
  });

  // Upload avatar
  fastify.post('/avatar', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { userId } = request.user;
      
      const data = await request.file();
      
      if (!data) {
        return reply.code(400).send({
          success: false,
          message: 'No file uploaded'
        });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'
        });
      }

      // Create upload directory
      const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
      await fs.mkdir(uploadDir, { recursive: true });

      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `avatar-${uniqueSuffix}${path.extname(data.filename)}`;
      const filepath = path.join(uploadDir, filename);

      // Save file
      await pipeline(data.file, createWriteStream(filepath));

      // Generate avatar URL
      const avatarUrl = `/uploads/avatars/${filename}`;

      // Update user avatar in database
      const result = await query(
        `UPDATE users 
         SET avatar_url = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING avatar_url as "avatarUrl"`,
        [avatarUrl, userId]
      );

      logger.info({
        userId,
        filename,
        mimetype: data.mimetype
      }, 'User avatar updated');

      return reply.code(200).send({
        success: true,
        data: { avatarUrl },
        message: 'Avatar updated successfully'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Failed to upload avatar');
      return reply.code(500).send({
        success: false,
        message: 'Failed to upload avatar'
      });
    }
  });

  // Get user settings
  fastify.get('/settings', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { userId } = request.user;

      const result = await query(
        `SELECT 
          COALESCE((settings->>'pushNotifications')::boolean, true) as "pushNotifications",
          COALESCE((settings->>'biometricSecurity')::boolean, false) as "biometricSecurity",
          COALESCE((settings->>'emailNotifications')::boolean, true) as "emailNotifications"
        FROM users 
        WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'User not found'
        });
      }

      return reply.code(200).send({
        success: true,
        data: result.rows[0],
        message: 'Settings retrieved successfully'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Failed to get user settings');
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve settings'
      });
    }
  });

  // Update user settings
  fastify.patch('/settings', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { userId } = request.user;
      const settingsUpdate = request.body as {
        pushNotifications?: boolean;
        biometricSecurity?: boolean;
        emailNotifications?: boolean;
      };

      // Get current settings
      const currentResult = await query(
        `SELECT settings FROM users WHERE id = $1`,
        [userId]
      );

      const currentSettings = currentResult.rows[0]?.settings || {};
      const newSettings = { ...currentSettings, ...settingsUpdate };

      // Update settings
      const result = await query(
        `UPDATE users 
         SET settings = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING 
           COALESCE((settings->>'pushNotifications')::boolean, true) as "pushNotifications",
           COALESCE((settings->>'biometricSecurity')::boolean, false) as "biometricSecurity",
           COALESCE((settings->>'emailNotifications')::boolean, true) as "emailNotifications"`,
        [JSON.stringify(newSettings), userId]
      );

      logger.info({
        userId,
        settingsUpdate
      }, 'User settings updated');

      return reply.code(200).send({
        success: true,
        data: result.rows[0],
        message: 'Settings updated successfully'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Failed to update user settings');
      return reply.code(500).send({
        success: false,
        message: 'Failed to update settings'
      });
    }
  });

  // Change password
  fastify.patch('/change-password', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { userId } = request.user;
      const { currentPassword, newPassword } = request.body as {
        currentPassword: string;
        newPassword: string;
      };

      if (!currentPassword || !newPassword) {
        return reply.code(400).send({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      if (newPassword.length < 8) {
        return reply.code(400).send({
          success: false,
          message: 'New password must be at least 8 characters long'
        });
      }

      // Verify current password
      const userResult = await query(
        `SELECT password_hash FROM users WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'User not found'
        });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
      if (!isValidPassword) {
        return reply.code(400).send({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      // Update password
      await query(
        `UPDATE users 
         SET password_hash = $1, updated_at = NOW()
         WHERE id = $2`,
        [newPasswordHash, userId]
      );

      logger.info({ userId }, 'User password changed');

      return reply.code(200).send({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Failed to change password');
      return reply.code(500).send({
        success: false,
        message: 'Failed to change password'
      });
    }
  });
}