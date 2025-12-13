import { FastifyInstance } from 'fastify';
import { query } from '../config/database';
import { logger } from '../utils/logger';

export default async function companySettingsRoutes(fastify: FastifyInstance) {
  // Get company settings
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check role - Allow owners, admins, and managers to view settings
      if (!['owner', 'admin', 'manager', 'department_manager'].includes(request.user.role)) {
        return reply.code(403).send({
          success: false,
          message: 'Only owners, admins, and managers can view company settings'
        });
      }
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
          time_format,
          date_format,
          currency,
          language,
          COALESCE((settings->>'biometricEnabled')::boolean, false) as biometric_enabled
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
      if (!['owner', 'admin', 'manager', 'department_manager'].includes(request.user.role)) {
        return reply.code(403).send({
          success: false,
          message: 'Only owners, admins, and managers can update work schedule'
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
      if (!['owner', 'admin', 'manager', 'department_manager'].includes(request.user.role)) {
        return reply.code(403).send({
          success: false,
          message: 'Only owners, admins, and managers can update auto-attendance settings'
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
      if (!['owner', 'admin', 'manager', 'department_manager'].includes(request.user.role)) {
        return reply.code(403).send({
          success: false,
          message: 'Only owners, admins, and managers can update notification settings'
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

  // Update office location
  fastify.patch('/office-location', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check role
      if (!['owner', 'admin', 'manager', 'department_manager'].includes(request.user.role)) {
        return reply.code(403).send({
          success: false,
          message: 'Only owners, admins, and managers can update office location'
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

  // Update biometric settings
  fastify.patch('/biometric', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check role
      if (!['owner', 'admin', 'manager', 'department_manager'].includes(request.user.role)) {
        return reply.code(403).send({
          success: false,
          message: 'Only owners, admins, and managers can update biometric settings'
        });
      }

      const { biometricEnabled } = request.body as {
        biometricEnabled: boolean;
      };

      // Update company settings to store biometric preference
      const result = await query(
        `UPDATE companies 
         SET settings = COALESCE(settings, '{}') || $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING settings`,
        [JSON.stringify({ biometricEnabled }), request.user.companyId]
      );

      logger.info({
        companyId: request.user.companyId,
        userId: request.user.userId,
        biometricEnabled
      }, 'Biometric settings updated');

      return reply.code(200).send({
        success: true,
        data: { biometricEnabled },
        message: 'Biometric settings updated successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to update biometric settings');
      return reply.code(500).send({
        success: false,
        message: 'Failed to update biometric settings'
      });
    }
  });

  // Update lateness policy
  fastify.patch('/lateness-policy', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check role
      if (!['owner', 'admin', 'manager', 'department_manager'].includes(request.user.role)) {
        return reply.code(403).send({
          success: false,
          message: 'Only owners, admins, and managers can update lateness policy'
        });
      }

      const {
        gracePeriodMinutes,
        lateArrivalEnabled
      } = request.body as {
        gracePeriodMinutes?: number;
        lateArrivalEnabled?: boolean;
      };

      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (typeof gracePeriodMinutes === 'number') {
        params.push(gracePeriodMinutes);
        updates.push(`grace_period_minutes = $${paramIndex++}`);
      }

      if (typeof lateArrivalEnabled === 'boolean') {
        params.push(JSON.stringify({ lateArrivalEnabled }));
        updates.push(`settings = COALESCE(settings, '{}') || $${paramIndex++}`);
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
         RETURNING grace_period_minutes, settings`,
        params
      );

      logger.info({
        companyId: request.user.companyId,
        userId: request.user.userId,
        updates: Object.keys(request.body as object)
      }, 'Lateness policy updated');

      return reply.code(200).send({
        success: true,
        data: result.rows[0],
        message: 'Lateness policy updated successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to update lateness policy');
      return reply.code(500).send({
        success: false,
        message: 'Failed to update lateness policy'
      });
    }
  });

  // Update location settings
  fastify.patch('/location', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check role
      if (!['owner', 'admin', 'manager', 'department_manager'].includes(request.user.role)) {
        return reply.code(403).send({
          success: false,
          message: 'Only owners, admins, and managers can update location settings'
        });
      }

      const {
        officeAddress,
        officeLatitude,
        officeLongitude,
        geofenceRadiusMeters,
        locationTitle
      } = request.body as {
        officeAddress?: string;
        officeLatitude?: number;
        officeLongitude?: number;
        geofenceRadiusMeters?: number;
        locationTitle?: string;
      };

      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (officeAddress) {
        params.push(officeAddress);
        updates.push(`formatted_address = $${paramIndex++}`);
      }

      if (typeof officeLatitude === 'number') {
        params.push(officeLatitude);
        updates.push(`office_latitude = $${paramIndex++}`);
      }

      if (typeof officeLongitude === 'number') {
        params.push(officeLongitude);
        updates.push(`office_longitude = $${paramIndex++}`);
      }

      if (typeof geofenceRadiusMeters === 'number') {
        params.push(geofenceRadiusMeters);
        updates.push(`geofence_radius_meters = $${paramIndex++}`);
      }

      if (locationTitle) {
        params.push(JSON.stringify({ locationTitle }));
        updates.push(`settings = COALESCE(settings, '{}') || $${paramIndex++}`);
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
         RETURNING formatted_address, office_latitude, office_longitude, geofence_radius_meters, settings`,
        params
      );

      logger.info({
        companyId: request.user.companyId,
        userId: request.user.userId,
        updates: Object.keys(request.body as object)
      }, 'Location settings updated');

      return reply.code(200).send({
        success: true,
        data: result.rows[0],
        message: 'Location settings updated successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to update location settings');
      return reply.code(500).send({
        success: false,
        message: 'Failed to update location settings'
      });
    }
  });

  // Update display preferences
  fastify.patch('/display', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check role
      if (!['owner', 'admin', 'manager', 'department_manager'].includes(request.user.role)) {
        return reply.code(403).send({
          success: false,
          message: 'Only owners, admins, and managers can update display preferences'
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

  // Generic settings update endpoint
  fastify.put('/update', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check role - Allow owners, admins, and managers to update settings
      if (!['owner', 'admin', 'manager', 'department_manager'].includes(request.user.role)) {
        return reply.code(403).send({
          success: false,
          message: 'Only owners, admins, and managers can update settings'
        });
      }

      const { type, data } = request.body as {
        type: string;
        data: any;
      };

      let result;

      switch (type) {
        case 'company-location':
        case 'location':
          result = await query(
            `UPDATE companies 
             SET formatted_address = $1,
                 office_latitude = $2,
                 office_longitude = $3,
                 geofence_radius_meters = $4,
                 settings = COALESCE(settings, '{}') || $5,
                 updated_at = NOW()
             WHERE id = $6
             RETURNING formatted_address, office_latitude, office_longitude, geofence_radius_meters, settings`,
            [
              data.officeAddress,
              data.officeLatitude,
              data.officeLongitude,
              data.geofenceRadiusMeters || 100,
              JSON.stringify({ locationTitle: data.locationTitle }),
              request.user.companyId
            ]
          );
          break;

        case 'employee-hours':
        case 'work-schedule':
          result = await query(
            `UPDATE companies 
             SET work_start_time = $1,
                 work_end_time = $2,
                 working_days = $3,
                 updated_at = NOW()
             WHERE id = $4
             RETURNING work_start_time, work_end_time, working_days`,
            [
              data.workStartTime,
              data.workEndTime,
              JSON.stringify(data.workingDays || { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false }),
              request.user.companyId
            ]
          );
          break;

        case 'lateness-policy':
          result = await query(
            `UPDATE companies 
             SET grace_period_minutes = $1,
                 settings = COALESCE(settings, '{}') || $2,
                 updated_at = NOW()
             WHERE id = $3
             RETURNING grace_period_minutes, settings`,
            [
              data.gracePeriodMinutes,
              JSON.stringify({ lateArrivalEnabled: data.lateArrivalEnabled }),
              request.user.companyId
            ]
          );
          break;

        case 'notifications':
        case 'automate-alerts':
          result = await query(
            `UPDATE companies 
             SET settings = COALESCE(settings, '{}') || $1,
                 updated_at = NOW()
             WHERE id = $2
             RETURNING settings`,
            [
              JSON.stringify({
                notifyDelayedClockIn: data.notifyDelayedClockIn,
                notifyNearOffice: data.notifyNearOffice
              }),
              request.user.companyId
            ]
          );
          break;

        case 'biometric':
          result = await query(
            `UPDATE companies 
             SET settings = COALESCE(settings, '{}') || $1,
                 updated_at = NOW()
             WHERE id = $2
             RETURNING settings`,
            [
              JSON.stringify({
                biometricEnabled: data.biometricEnabled,
                faceIdEnabled: data.faceIdEnabled,
                fingerprintEnabled: data.fingerprintEnabled
              }),
              request.user.companyId
            ]
          );
          break;

        default:
          return reply.code(400).send({
            success: false,
            message: `Unknown settings type: ${type}`
          });
      }

      logger.info({
        companyId: request.user.companyId,
        userId: request.user.userId,
        type,
        data
      }, 'Settings updated');

      return reply.code(200).send({
        success: true,
        data: result.rows[0],
        message: 'Settings updated successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to update settings');
      return reply.code(500).send({
        success: false,
        message: 'Failed to update settings'
      });
    }
  });

  // Mark setup step as completed
  fastify.post('/setup-step', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check role
      if (!['owner', 'admin', 'manager', 'department_manager'].includes(request.user.role)) {
        return reply.code(403).send({
          success: false,
          message: 'Only owners, admins, and managers can mark setup steps as completed'
        });
      }

      const { stepId, completed } = request.body as {
        stepId: string;
        completed: boolean;
      };

      // Get current setup status
      const currentResult = await query(
        `SELECT settings FROM companies WHERE id = $1`,
        [request.user.companyId]
      );

      const currentSettings = currentResult.rows[0]?.settings || {};
      const setupStatus = currentSettings.attendanceSetupStatus || {};
      
      // Update the specific step
      setupStatus[stepId] = completed;

      // Update company settings
      const result = await query(
        `UPDATE companies 
         SET settings = COALESCE(settings, '{}') || $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING settings`,
        [
          JSON.stringify({ attendanceSetupStatus: setupStatus }),
          request.user.companyId
        ]
      );

      logger.info({
        companyId: request.user.companyId,
        userId: request.user.userId,
        stepId,
        completed
      }, 'Setup step status updated');

      return reply.code(200).send({
        success: true,
        data: { stepId, completed, setupStatus },
        message: 'Setup step updated successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to update setup step');
      return reply.code(500).send({
        success: false,
        message: 'Failed to update setup step'
      });
    }
  });

  // Get settings sync updates
  fastify.get('/sync', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { since } = request.query as { since?: string };

      // For now, return empty updates (this would be implemented with real-time sync)
      // In a production app, you'd track setting changes with timestamps
      return reply.code(200).send({
        success: true,
        updates: [],
        message: 'Settings sync retrieved successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to get settings sync');
      return reply.code(500).send({
        success: false,
        message: 'Failed to get settings sync'
      });
    }
  });

  // Update attendance setup status
  fastify.patch('/attendance-setup-status', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check role
      if (!['owner', 'admin', 'manager', 'department_manager'].includes(request.user.role)) {
        return reply.code(403).send({
          success: false,
          message: 'Only owners, admins, and managers can update setup status'
        });
      }

      const setupStatus = request.body as Record<string, boolean>;

      // Update company settings to store setup status
      const result = await query(
        `UPDATE companies 
         SET settings = COALESCE(settings, '{}') || $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING settings`,
        [JSON.stringify({ attendanceSetupStatus: setupStatus }), request.user.companyId]
      );

      logger.info({
        companyId: request.user.companyId,
        userId: request.user.userId,
        setupStatus
      }, 'Attendance setup status updated');

      return reply.code(200).send({
        success: true,
        data: { setupStatus },
        message: 'Setup status updated successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to update setup status');
      return reply.code(500).send({
        success: false,
        message: 'Failed to update setup status'
      });
    }
  });

  // Mark attendance setup as completed
  fastify.patch('/attendance-setup-completed', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check role
      if (!['owner', 'admin', 'manager', 'department_manager'].includes(request.user.role)) {
        return reply.code(403).send({
          success: false,
          message: 'Only owners, admins, and managers can complete setup'
        });
      }

      const { completed } = request.body as { completed: boolean };

      // Update company settings to mark setup as completed
      const result = await query(
        `UPDATE companies 
         SET settings = COALESCE(settings, '{}') || $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING settings`,
        [JSON.stringify({ attendanceSetupCompleted: completed }), request.user.companyId]
      );

      logger.info({
        companyId: request.user.companyId,
        userId: request.user.userId,
        completed
      }, 'Attendance setup completion status updated');

      return reply.code(200).send({
        success: true,
        data: { completed },
        message: 'Setup completion status updated successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to update setup completion status');
      return reply.code(500).send({
        success: false,
        message: 'Failed to update setup completion status'
      });
    }
  });
}
