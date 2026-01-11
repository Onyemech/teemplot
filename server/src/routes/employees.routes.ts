import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { requireOnboarding } from '../middleware/onboarding.middleware';

const db = DatabaseFactory.getPrimaryDatabase();

export async function employeesRoutes(fastify: FastifyInstance) {
  // Get all employees
  fastify.get('/', {
    preHandler: [fastify.authenticate, requireOnboarding]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;

      if (!user || !user.companyId) {
        return reply.code(401).send({ success: false, message: 'Unauthorized' });
      }

      // Get all employees in the company (use companyId directly from JWT)
      const employeesQuery = await db.query(
        `SELECT id, first_name as "firstName", last_name as "lastName", email, role, position, 
         avatar_url as avatar, created_at as "createdAt", 'active' as status,
         allow_multi_location_clockin as "allowMultiLocationClockin"
         FROM users 
         WHERE company_id = $1 AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [user.companyId]
      );

      return reply.send({ success: true, data: employeesQuery.rows || [] });
    } catch (error: any) {
      fastify.log.error('Failed to fetch employees:', error);
      return reply.code(500).send({ 
        success: false, 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Get employee by ID
  fastify.get('/:id', {
    preHandler: [fastify.authenticate, requireOnboarding]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      const { id } = request.params as any;

      if (!user || !user.companyId) {
        return reply.code(401).send({ success: false, message: 'Unauthorized' });
      }

      const employeeQuery = await db.query(
        `SELECT id, first_name as "firstName", last_name as "lastName", email, role, position, 
         avatar_url as avatar, created_at as "createdAt", 'active' as status
         FROM users 
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, user.companyId]
      );

      if (!employeeQuery.rows[0]) {
        return reply.code(404).send({ success: false, message: 'Employee not found' });
      }

      return reply.send({ success: true, data: employeeQuery.rows[0] });
    } catch (error: any) {
      fastify.log.error('Failed to fetch employee:', error);
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Update employee
  fastify.put('/:id', {
    preHandler: [fastify.authenticate, requireOnboarding]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      const { id } = request.params as any;
      const { firstName, lastName, role, position } = request.body as any;

      if (user.role !== 'owner' && user.role !== 'admin') {
        return reply.code(403).send({ success: false, message: 'Forbidden' });
      }

      const updateQuery = await db.query(
        `UPDATE users 
         SET first_name = $1, last_name = $2, role = $3, position = $4, updated_at = NOW()
         WHERE id = $5 AND company_id = $6 AND deleted_at IS NULL
         RETURNING id`,
        [firstName, lastName, role, position, id, user.companyId]
      );

      if (!updateQuery.rows[0]) {
        return reply.code(404).send({ success: false, message: 'Employee not found' });
      }

      return reply.send({ success: true, message: 'Employee updated successfully' });
    } catch (error: any) {
      fastify.log.error('Failed to update employee:', error);
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Delete employee (soft delete)
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate, requireOnboarding]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      const { id } = request.params as any;

      if (user.role !== 'owner' && user.role !== 'admin') {
        return reply.code(403).send({ success: false, message: 'Forbidden' });
      }

      // Don't allow deleting self
      if (id === user.userId) {
        return reply.code(400).send({ success: false, message: 'You cannot delete your own account' });
      }

      const deleteQuery = await db.query(
        `UPDATE users 
         SET deleted_at = NOW()
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, user.companyId]
      );

      if (!deleteQuery.rows[0]) {
        return reply.code(404).send({ success: false, message: 'Employee not found' });
      }

      return reply.send({ success: true, message: 'Employee deleted successfully' });
    } catch (error: any) {
      fastify.log.error('Failed to delete employee:', error);
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Update employee multi-clockin permission
  fastify.patch('/:id/multi-clockin', {
    preHandler: [fastify.authenticate, requireOnboarding]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      const { id } = request.params as any;
      const { allowed } = request.body as any;

      if (user.role !== 'owner' && user.role !== 'admin') {
        return reply.code(403).send({ success: false, message: 'Forbidden' });
      }

      const updateQuery = await db.query(
        `UPDATE users 
         SET allow_multi_location_clockin = $1, updated_at = NOW()
         WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL
         RETURNING id`,
        [allowed, id, user.companyId]
      );

      if (!updateQuery.rows[0]) {
        return reply.code(404).send({ success: false, message: 'Employee not found' });
      }

      return reply.send({ success: true, message: 'Permission updated successfully' });
    } catch (error: any) {
      fastify.log.error('Failed to update employee permission:', error);
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });
}
