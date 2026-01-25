import { FastifyInstance } from 'fastify';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { notificationService } from '../services/NotificationService';

export default async function locationRoutes(fastify: FastifyInstance) {
  fastify.post('/update', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { latitude, longitude, accuracy, permissionState } = request.body as {
        latitude: number;
        longitude: number;
        accuracy?: number;
        permissionState: 'granted' | 'denied' | 'prompt' | 'unavailable';
      };

      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return reply.code(400).send({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      const userId = (request.user as any).userId;
      const companyId = (request.user as any).companyId;

      const insertRes = await query(
        'SELECT insert_user_location($1, $2, $3, $4, $5, $6) AS id',
        [companyId, userId, latitude, longitude, accuracy || null, permissionState]
      );

      const latestRes = await query(
        `SELECT is_inside_geofence, distance_meters
         FROM user_locations
         WHERE user_id = $1 AND company_id = $2
         ORDER BY created_at DESC
         LIMIT 2`,
        [userId, companyId]
      );

      const current = latestRes.rows[0];
      const previous = latestRes.rows[1] || null;

      if (
        permissionState === 'granted' &&
        current?.is_inside_geofence === true &&
        (previous === null || previous.is_inside_geofence === false)
      ) {
        await notificationService.sendPushNotification({
          userId,
          title: 'Welcome to the Office',
          body: 'You have entered the office zone. Tap to clock in.',
          data: {
            type: 'attendance',
            action: 'auto_clockin_prompt',
            url: '/dashboard/attendance',
          }
        });
      }

      return reply.code(200).send({
        success: true,
        data: {
          id: insertRes.rows[0].id,
          isInsideGeofence: current?.is_inside_geofence ?? null,
          distanceMeters: current?.distance_meters ?? null
        },
        message: 'Location updated'
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to update location');
      return reply.code(500).send({
        success: false,
        message: 'Failed to update location'
      });
    }
  });
}
