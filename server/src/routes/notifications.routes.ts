import { FastifyInstance } from 'fastify';
import { query } from '../config/database';
import { logger } from '../utils/logger';

export default async function notificationsRoutes(fastify: FastifyInstance) {
  // Get user notifications
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const result = await query(
        `SELECT 
          id,
          title,
          message,
          type,
          is_read,
          action_url,
          metadata,
          created_at
        FROM notifications 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 50`,
        [request.user.userId]
      );

      return reply.code(200).send({
        success: true,
        data: result.rows.map(row => ({
          id: row.id,
          title: row.title,
          message: row.message,
          type: row.type,
          isRead: row.is_read,
          actionUrl: row.action_url,
          metadata: row.metadata,
          createdAt: row.created_at
        }))
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Failed to get notifications');
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve notifications'
      });
    }
  });

  // Mark notification as read
  fastify.patch('/:id/read', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      await query(
        'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
        [id, request.user.userId]
      );

      return reply.code(200).send({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Failed to mark notification as read');
      return reply.code(500).send({
        success: false,
        message: 'Failed to mark notification as read'
      });
    }
  });

  // Mark all notifications as read
  fastify.patch('/read-all', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      await query(
        'UPDATE notifications SET is_read = true WHERE user_id = $1',
        [request.user.userId]
      );

      return reply.code(200).send({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Failed to mark all notifications as read');
      return reply.code(500).send({
        success: false,
        message: 'Failed to mark all notifications as read'
      });
    }
  });

  // Delete notification
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      await query(
        'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
        [id, request.user.userId]
      );

      return reply.code(200).send({
        success: true,
        message: 'Notification deleted'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Failed to delete notification');
      return reply.code(500).send({
        success: false,
        message: 'Failed to delete notification'
      });
    }
  });

  // Subscribe to push notifications
  fastify.post('/subscribe', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { subscription } = request.body as { subscription: any };

      // Store push subscription in database
      await query(
        `INSERT INTO push_subscriptions (user_id, subscription_data, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id) 
         DO UPDATE SET subscription_data = $2, updated_at = NOW()`,
        [request.user.userId, JSON.stringify(subscription)]
      );

      return reply.code(200).send({
        success: true,
        message: 'Push notification subscription saved'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Failed to save push subscription');
      return reply.code(500).send({
        success: false,
        message: 'Failed to save push subscription'
      });
    }
  });

  // Create notification (internal use)
  fastify.post('/create', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Only allow admins/owners to create notifications
      if (request.user.role !== 'owner' && request.user.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can create notifications'
        });
      }

      const { 
        userId, 
        title, 
        message, 
        type = 'info', 
        actionUrl, 
        metadata 
      } = request.body as {
        userId: string;
        title: string;
        message: string;
        type?: string;
        actionUrl?: string;
        metadata?: Record<string, any>;
      };

      const result = await query(
        `INSERT INTO notifications (user_id, title, message, type, action_url, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id`,
        [userId, title, message, type, actionUrl, metadata ? JSON.stringify(metadata) : null]
      );

      // TODO: Send push notification if user has subscription
      
      return reply.code(201).send({
        success: true,
        data: { id: result.rows[0].id },
        message: 'Notification created'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Failed to create notification');
      return reply.code(500).send({
        success: false,
        message: 'Failed to create notification'
      });
    }
  });
}

// Helper function to create notifications
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: string = 'info',
  actionUrl?: string,
  metadata?: Record<string, any>
) {
  try {
    await query(
      `INSERT INTO notifications (user_id, title, message, type, action_url, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [userId, title, message, type, actionUrl, metadata ? JSON.stringify(metadata) : null]
    );
    
    logger.info({ userId, title, type }, 'Notification created');
  } catch (error) {
    logger.error({ error, userId, title }, 'Failed to create notification');
  }
}