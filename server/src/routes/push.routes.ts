import { FastifyInstance } from 'fastify';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

export default async function pushRoutes(fastify: FastifyInstance) {
  fastify.get('/api/push/vapidPublicKey', (request, reply) => {
    if (!process.env.VAPID_PUBLIC_KEY) {
      logger.error('VAPID_PUBLIC_KEY not set');
      return reply.code(500).send({ success: false, message: 'VAPID public key not configured' });
    }
    reply.send({ publicKey: process.env.VAPID_PUBLIC_KEY });
  });

  fastify.post('/api/push/subscribe', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['endpoint', 'keys'],
        properties: {
          endpoint: { type: 'string' },
          keys: {
            type: 'object',
            required: ['p256dh', 'auth'],
            properties: {
              p256dh: { type: 'string' },
              auth: { type: 'string' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { endpoint, keys } = request.body as any;
    const userId = (request.user as any).id;

    try {
      await pool.query(
        'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES ($1, $2, $3, $4) ON CONFLICT (endpoint) DO UPDATE SET p256dh = $3, auth = $4, updated_at = NOW()',
        [userId, endpoint, keys.p256dh, keys.auth]
      );
      reply.code(201).send({ success: true });
    } catch (error) {
      logger.error({ error, userId }, 'Failed to subscribe to push notifications');
      reply.code(500).send({ success: false, message: 'Failed to subscribe' });
    }
  });

  fastify.post('/api/push/unsubscribe', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['endpoint'],
        properties: {
          endpoint: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { endpoint } = request.body as any;
    const userId = (request.user as any).id;

    try {
      await pool.query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [userId, endpoint]);
      reply.send({ success: true });
    } catch (error) {
      logger.error({ error, userId }, 'Failed to unsubscribe from push notifications');
      reply.code(500).send({ success: false, message: 'Failed to unsubscribe' });
    }
  });
}
