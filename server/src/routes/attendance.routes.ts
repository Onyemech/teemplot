import { FastifyInstance } from 'fastify';
import { enhancedAttendanceService } from '../services/EnhancedAttendanceService';
import { query } from '../config/database';
import { logger } from '../utils/logger';

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

export default async function attendanceRoutes(fastify: FastifyInstance) {
  // Check location and geofence
  fastify.post('/check-location', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { latitude, longitude } = request.body as {
        latitude: number;
        longitude: number;
      };

      // Get company settings for geofence
      const companyResult = await query(
        'SELECT office_latitude, office_longitude, geofence_radius_meters, formatted_address FROM companies WHERE id = $1',
        [request.user.companyId]
      );

      if (companyResult.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'Company not found'
        });
      }

      const company = companyResult.rows[0];
      
      // Calculate distance from office
      const distance = calculateDistance(
        latitude,
        longitude,
        company.office_latitude,
        company.office_longitude
      );

      const isWithinGeofence = distance <= company.geofence_radius_meters;

      return reply.code(200).send({
        success: true,
        data: {
          isWithinGeofence,
          distanceFromOffice: Math.round(distance),
          officeName: 'Office Location',
          officeAddress: company.formatted_address
        }
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Location check failed');
      return reply.code(500).send({
        success: false,
        message: 'Failed to check location'
      });
    }
  });

  // Clock in (alias for check-in)
  fastify.post('/clock-in', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { location } = request.body as {
        location?: {
          latitude: number;
          longitude: number;
          address?: string;
        };
      };

      const attendance = await enhancedAttendanceService.checkIn({
        userId: request.user.userId,
        companyId: request.user.companyId,
        location,
        method: 'manual'
      });

      return reply.code(200).send({
        success: true,
        data: attendance,
        message: attendance.isLateArrival
          ? `Clocked in successfully. You are ${attendance.minutesLate} minutes late.`
          : 'Clocked in successfully'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Clock-in failed');
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to clock in'
      });
    }
  });

  // Clock out (alias for check-out)
  fastify.post('/clock-out', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { attendanceId, location, departureReason } = request.body as {
        attendanceId: string;
        location?: {
          latitude: number;
          longitude: number;
          address?: string;
        };
        departureReason?: string;
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
        departureReason
      });

      return reply.code(200).send({
        success: true,
        data: attendance,
        message: attendance.isEarlyDeparture
          ? `Clocked out successfully. You left ${attendance.minutesEarly} minutes early. Admin has been notified.`
          : 'Clocked out successfully'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Clock-out failed');
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to clock out'
      });
    }
  });

  // Check in
  fastify.post('/check-in', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { location } = request.body as {
        location?: {
          latitude: number;
          longitude: number;
          address?: string;
        };
      };

      const attendance = await enhancedAttendanceService.checkIn({
        userId: request.user.userId,
        companyId: request.user.companyId,
        location,
        method: 'manual'
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

  // Check out
  fastify.post('/check-out', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { attendanceId, location, departureReason } = request.body as {
        attendanceId: string;
        location?: {
          latitude: number;
          longitude: number;
          address?: string;
        };
        departureReason?: string;
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
        departureReason
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

  // Get current attendance status
  fastify.get('/status', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const attendance = await enhancedAttendanceService.getCurrentAttendance(
        request.user.userId
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
        SELECT * FROM attendance_records 
        WHERE user_id = $1
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

  // Get my attendance records (for mobile app)
  fastify.get('/my-records', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { filter = 'all' } = request.query as { filter?: string };
      const { userId } = request.user;

      let dateFilter = '';
      const params: any[] = [userId];

      // Apply date filters
      switch (filter) {
        case 'this_week':
          dateFilter = `AND DATE(ar.clock_in_time) >= DATE_TRUNC('week', CURRENT_DATE)`;
          break;
        case 'this_month':
          dateFilter = `AND DATE(ar.clock_in_time) >= DATE_TRUNC('month', CURRENT_DATE)`;
          break;
        case 'last_3_months':
          dateFilter = `AND DATE(ar.clock_in_time) >= CURRENT_DATE - INTERVAL '3 months'`;
          break;
        default:
          // Show last 30 days for 'all'
          dateFilter = `AND DATE(ar.clock_in_time) >= CURRENT_DATE - INTERVAL '30 days'`;
      }

      // Get attendance records
      const recordsResult = await query(
        `SELECT 
          ar.id,
          DATE(ar.clock_in_time) as date,
          TO_CHAR(ar.clock_in_time, 'HH12:MI AM') as "clockInTime",
          TO_CHAR(ar.clock_out_time, 'HH12:MI AM') as "clockOutTime",
          CASE 
            WHEN ar.is_late_arrival THEN 'late'
            WHEN ar.clock_in_time IS NOT NULL THEN 'present'
            ELSE 'absent'
          END as status,
          CASE 
            WHEN ar.check_in_location_type = 'remote' THEN 'remote'
            ELSE 'onsite'
          END as location,
          CASE 
            WHEN ar.clock_out_time IS NOT NULL AND ar.clock_in_time IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (ar.clock_out_time - ar.clock_in_time))/3600
            ELSE NULL
          END as duration_hours
        FROM attendance_records ar
        WHERE ar.user_id = $1 
          ${dateFilter}
        ORDER BY ar.clock_in_time DESC
        LIMIT 100`,
        params
      );

      // Get stats for the filtered period
      const statsResult = await query(
        `SELECT 
          COUNT(CASE WHEN ar.clock_in_time IS NOT NULL AND NOT ar.is_late_arrival THEN 1 END) as present,
          COUNT(CASE WHEN ar.is_late_arrival THEN 1 END) as late,
          COUNT(CASE WHEN ar.clock_in_time IS NULL THEN 1 END) as absent
        FROM attendance_records ar
        WHERE ar.user_id = $1 
          ${dateFilter}`,
        params
      );

      const stats = statsResult.rows[0] || { present: 0, late: 0, absent: 0 };

      return reply.code(200).send({
        success: true,
        data: {
          records: recordsResult.rows,
          stats: {
            present: parseInt(stats.present || 0),
            late: parseInt(stats.late || 0),
            absent: parseInt(stats.absent || 0)
          }
        },
        message: 'Attendance records retrieved successfully'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Failed to get my attendance records');
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve attendance records'
      });
    }
  });
}
