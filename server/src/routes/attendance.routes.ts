import { FastifyInstance } from 'fastify';
import { attendanceService } from '../services/AttendanceService';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';

const ClockInSchema = z.object({
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
  accuracy: z.number().optional(),
});

const ClockOutSchema = z.object({
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
  accuracy: z.number().optional(),
});

export async function attendanceRoutes(fastify: FastifyInstance) {
  // Clock in
  fastify.post(
    '/clock-in',
    {
      preHandler: [authenticate],
      schema: {
        body: ClockInSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { location, accuracy } = request.body as z.infer<typeof ClockInSchema>;
        const user = (request as any).user;

        const result = await attendanceService.clockIn({
          userId: user.id,
          companyId: user.companyId,
          location,
          accuracy,
        });

        return reply.code(200).send({
          success: true,
          data: result,
          message: 'Clocked in successfully',
        });
      } catch (error: any) {
        return reply.code(400).send({
          success: false,
          message: error.message || 'Failed to clock in',
        });
      }
    }
  );

  // Clock out
  fastify.post(
    '/clock-out',
    {
      preHandler: [authenticate],
      schema: {
        body: ClockOutSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { location, accuracy } = request.body as z.infer<typeof ClockOutSchema>;
        const user = (request as any).user;

        const result = await attendanceService.clockOut({
          userId: user.id,
          companyId: user.companyId,
          location,
          accuracy,
        });

        return reply.code(200).send({
          success: true,
          data: result,
          message: result.is_early_departure
            ? 'Clocked out early. Admin has been notified.'
            : 'Clocked out successfully',
        });
      } catch (error: any) {
        return reply.code(400).send({
          success: false,
          message: error.message || 'Failed to clock out',
        });
      }
    }
  );

  // Get today's status
  fastify.get(
    '/today',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as any).user;

        const status = await attendanceService.getTodayStatus(
          user.id,
          user.companyId
        );

        return reply.code(200).send({
          success: true,
          data: status,
        });
      } catch (error: any) {
        return reply.code(500).send({
          success: false,
          message: error.message || 'Failed to get attendance status',
        });
      }
    }
  );

  // Get attendance history
  fastify.get(
    '/history',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as any).user;
        const { startDate, endDate } = request.query as any;

        const history = await attendanceService.getUserAttendanceHistory(
          user.id,
          user.companyId,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined
        );

        return reply.code(200).send({
          success: true,
          data: history,
        });
      } catch (error: any) {
        return reply.code(500).send({
          success: false,
          message: error.message || 'Failed to get attendance history',
        });
      }
    }
  );

  // Get company attendance (admin only)
  fastify.get(
    '/company',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as any).user;

        if (user.role !== 'admin') {
          return reply.code(403).send({
            success: false,
            message: 'Only admins can view company attendance',
          });
        }

        const { startDate, endDate, userId } = request.query as any;

        // TODO: Implement company-wide attendance query
        // This would show all employees' attendance for the company

        return reply.code(200).send({
          success: true,
          data: [],
          message: 'Company attendance endpoint - to be implemented',
        });
      } catch (error: any) {
        return reply.code(500).send({
          success: false,
          message: error.message || 'Failed to get company attendance',
        });
      }
    }
  );
}
