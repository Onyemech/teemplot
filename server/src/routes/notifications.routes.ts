import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { notificationService } from '../services/NotificationService';
import { realtimeService } from '../services/RealtimeService';
import { z } from 'zod';

export async function notificationRoutes(fastify: FastifyInstance) {
  // SSE Endpoint
  fastify.get('/stream', {
    onRequest: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    return realtimeService.handleConnection(request, reply);
  });

  // Get notifications
  fastify.get('/', {
    onRequest: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).id || (request.user as any).userId;
      const { page, limit } = request.query as { page?: string, limit?: string };
      
      const notifications = await notificationService.getNotifications(
        userId, 
        parseInt(page || '1'), 
        parseInt(limit || '20')
      );
      
      return reply.send({ success: true, data: notifications });
    } catch (error: any) {
      fastify.log.error('Error fetching notifications:', error);
      return reply.code(500).send({ success: false, message: 'Failed to fetch notifications' });
    }
  });

  // Get unread count
  fastify.get('/unread-count', {
    onRequest: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).id || (request.user as any).userId;
      const count = await notificationService.getUnreadCount(userId);
      return reply.send({ success: true, data: { count } });
    } catch (error: any) {
      fastify.log.error('Error fetching unread count:', error);
      return reply.code(500).send({ success: false, message: 'Failed to fetch unread count' });
    }
  });

  // Mark as read
  fastify.patch('/:id/read', {
    onRequest: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).id || (request.user as any).userId;
      const { id } = request.params as { id: string };
      
      await notificationService.markAsRead(userId, id);
      return reply.send({ success: true, message: 'Notification marked as read' });
    } catch (error: any) {
      fastify.log.error('Error marking notification as read:', error);
      return reply.code(500).send({ success: false, message: 'Failed to mark notification as read' });
    }
  });

  // Mark all as read
  fastify.patch('/read-all', {
    onRequest: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).id || (request.user as any).userId;
      await notificationService.markAllAsRead(userId);
      return reply.send({ success: true, message: 'All notifications marked as read' });
    } catch (error: any) {
      fastify.log.error('Error marking all notifications as read:', error);
      return reply.code(500).send({ success: false, message: 'Failed to mark all notifications as read' });
    }
  });
}
