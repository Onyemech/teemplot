import { FastifyInstance } from 'fastify';
import { timezoneService } from '../services/TimezoneService';
import { logger } from '../utils/logger';

export default async function timezoneRoutes(fastify: FastifyInstance) {
  // Get all timezones (cached)
  fastify.get('/', async (request, reply) => {
    try {
      const timezones = await timezoneService.getAllTimezones();
      
      return reply.code(200).send({
        success: true,
        data: timezones,
        message: 'Timezones retrieved successfully'
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to get timezones');
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve timezones'
      });
    }
  });

  // Search timezones
  fastify.get('/search', async (request, reply) => {
    try {
      const { q } = request.query as { q?: string };
      
      const timezones = await timezoneService.searchTimezones(q || '');
      
      return reply.code(200).send({
        success: true,
        data: timezones,
        message: 'Timezone search completed successfully'
      });
    } catch (error: any) {
      logger.error({ error, query: request.query }, 'Failed to search timezones');
      return reply.code(500).send({
        success: false,
        message: 'Failed to search timezones'
      });
    }
  });

  // Get popular timezones
  fastify.get('/popular', async (request, reply) => {
    try {
      const timezones = await timezoneService.getPopularTimezones();
      
      return reply.code(200).send({
        success: true,
        data: timezones,
        message: 'Popular timezones retrieved successfully'
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to get popular timezones');
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve popular timezones'
      });
    }
  });

  // Refresh timezone cache (admin only)
  fastify.post('/refresh-cache', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check if user is admin/owner
      if (request.user.role !== 'admin' && request.user.role !== 'owner') {
        return reply.code(403).send({
          success: false,
          message: 'Only admins can refresh timezone cache'
        });
      }

      await timezoneService.refreshCache();
      
      logger.info({
        userId: request.user.userId,
        companyId: request.user.companyId
      }, 'Timezone cache refreshed by admin');
      
      return reply.code(200).send({
        success: true,
        message: 'Timezone cache refreshed successfully'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Failed to refresh timezone cache');
      return reply.code(500).send({
        success: false,
        message: 'Failed to refresh timezone cache'
      });
    }
  });
}