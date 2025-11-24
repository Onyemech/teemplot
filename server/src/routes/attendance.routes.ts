import { FastifyInstance } from 'fastify';
import { enhancedAttendanceService } from '../services/EnhancedAttendanceService';
import { logger } from '../utils/logger';

export default async function attendanceRoutes(fastify: FastifyInstance) {
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
  fastify.get('/current', {
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
      const result = await fastify.pg.query(
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

      let query = `
        SELECT * FROM attendance_records 
        WHERE user_id = $1
      `;
      const params: any[] = [request.user.userId];

      if (startDate) {
        params.push(startDate);
        query += ` AND clock_in_time >= $${params.length}`;
      }

      if (endDate) {
        params.push(endDate);
        query += ` AND clock_in_time <= $${params.length}`;
      }

      query += ` ORDER BY clock_in_time DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await fastify.pg.query(query, params);

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
    preHandler: [fastify.authenticate, fastify.requireRole(['owner', 'admin'])],
  }, async (request, reply) => {
    try {
      const { date } = request.params as { date?: string };
      const targetDate = date || new Date().toISOString().split('T')[0];

      const result = await fastify.pg.query(
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
    preHandler: [fastify.authenticate, fastify.requireRole(['owner', 'admin'])],
  }, async (request, reply) => {
    try {
      const { startDate, endDate } = request.query as {
        startDate?: string;
        endDate?: string;
      };

      let query = `
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
        query += ` AND ar.clock_out_time >= $${params.length}`;
      }

      if (endDate) {
        params.push(endDate);
        query += ` AND ar.clock_out_time <= $${params.length}`;
      }

      query += ` ORDER BY ar.clock_out_time DESC`;

      const result = await fastify.pg.query(query, params);

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
    preHandler: [fastify.authenticate, fastify.requireRole(['owner', 'admin'])],
  }, async (request, reply) => {
    try {
      const { startDate, endDate } = request.query as {
        startDate?: string;
        endDate?: string;
      };

      let query = `
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
        query += ` AND ar.clock_in_time >= $${params.length}`;
      }

      if (endDate) {
        params.push(endDate);
        query += ` AND ar.clock_in_time <= $${params.length}`;
      }

      query += ` ORDER BY ar.clock_in_time DESC`;

      const result = await fastify.pg.query(query, params);

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
