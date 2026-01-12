import { FastifyInstance } from 'fastify';
import { query } from '../config/database';
import { logger } from '../utils/logger';

export default async function companySettingsRoutes(fastify: FastifyInstance) {
  // Get company settings
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Allow all authenticated users to view company settings
      const result = await query(
        `SELECT 
          work_start_time,
          work_end_time,
          working_days,
          timezone,
          auto_clockin_enabled,
          auto_clockout_enabled,
          geofence_radius_meters,
          office_latitude,
          office_longitude,
          formatted_address as office_address,
          early_departure_threshold_minutes,
          notify_early_departure,
          grace_period_minutes,
          require_geofence_for_clockin,
          biometrics_required,
          time_format,
          date_format,
          currency,

          language,
          breaks_enabled,
          max_break_duration_minutes
        FROM companies 
        WHERE id = $1`,
        [request.user.companyId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'Company not found'
        });
      }

      return reply.code(200).send({
        success: true,
        data: result.rows[0],
        message: 'Company settings retrieved successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to get company settings');
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve company settings'
      });
    }
  });

  // Update work schedule
  fastify.patch('/work-schedule', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check role
      if (request.user.role !== 'owner' && request.user.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can update work schedule'
        });
      }
      const {
        workStartTime,
        workEndTime,
        workingDays,
        timezone
      } = request.body as {
        workStartTime?: string;
        workEndTime?: string;
        workingDays?: Record<string, boolean>;
        timezone?: string;
      };

      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (workStartTime) {
        params.push(workStartTime);
        updates.push(`work_start_time = $${paramIndex++}`);
      }

      if (workEndTime) {
        params.push(workEndTime);
        updates.push(`work_end_time = $${paramIndex++}`);
      }

      if (workingDays) {
        params.push(JSON.stringify(workingDays));
        updates.push(`working_days = $${paramIndex++}`);
      }

      if (timezone) {
        params.push(timezone);
        updates.push(`timezone = $${paramIndex++}`);
      }

      if (updates.length === 0) {
        return reply.code(400).send({
          success: false,
          message: 'No updates provided'
        });
      }

      params.push(request.user.companyId);
      updates.push('updated_at = NOW()');

      const result = await query(
        `UPDATE companies 
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING work_start_time, work_end_time, working_days, timezone`,
        params
      );

      logger.info({
        companyId: request.user.companyId,
        userId: request.user.userId,
        updates: Object.keys(request.body as object)
      }, 'Work schedule updated');

      return reply.code(200).send({
        success: true,
        data: result.rows[0],
        message: 'Work schedule updated successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to update work schedule');
      return reply.code(500).send({
        success: false,
        message: 'Failed to update work schedule'
      });
    }
  });

  // Update auto-attendance settings
  fastify.patch('/auto-attendance', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check role
      if (request.user.role !== 'owner' && request.user.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can update auto-attendance settings'
        });
      }
      const {
        autoCheckinEnabled,
        autoCheckoutEnabled,
        geofenceRadiusMeters,
        requireGeofenceForCheckin
      } = request.body as {
        autoCheckinEnabled?: boolean;
        autoCheckoutEnabled?: boolean;
        geofenceRadiusMeters?: number;
        requireGeofenceForCheckin?: boolean;
      };

      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (typeof autoCheckinEnabled === 'boolean') {
        params.push(autoCheckinEnabled);
        updates.push(`auto_clockin_enabled = $${paramIndex++}`);
      }

      if (typeof autoCheckoutEnabled === 'boolean') {
        params.push(autoCheckoutEnabled);
        updates.push(`auto_clockout_enabled = $${paramIndex++}`);
      }

      if (geofenceRadiusMeters) {
        params.push(geofenceRadiusMeters);
        updates.push(`geofence_radius_meters = $${paramIndex++}`);
      }

      if (typeof requireGeofenceForCheckin === 'boolean') {
        params.push(requireGeofenceForCheckin);
        updates.push(`require_geofence_for_clockin = $${paramIndex++}`);
      }

      if (updates.length === 0) {
        return reply.code(400).send({
          success: false,
          message: 'No updates provided'
        });
      }

      params.push(request.user.companyId);
      updates.push('updated_at = NOW()');

      const result = await query(
        `UPDATE companies 
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING auto_clockin_enabled, auto_clockout_enabled, 
                   geofence_radius_meters, require_geofence_for_clockin`,
        params
      );

      logger.info({
        companyId: request.user.companyId,
        userId: request.user.userId,
        updates: Object.keys(request.body as object)
      }, 'Auto-attendance settings updated');

      return reply.code(200).send({
        success: true,
        data: result.rows[0],
        message: 'Auto-attendance settings updated successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to update auto-attendance settings');
      return reply.code(500).send({
        success: false,
        message: 'Failed to update auto-attendance settings'
      });
    }
  });

  // Update notification settings
  fastify.patch('/notifications', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check role
      if (request.user.role !== 'owner' && request.user.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can update notification settings'
        });
      }
      const {
        notifyEarlyDeparture,
        earlyDepartureThresholdMinutes,
        gracePeriodMinutes
      } = request.body as {
        notifyEarlyDeparture?: boolean;
        earlyDepartureThresholdMinutes?: number;
        gracePeriodMinutes?: number;
      };

      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (typeof notifyEarlyDeparture === 'boolean') {
        params.push(notifyEarlyDeparture);
        updates.push(`notify_early_departure = $${paramIndex++}`);
      }

      if (earlyDepartureThresholdMinutes) {
        params.push(earlyDepartureThresholdMinutes);
        updates.push(`early_departure_threshold_minutes = $${paramIndex++}`);
      }

      if (gracePeriodMinutes) {
        params.push(gracePeriodMinutes);
        updates.push(`grace_period_minutes = $${paramIndex++}`);
      }

      if (updates.length === 0) {
        return reply.code(400).send({
          success: false,
          message: 'No updates provided'
        });
      }

      params.push(request.user.companyId);
      updates.push('updated_at = NOW()');

      const result = await query(
        `UPDATE companies 
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING notify_early_departure, early_departure_threshold_minutes, grace_period_minutes`,
        params
      );

      logger.info({
        companyId: request.user.companyId,
        userId: request.user.userId,
        updates: Object.keys(request.body as object)
      }, 'Notification settings updated');

      return reply.code(200).send({
        success: true,
        data: result.rows[0],
        message: 'Notification settings updated successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to update notification settings');
      return reply.code(500).send({
        success: false,
        message: 'Failed to update notification settings'
      });
    }
  });

  // Update biometrics settings
  fastify.patch('/biometrics', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check role
      if (request.user.role !== 'owner' && request.user.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can update biometrics settings'
        });
      }
      const { biometricsRequired } = request.body as { biometricsRequired: boolean };

      if (typeof biometricsRequired !== 'boolean') {
        return reply.code(400).send({
          success: false,
          message: 'biometricsRequired must be a boolean'
        });
      }

      const result = await query(
        `UPDATE companies 
         SET biometrics_required = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING biometrics_required`,
        [biometricsRequired, request.user.companyId]
      );

      logger.info({
        companyId: request.user.companyId,
        userId: request.user.userId,
        biometricsRequired
      }, 'Biometrics settings updated');

      return reply.code(200).send({
        success: true,
        data: result.rows[0],
        message: 'Biometrics settings updated successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to update biometrics settings');
      return reply.code(500).send({
        success: false,
        message: 'Failed to update biometrics settings'
      });
    }
  });

  // Update office location
  fastify.patch('/office-location', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check role
      if (request.user.role !== 'owner' && request.user.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can update office location'
        });
      }
      const {
        latitude,
        longitude,
        address,
        placeId
      } = request.body as {
        latitude: number;
        longitude: number;
        address?: string;
        placeId?: string;
      };

      if (!latitude || !longitude) {
        return reply.code(400).send({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      const result = await query(
        `UPDATE companies 
         SET office_latitude = $1,
             office_longitude = $2,
             formatted_address = $3,
             place_id = $4,
             geocoded_at = NOW(),
             updated_at = NOW()
         WHERE id = $5
         RETURNING office_latitude, office_longitude, formatted_address, place_id`,
        [latitude, longitude, address, placeId, request.user.companyId]
      );

      logger.info({
        companyId: request.user.companyId,
        userId: request.user.userId,
        latitude,
        longitude
      }, 'Office location updated');

      return reply.code(200).send({
        success: true,
        data: result.rows[0],
        message: 'Office location updated successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to update office location');
      return reply.code(500).send({
        success: false,
        message: 'Failed to update office location'
      });
    }
  });

  // Update display preferences
  fastify.patch('/display', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check role
      if (request.user.role !== 'owner' && request.user.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can update display preferences'
        });
      }
      const {
        timeFormat,
        dateFormat,
        currency,
        language
      } = request.body as {
        timeFormat?: '12h' | '24h';
        dateFormat?: string;
        currency?: string;
        language?: string;
      };

      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (timeFormat) {
        params.push(timeFormat);
        updates.push(`time_format = $${paramIndex++}`);
      }

      if (dateFormat) {
        params.push(dateFormat);
        updates.push(`date_format = $${paramIndex++}`);
      }

      if (currency) {
        params.push(currency);
        updates.push(`currency = $${paramIndex++}`);
      }

      if (language) {
        params.push(language);
        updates.push(`language = $${paramIndex++}`);
      }

      if (updates.length === 0) {
        return reply.code(400).send({
          success: false,
          message: 'No updates provided'
        });
      }

      params.push(request.user.companyId);
      updates.push('updated_at = NOW()');

      const result = await query(
        `UPDATE companies 
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING time_format, date_format, currency, language`,
        params
      );

      logger.info({
        companyId: request.user.companyId,
        userId: request.user.userId,
        updates: Object.keys(request.body as object)
      }, 'Display preferences updated');

      return reply.code(200).send({
        success: true,
        data: result.rows[0],
        message: 'Display preferences updated successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to update display preferences');
      return reply.code(500).send({
        success: false,
        message: 'Failed to update display preferences'
      });
    }
  });

  // Update break settings
  fastify.patch('/breaks', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check role
      if (request.user.role !== 'owner' && request.user.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can update break settings'
        });
      }
      const { breaksEnabled, maxBreakDurationMinutes } = request.body as {
        breaksEnabled?: boolean;
        maxBreakDurationMinutes?: number;
      };

      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (typeof breaksEnabled === 'boolean') {
        params.push(breaksEnabled);
        updates.push(`breaks_enabled = $${paramIndex++}`);
      }

      if (maxBreakDurationMinutes) {
        params.push(maxBreakDurationMinutes);
        updates.push(`max_break_duration_minutes = $${paramIndex++}`);
      }

      if (updates.length === 0) {
        return reply.code(400).send({
          success: false,
          message: 'No updates provided'
        });
      }

      params.push(request.user.companyId);
      updates.push('updated_at = NOW()');

      const result = await query(
        `UPDATE companies 
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING breaks_enabled, max_break_duration_minutes`,
        params
      );

      logger.info({
        companyId: request.user.companyId,
        userId: request.user.userId,
        updates: Object.keys(request.body as object)
      }, 'Break settings updated');

      return reply.code(200).send({
        success: true,
        data: result.rows[0],
        message: 'Break settings updated successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to update break settings');
      return reply.code(500).send({
        success: false,
        message: 'Failed to update break settings'
      });
    }
  });
}
