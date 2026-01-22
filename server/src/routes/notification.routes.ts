import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { notificationService } from '../services/NotificationService';

export async function notificationRoute(fastify: FastifyInstance) {
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
}
