import { FastifyInstance } from 'fastify';
import { query } from '../config/database';
import { logger } from '../utils/logger';

export default async function multipleClockInRoutes(fastify: FastifyInstance) {
  // Get employees enabled for multiple clock-in
  fastify.get('/employees', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, role } = request.user;

      // Only admins and owners can view multiple clock-in settings
      if (role !== 'admin' && role !== 'owner') {
        return reply.code(403).send({
          success: false,
          message: 'Access denied. Only admins and owners can view multiple clock-in settings.'
        });
      }

      const result = await query(
        `SELECT 
          u.id,
          u.first_name as "firstName",
          u.last_name as "lastName",
          u.email,
          u.position,
          COALESCE(d.name, 'No Department') as department
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        INNER JOIN multiple_clockin mc ON u.id = mc.user_id AND mc.company_id = $1
        WHERE u.company_id = $1 
          AND u.role IN ('employee', 'department_manager')
          AND u.is_active = true
          AND mc.enabled = true
        ORDER BY u.first_name, u.last_name`,
        [companyId]
      );

      return reply.code(200).send({
        success: true,
        data: result.rows,
        message: 'Multiple clock-in employees retrieved successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to get multiple clock-in employees');
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve multiple clock-in employees'
      });
    }
  });

  // Enable multiple clock-in for employees
  fastify.post('/employees', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user;
      const { employeeIds } = request.body as { employeeIds: string[] };

      // Only admins and owners can enable multiple clock-in
      if (role !== 'admin' && role !== 'owner') {
        return reply.code(403).send({
          success: false,
          message: 'Access denied. Only admins and owners can enable multiple clock-in.'
        });
      }

      if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
        return reply.code(400).send({
          success: false,
          message: 'Employee IDs are required'
        });
      }

      // Verify all employees belong to the company
      const employeeCheck = await query(
        `SELECT id FROM users 
         WHERE id = ANY($1) AND company_id = $2 AND role IN ('employee', 'department_manager')`,
        [employeeIds, companyId]
      );

      if (employeeCheck.rows.length !== employeeIds.length) {
        return reply.code(400).send({
          success: false,
          message: 'Some employees do not exist or do not belong to your company'
        });
      }

      // Enable multiple clock-in for the employees (upsert)
      const values = employeeIds.map((employeeId, index) => 
        `($${index * 4 + 1}, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4})`
      ).join(', ');

      const params = employeeIds.flatMap(employeeId => [
        companyId, employeeId, userId, true
      ]);

      await query(
        `INSERT INTO multiple_clockin (company_id, user_id, enabled_by, enabled)
         VALUES ${values}
         ON CONFLICT (company_id, user_id) 
         DO UPDATE SET 
           enabled = EXCLUDED.enabled,
           enabled_by = EXCLUDED.enabled_by,
           updated_at = NOW()`,
        params
      );

      logger.info({
        companyId,
        userId,
        employeeIds,
        action: 'enable_multiple_clockin'
      }, 'Multiple clock-in enabled for employees');

      return reply.code(200).send({
        success: true,
        message: `Multiple clock-in enabled for ${employeeIds.length} employee(s)`
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to enable multiple clock-in');
      return reply.code(500).send({
        success: false,
        message: 'Failed to enable multiple clock-in'
      });
    }
  });

  // Remove single employee from multiple clock-in
  fastify.delete('/employees/:employeeId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user;
      const { employeeId } = request.params as { employeeId: string };

      // Only admins and owners can disable multiple clock-in
      if (role !== 'admin' && role !== 'owner') {
        return reply.code(403).send({
          success: false,
          message: 'Access denied. Only admins and owners can disable multiple clock-in.'
        });
      }

      // Verify employee belongs to the company
      const employeeCheck = await query(
        `SELECT id FROM users 
         WHERE id = $1 AND company_id = $2 AND role IN ('employee', 'department_manager')`,
        [employeeId, companyId]
      );

      if (employeeCheck.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'Employee not found or does not belong to your company'
        });
      }

      // Disable multiple clock-in for the employee
      await query(
        `UPDATE multiple_clockin 
         SET enabled = false, updated_at = NOW()
         WHERE company_id = $1 AND user_id = $2`,
        [companyId, employeeId]
      );

      logger.info({
        companyId,
        userId,
        employeeId,
        action: 'disable_multiple_clockin'
      }, 'Multiple clock-in disabled for employee');

      return reply.code(200).send({
        success: true,
        message: 'Employee removed from multiple clock-in successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to disable multiple clock-in');
      return reply.code(500).send({
        success: false,
        message: 'Failed to remove employee from multiple clock-in'
      });
    }
  });

  // Check if user has multiple clock-in enabled (for attendance checking)
  fastify.get('/check/:userId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId } = request.user;
      const { userId } = request.params as { userId: string };

      const result = await query(
        `SELECT enabled FROM multiple_clockin 
         WHERE company_id = $1 AND user_id = $2`,
        [companyId, userId]
      );

      const isEnabled = result.rows.length > 0 ? result.rows[0].enabled : false;

      return reply.code(200).send({
        success: true,
        data: { enabled: isEnabled },
        message: 'Multiple clock-in status retrieved successfully'
      });
    } catch (error: any) {
      logger.error({ error, companyId: request.user.companyId }, 'Failed to check multiple clock-in status');
      return reply.code(500).send({
        success: false,
        message: 'Failed to check multiple clock-in status'
      });
    }
  });
}