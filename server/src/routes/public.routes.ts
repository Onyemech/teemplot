import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { logger } from '../utils/logger';

export async function publicRoutes(fastify: FastifyInstance) {
  /**
   * Get demo video URL (public - no auth required)
   */
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const db = DatabaseFactory.getPrimaryDatabase();
      
      // Get the latest active demo video
      const videos = await db.find('demo_videos', { is_active: 1 });
      
      if (videos.length === 0) {
        return reply.send({
          success: true,
          data: null,
          message: 'No demo video available yet',
        });
      }

      // Sort by created_at and get the latest
      const latestVideo = videos.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      return reply.send({
        success: true,
        data: {
          videoUrl: latestVideo.video_url,
          title: latestVideo.title,
          description: latestVideo.description,
        },
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to fetch demo video');
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch demo video',
      });
    }
  });
}
