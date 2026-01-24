import { FastifyInstance } from 'fastify';
import { enhancedAttendanceService } from '../services/EnhancedAttendanceService';
import { userService } from '../services/UserService';
import { query } from '../config/database';
import { logger } from '../utils/logger';

export async function attendanceRoutes(fastify: FastifyInstance) {
  // Admin: Get company attendance (filtered list)
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check role
      if (request.user.role !== 'owner' && request.user.role !== 'admin' && request.user.role !== 'department_head') {
        return reply.code(403).send({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const {
        startDate,
        endDate,
        department,
        search,
        status,
        page = 1,
        limit = 10
      } = request.query as any;

      const offset = (page - 1) * limit;

      const result = await enhancedAttendanceService.getCompanyAttendance(
        request.user.companyId,
        {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          department,
          search,
          status,
          limit,
          offset
        }
      );

      return reply.code(200).send({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(result.total / Number(limit))
        },
        message: 'Attendance records retrieved successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to get company attendance');
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve attendance records'
      });
    }
  });

  // Admin: Export attendance (CSV)
  fastify.get('/export', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check role
      if (request.user.role !== 'owner' && request.user.role !== 'admin' && request.user.role !== 'department_head') {
        return reply.code(403).send({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const {
        startDate,
        endDate,
        department,
        search,
        status
      } = request.query as any;

      // Get all matching records (no limit)
      const result = await enhancedAttendanceService.getCompanyAttendance(
        request.user.companyId,
        {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          department,
          search,
          status
          // No limit for export
        }
      );

      // Generate CSV
      const headers = ['Employee Name', 'Email', 'Department', 'Date', 'Clock In', 'Clock Out', 'Status', 'Location'];
      const rows = result.data.map(record => {
        const date = new Date(record.clock_in_time).toLocaleDateString();
        const clockIn = new Date(record.clock_in_time).toLocaleTimeString();
        const clockOut = record.clock_out_time ? new Date(record.clock_out_time).toLocaleTimeString() : '--:--';
        const location = record.is_within_geofence ? 'Onsite' : (record.clock_in_location ? 'Remote' : 'Unknown');

        return [
          `"${record.first_name} ${record.last_name}"`,
          `"${record.email}"`,
          `"${record.department || ''}"`,
          `"${date}"`,
          `"${clockIn}"`,
          `"${clockOut}"`,
          `"${record.status}"`,
          `"${location}"`
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', `attachment; filename="attendance_export_${new Date().toISOString().split('T')[0]}.csv"`);
      return reply.send(csvContent);

    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to export attendance');
      return reply.code(500).send({
        success: false,
        message: 'Failed to export attendance records'
      });
    }
  });

  // Check in
  fastify.post('/check-in', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { location, biometricsProof } = request.body as {
        location?: {
          latitude: number;
          longitude: number;
          address?: string;
        };
        biometricsProof?: string;
      };

      // Check if location verification is required
      const requiresVerification = await userService.isLocationVerificationRequired(request.user.userId, request.user.companyId);
      if (requiresVerification && !location) {
        return reply.code(400).send({
          success: false,
          message: 'Location verification required. Please provide current location.',
          requiresLocationVerification: true
        });
      }

      if (requiresVerification && location) {
        await userService.updateLocationVerification(request.user.userId);
      }

      const attendance = await enhancedAttendanceService.checkIn({
        userId: request.user.userId,
        companyId: request.user.companyId,
        location,
        method: 'manual',
        biometricsProof
      });

      return reply.code(200).send({
        success: true,
        data: attendance,
        message: attendance.isLateArrival
          ? `Checked in successfully. You are ${attendance.minutesLate} minutes late.`
          : 'Checked in successfully'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Check-in failed');
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to check in'
      });
    }
  });

  // Verify Location
  fastify.post('/verify-location', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { location } = request.body as {
        location: {
          latitude: number;
          longitude: number;
        }
      };

      if (!location) {
        return reply.code(400).send({
          success: false,
          message: 'Location is required'
        });
      }

      // Here you might want to validate if the location is "reasonable" or matches expected patterns
      // For now, we just trust the user provided location and update the timestamp
      await userService.updateLocationVerification(request.user.userId);

      return reply.code(200).send({
        success: true,
        message: 'Location verified successfully'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Location verification failed');
      return reply.code(500).send({
        success: false,
        message: 'Failed to verify location'
      });
    }
  });

  // Check out
  fastify.post('/check-out', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { attendanceId, location, departureReason, biometricsProof } = request.body as {
        attendanceId: string;
        location?: {
          latitude: number;
          longitude: number;
          address?: string;
        };
        departureReason?: string;
        biometricsProof?: string;
      };

      if (!attendanceId) {
        return reply.code(400).send({
          success: false,
          message: 'Attendance ID is required'
        });
      }

      const attendance = await enhancedAttendanceService.checkOut({
        userId: request.user.userId,
        companyId: request.user.companyId,
        attendanceId,
        location,
        method: 'manual',
        departureReason,
        biometricsProof
      });

      return reply.code(200).send({
        success: true,
        data: attendance,
        message: attendance.isEarlyDeparture
          ? `Checked out successfully. You left ${attendance.minutesEarly} minutes early. Admin has been notified.`
          : 'Checked out successfully'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Check-out failed');
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to check out'
      });
    }
  });

  // Start Break
  fastify.post('/break/start', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const attendanceRecord = await enhancedAttendanceService.startBreak(
        request.user.userId,
        request.user.companyId
      );

      return reply.code(200).send({
        success: true,
        data: attendanceRecord,
        message: 'Break started successfully'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Failed to start break');
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to start break'
      });
    }
  });

  // End Break
  fastify.post('/break/end', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const attendanceRecord = await enhancedAttendanceService.endBreak(
        request.user.userId,
        request.user.companyId
      );

      return reply.code(200).send({
        success: true,
        data: attendanceRecord,
        message: 'Break ended successfully'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Failed to end break');
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to end break'
      });
    }
  });

  // Get attendance status (matches frontend expectation)
  fastify.get('/status', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const attendance = await enhancedAttendanceService.getCurrentAttendance(
        request.user.userId,
        request.user.companyId
      );

      const requiresLocationVerification = await userService.isLocationVerificationRequired(request.user.userId, request.user.companyId);

      const data = {
        isClockedIn: !!attendance && !attendance.clockOutTime,
        status: attendance?.status || 'absent',
        clockInTime: attendance?.clockInTime || null,
        clockOutTime: attendance?.clockOutTime || null,
        totalHoursToday: 0, // Calculate if needed or fetch from DB
        isWithinGeofence: attendance?.isWithinGeofence || false, // This is historical, might want current
        distanceFromOffice: attendance?.clockInDistanceMeters || 0,
        requiresLocationVerification,
        breaks: attendance?.breaks || []
      };

      return reply.code(200).send({
        success: true,
        data: data,
        message: 'Attendance status retrieved'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Failed to get attendance status');
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve attendance status'
      });
    }
  });

  // Get current attendance status
  fastify.get('/current', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const attendance = await enhancedAttendanceService.getCurrentAttendance(
        request.user.userId,
        request.user.companyId
      );

      return reply.code(200).send({
        success: true,
        data: attendance,
        message: attendance ? 'Current attendance retrieved' : 'No active attendance today'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Failed to get current attendance');
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve attendance status'
      });
    }
  });

  // Check if early departure (for UI to prompt for reason)
  fastify.post('/check-early-departure', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const result = await query(
        'SELECT * FROM check_early_departure($1, NOW())',
        [request.user.companyId]
      );

      const earlyCheck = result.rows[0];

      return reply.code(200).send({
        success: true,
        data: {
          isEarly: earlyCheck.is_early,
          minutesEarly: earlyCheck.minutes_early,
          expectedEndTime: earlyCheck.expected_end_time,
          requiresReason: earlyCheck.is_early
        },
        message: earlyCheck.is_early
          ? `You are leaving ${earlyCheck.minutes_early} minutes early. Please provide a reason.`
          : 'You can check out normally'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Failed to check early departure');
      return reply.code(500).send({
        success: false,
        message: 'Failed to check departure time'
      });
    }
  });

  // Get attendance history
  fastify.get('/history', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { startDate, endDate, limit = 30 } = request.query as {
        startDate?: string;
        endDate?: string;
        limit?: number;
      };

      let queryText = `
        SELECT ar.*,
        (SELECT SUM(COALESCE(duration_minutes, EXTRACT(EPOCH FROM (NOW() - start_time))/60)) FROM attendance_breaks WHERE attendance_record_id = ar.id) as total_break_minutes
        FROM attendance_records ar
        WHERE ar.user_id = $1
      `;
      const params: any[] = [request.user.userId];

      if (startDate) {
        params.push(startDate);
        queryText += ` AND clock_in_time >= $${params.length}`;
      }

      if (endDate) {
        params.push(endDate);
        queryText += ` AND clock_in_time <= $${params.length}`;
      }

      queryText += ` ORDER BY clock_in_time DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await query(queryText, params);

      return reply.code(200).send({
        success: true,
        data: result.rows,
        message: 'Attendance history retrieved successfully'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Failed to get attendance history');
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve attendance history'
      });
    }
  });

  // Admin: Get company attendance for date
  fastify.get('/company/:date?', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check role
      if (request.user.role !== 'owner' && request.user.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can view company attendance'
        });
      }

      const { date } = request.params as { date?: string };
      const targetDate = date || new Date().toISOString().split('T')[0];

      const result = await query(
        `SELECT 
          ar.*,
          u.first_name,
          u.last_name,
          u.email,
          u.employee_id,
          u.position
        FROM attendance_records ar
        JOIN users u ON ar.user_id = u.id
        WHERE ar.company_id = $1
          AND ar.clock_in_time::DATE = $2::DATE
        ORDER BY ar.clock_in_time DESC`,
        [request.user.companyId, targetDate]
      );

      return reply.code(200).send({
        success: true,
        data: result.rows,
        message: 'Company attendance retrieved successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to get company attendance');
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve company attendance'
      });
    }
  });

  // Admin: Get early departures
  fastify.get('/early-departures', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check role
      if (request.user.role !== 'owner' && request.user.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can view early departures'
        });
      }

      const { startDate, endDate } = request.query as {
        startDate?: string;
        endDate?: string;
      };

      let queryText = `
        SELECT 
          ar.*,
          u.first_name,
          u.last_name,
          u.email,
          u.employee_id
        FROM attendance_records ar
        JOIN users u ON ar.user_id = u.id
        WHERE ar.company_id = $1
          AND ar.is_early_departure = true
      `;
      const params: any[] = [request.user.companyId];

      if (startDate) {
        params.push(startDate);
        queryText += ` AND ar.clock_out_time >= $${params.length}`;
      }

      if (endDate) {
        params.push(endDate);
        queryText += ` AND ar.clock_out_time <= $${params.length}`;
      }

      queryText += ` ORDER BY ar.clock_out_time DESC`;

      const result = await query(queryText, params);

      return reply.code(200).send({
        success: true,
        data: result.rows,
        message: 'Early departures retrieved successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to get early departures');
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve early departures'
      });
    }
  });

  // Admin: Get late arrivals
  fastify.get('/late-arrivals', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check role
      if (request.user.role !== 'owner' && request.user.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can view late arrivals'
        });
      }

      const { startDate, endDate } = request.query as {
        startDate?: string;
        endDate?: string;
      };

      let queryText = `
        SELECT 
          ar.*,
          u.first_name,
          u.last_name,
          u.email,
          u.employee_id
        FROM attendance_records ar
        JOIN users u ON ar.user_id = u.id
        WHERE ar.company_id = $1
          AND ar.is_late_arrival = true
      `;
      const params: any[] = [request.user.companyId];

      if (startDate) {
        params.push(startDate);
        queryText += ` AND ar.clock_in_time >= $${params.length}`;
      }

      if (endDate) {
        params.push(endDate);
        queryText += ` AND ar.clock_in_time <= $${params.length}`;
      }

      queryText += ` ORDER BY ar.clock_in_time DESC`;

      const result = await query(queryText, params);

      return reply.code(200).send({
        success: true,
        data: result.rows,
        message: 'Late arrivals retrieved successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to get late arrivals');
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve late arrivals'
      });
    }
  });
}
