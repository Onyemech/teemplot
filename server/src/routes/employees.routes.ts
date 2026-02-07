import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { requireOnboarding } from '../middleware/onboarding.middleware';
import { z } from 'zod';

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
        `SELECT id, first_name as "firstName", last_name as "lastName", email, role, position, job_title as "jobTitle",
         avatar_url as avatar, bio, phone_number as "phoneNumber", created_at as "createdAt", 
         CASE WHEN is_active THEN 'active' ELSE 'inactive' END as status,
         date_of_birth as "dateOfBirth",
         allow_multi_location_clockin as "allowMultiLocationClockin",
         allow_remote_clockin as "allowRemoteClockin"
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
         avatar_url as avatar, created_at as "createdAt", 
         CASE WHEN is_active THEN 'active' ELSE 'inactive' END as status,
         date_of_birth as "dateOfBirth"
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
      const UpdateEmployeeSchema = z.object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        role: z.enum(['owner', 'admin', 'department_head', 'manager', 'employee']).optional(),
        position: z.string().optional()
      });
      const parsed = UpdateEmployeeSchema.parse(request.body);
      const roleNormalized = parsed.role ? parsed.role.toLowerCase().trim() as typeof parsed.role : undefined;

      if (user.role !== 'owner' && user.role !== 'admin') {
        return reply.code(403).send({ success: false, message: 'Forbidden' });
      }

      // Prevent self role changes for admins/owners
      if (id === user.userId && roleNormalized && roleNormalized !== user.role) {
        return reply.code(403).send({ success: false, message: 'You cannot change your own role' });
      }

      // Check target user role to prevent Admin from modifying Owner
      if (user.role === 'admin') {
        const targetUserRes = await db.query('SELECT role FROM users WHERE id = $1', [id]);
        const targetUser = targetUserRes.rows[0];
        
        if (targetUser && targetUser.role === 'owner') {
          return reply.code(403).send({ success: false, message: 'Admins cannot modify Owner details' });
        }
        
        // Also prevent Admin from promoting someone to Owner
        if (roleNormalized === 'owner') {
          return reply.code(403).send({ success: false, message: 'Admins cannot promote users to Owner' });
        }
      }

      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (parsed.firstName !== undefined) {
        updates.push(`first_name = $${idx++}`);
        values.push(parsed.firstName);
      }
      if (parsed.lastName !== undefined) {
        updates.push(`last_name = $${idx++}`);
        values.push(parsed.lastName);
      }
      if (parsed.position !== undefined) {
        updates.push(`position = $${idx++}`);
        values.push(parsed.position ?? null);
      }
      if (roleNormalized !== undefined) {
        updates.push(`role = $${idx++}`);
        values.push(roleNormalized);
      }

      if (updates.length === 0) {
        return reply.code(400).send({ success: false, message: 'No changes provided' });
      }

      values.push(id, user.companyId);

      const updateQuery = await db.query(
        `UPDATE users 
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${idx} AND company_id = $${idx + 1} AND deleted_at IS NULL
         RETURNING id`,
        values
      );

      if (!updateQuery.rows[0]) {
        return reply.code(404).send({ success: false, message: 'Employee not found' });
      }

      return reply.send({ success: true, message: 'Employee updated successfully' });
    } catch (error: any) {
      fastify.log.error('Failed to update employee:', error);
      const message = typeof error?.message === 'string' ? error.message : 'Internal server error';
      return reply.code(400).send({ success: false, message });
    }
  });

  // Toggle employee status (Suspend/Activate)
  fastify.patch('/:id/status', {
    preHandler: [fastify.authenticate, requireOnboarding]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      const { id } = request.params as any;
      const { status } = request.body as any; // 'active' or 'inactive'

      if (user.role !== 'owner' && user.role !== 'admin') {
        return reply.code(403).send({ success: false, message: 'Forbidden' });
      }

      // Check target user role to prevent Admin from suspending Owner
      const targetUserRes = await db.query('SELECT role FROM users WHERE id = $1', [id]);
      const targetUser = targetUserRes.rows[0];

      if (!targetUser) {
        return reply.code(404).send({ success: false, message: 'Employee not found' });
      }

      if (targetUser.role === 'owner' && user.role !== 'owner') {
        return reply.code(403).send({ success: false, message: 'Admins cannot suspend Owners' });
      }

      const isActive = status === 'active';

      const updateQuery = await db.query(
        `UPDATE users 
         SET is_active = $1, updated_at = NOW()
         WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL
         RETURNING id, is_active`,
        [isActive, id, user.companyId]
      );

      return reply.send({ success: true, message: `User ${isActive ? 'activated' : 'suspended'} successfully` });
    } catch (error: any) {
      fastify.log.error('Failed to update employee status:', error);
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

  // Update employee remote-clockin permission
  fastify.patch('/:id/remote-clockin', {
    preHandler: [fastify.authenticate, requireOnboarding]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      const { id } = request.params as any;
      const { allowed } = request.body as any;

      fastify.log.info({
        adminId: user.userId,
        adminRole: user.role,
        employeeId: id,
        allowed,
        companyId: user.companyId
      }, 'Attempting to update remote clockin permission');

      if (user.role !== 'owner' && user.role !== 'admin') {
        fastify.log.warn({ adminId: user.userId, adminRole: user.role }, 'Unauthorized attempt to update remote clockin permission');
        return reply.code(403).send({ success: false, message: 'Forbidden: Insufficient permissions' });
      }

      const updateQuery = await db.query(
        `UPDATE users
         SET allow_remote_clockin = $1, updated_at = NOW()
         WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL
         RETURNING id, first_name, last_name`,
        [allowed, id, user.companyId]
      );

      if (!updateQuery.rows[0]) {
        fastify.log.warn({ employeeId: id, companyId: user.companyId }, 'Employee not found for remote clockin update');
        return reply.code(404).send({ success: false, message: 'Employee not found or unauthorized' });
      }

      fastify.log.info({ employeeId: id, allowed }, 'Remote clockin permission updated successfully');

      return reply.send({ success: true, message: 'Permission updated successfully' });
    } catch (error: any) {
      fastify.log.error('Failed to update remote clockin permission:', error);
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });
}
