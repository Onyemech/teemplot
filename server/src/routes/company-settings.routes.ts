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
          max_break_duration_minutes,
          allow_remote_clockin,
          allow_remote_clockin_on_non_working_days
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
        requireGeofenceForCheckin,
        allowRemoteClockin,
        allowRemoteClockinOnNonWorkingDays
      } = request.body as {
        autoCheckinEnabled?: boolean;
        autoCheckoutEnabled?: boolean;
        geofenceRadiusMeters?: number;
        requireGeofenceForCheckin?: boolean;
        allowRemoteClockin?: boolean;
        allowRemoteClockinOnNonWorkingDays?: boolean;
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

      if (typeof allowRemoteClockin === 'boolean') {
        params.push(allowRemoteClockin);
        updates.push(`allow_remote_clockin = $${paramIndex++}`);
      }

      if (typeof allowRemoteClockinOnNonWorkingDays === 'boolean') {
        params.push(allowRemoteClockinOnNonWorkingDays);
        updates.push(`allow_remote_clockin_on_non_working_days = $${paramIndex++}`);
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
                 geofence_radius_meters, require_geofence_for_clockin, allow_remote_clockin, allow_remote_clockin_on_non_working_days`,
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
  // GET /location - simplified location settings for the specific component
  fastify.get('/location', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const result = await query(
        `SELECT 
          id,
          formatted_address as address,
          office_latitude as latitude,
          office_longitude as longitude,
          geofence_radius_meters,
          geocoded_at as last_updated_at,
          NOW() as current_time
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

      const company = result.rows[0];

      // Calculate update restriction (7 days)
      const lastUpdated = company.last_updated_at ? new Date(company.last_updated_at) : null;
      const now = new Date(company.current_time);
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      let canUpdate = true;
      let nextUpdateAvailableAt = null;

      if (lastUpdated) {
        const timeSinceUpdate = now.getTime() - lastUpdated.getTime();
        if (timeSinceUpdate < sevenDaysMs) {
          canUpdate = false;
          nextUpdateAvailableAt = new Date(lastUpdated.getTime() + sevenDaysMs).toISOString();
        }
      }

      return reply.code(200).send({
        success: true,
        data: {
          id: company.id,
          address: company.address,
          latitude: company.latitude,
          longitude: company.longitude,
          geofence_radius_meters: company.geofence_radius_meters,
          last_updated_at: company.last_updated_at,
          can_update: canUpdate,
          next_update_available_at: nextUpdateAvailableAt
        },
        message: 'Location settings retrieved successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to get location settings');
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve location settings'
      });
    }
  });

  // PATCH /location - Update location settings (combined)
  fastify.patch('/location', {
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
        address,
        latitude,
        longitude,
        geofenceRadius
      } = request.body as {
        address: string;
        latitude: number;
        longitude: number;
        geofenceRadius: number;
      };

      if (!latitude || !longitude) {
        return reply.code(400).send({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      // Check time restriction again
      const checkResult = await query(
        `SELECT geocoded_at, NOW() as current_time FROM companies WHERE id = $1`,
        [request.user.companyId]
      );

      if (checkResult.rows.length > 0) {
        const company = checkResult.rows[0];
        const lastUpdated = company.geocoded_at ? new Date(company.geocoded_at) : null;
        if (lastUpdated) {
          const now = new Date(company.current_time);
          const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
          if (now.getTime() - lastUpdated.getTime() < sevenDaysMs) {
            // Restriction logic here
          }
        }
      }

      const result = await query(
        `UPDATE companies 
         SET office_latitude = $1,
         office_longitude = $2,
         formatted_address = $3,
         geofence_radius_meters = $4,
         geocoded_at = NOW(),
         updated_at = NOW()
         WHERE id = $5
         RETURNING 
           id,
           formatted_address as address,
           office_latitude as latitude,
           office_longitude as longitude,
           geofence_radius_meters,
           geocoded_at as last_updated_at`,
        [latitude, longitude, address, geofenceRadius || 100, request.user.companyId]
      );

      return reply.code(200).send({
        success: true,
        data: {
          ...result.rows[0],
          can_update: false, // Immediately restricted after update
          next_update_available_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        message: 'Company location updated successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to update location');
      return reply.code(500).send({
        success: false,
        message: 'Failed to update location'
      });
    }
  });

  // Task policy: require attachments for task completion
  fastify.get('/tasks-policy', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const companyId = request.user.companyId;
      // Ensure settings row exists
      await query(
        `INSERT INTO company_settings (company_id)
         VALUES ($1)
         ON CONFLICT (company_id) DO NOTHING`,
        [companyId]
      );
      const result = await query(
        `SELECT require_attachments_for_tasks
         FROM company_settings
         WHERE company_id = $1`,
        [companyId]
      );
      return reply.code(200).send({
        success: true,
        data: { requireAttachmentsForTasks: !!result.rows[0]?.require_attachments_for_tasks },
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to get tasks policy');
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve tasks policy'
      });
    }
  });

  fastify.patch('/tasks-policy', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      if (request.user.role !== 'owner' && request.user.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can update task policy'
        });
      }
      const { requireAttachmentsForTasks } = request.body as { requireAttachmentsForTasks: boolean };
      if (typeof requireAttachmentsForTasks !== 'boolean') {
        return reply.code(400).send({
          success: false,
          message: 'requireAttachmentsForTasks must be a boolean'
        });
      }
      const companyId = request.user.companyId;
      await query(
        `INSERT INTO company_settings (company_id)
         VALUES ($1)
         ON CONFLICT (company_id) DO NOTHING`,
        [companyId]
      );
      const result = await query(
        `UPDATE company_settings
         SET require_attachments_for_tasks = $1, updated_at = NOW()
         WHERE company_id = $2
         RETURNING require_attachments_for_tasks`,
        [requireAttachmentsForTasks, companyId]
      );
      logger.info({
        companyId,
        userId: request.user.userId,
        requireAttachmentsForTasks
      }, 'Task policy updated');
      return reply.code(200).send({
        success: true,
        data: { requireAttachmentsForTasks: result.rows[0]?.require_attachments_for_tasks },
        message: 'Task policy updated successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to update tasks policy');
      return reply.code(500).send({
        success: false,
        message: 'Failed to update tasks policy'
      });
    }
  });

  // Leave policy: annual leave days and custom leave types
  fastify.get('/leave-policy', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const companyId = request.user.companyId;
      // Ensure settings row exists
      await query(
        `INSERT INTO company_settings (company_id)
         VALUES ($1)
         ON CONFLICT (company_id) DO NOTHING`,
        [companyId]
      );
      const result = await query(
        `SELECT annual_leave_days, leave_types
         FROM company_settings
         WHERE company_id = $1`,
        [companyId]
      );
      
      const settings = result.rows[0];
      return reply.code(200).send({
        success: true,
        data: {
          annualLeaveDays: settings?.annual_leave_days ?? 20,
          leaveTypes: settings?.leave_types ?? []
        },
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to get leave policy');
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve leave policy'
      });
    }
  });

  fastify.patch('/leave-policy', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      if (request.user.role !== 'owner' && request.user.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can update leave policy'
        });
      }
      const { annualLeaveDays, leaveTypes, updateExistingEmployees } = request.body as { 
        annualLeaveDays?: number;
        leaveTypes?: any[];
        updateExistingEmployees?: boolean;
      };

      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (typeof annualLeaveDays === 'number') {
        if (annualLeaveDays < 0) {
          return reply.code(400).send({
            success: false,
            message: 'annualLeaveDays must be non-negative'
          });
        }
        params.push(annualLeaveDays);
        updates.push(`annual_leave_days = $${paramIndex++}`);
      }

      if (Array.isArray(leaveTypes)) {
        params.push(JSON.stringify(leaveTypes));
        updates.push(`leave_types = $${paramIndex++}`);
      }

      if (updates.length === 0) {
        return reply.code(400).send({
          success: false,
          message: 'No updates provided'
        });
      }

      const companyId = request.user.companyId;
      await query(
        `INSERT INTO company_settings (company_id)
         VALUES ($1)
         ON CONFLICT (company_id) DO NOTHING`,
        [companyId]
      );

      params.push(companyId);
      updates.push('updated_at = NOW()');

      const result = await query(
        `UPDATE company_settings
         SET ${updates.join(', ')}
         WHERE company_id = $${paramIndex}
         RETURNING annual_leave_days, leave_types`,
        params
      );

      // If requested, update all existing employees' leave balance
      if (updateExistingEmployees && annualLeaveDays !== undefined) {
        await query(
          `UPDATE users
           SET annual_leave_balance = $1, updated_at = NOW()
           WHERE company_id = $2 AND deleted_at IS NULL`,
          [annualLeaveDays, companyId]
        );
        logger.info({
          companyId,
          userId: request.user.userId,
          newBalance: annualLeaveDays
        }, 'Updated all employees leave balance');
      }

      logger.info({
        companyId,
        userId: request.user.userId,
        updates: Object.keys(request.body as object)
      }, 'Leave policy updated');

      return reply.code(200).send({
        success: true,
        data: {
          annualLeaveDays: result.rows[0]?.annual_leave_days,
          leaveTypes: result.rows[0]?.leave_types
        },
        message: 'Leave policy updated successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to update leave policy');
      return reply.code(500).send({
        success: false,
        message: 'Failed to update leave policy'
      });
    }
  });
}
