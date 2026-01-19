import { FastifyInstance } from 'fastify';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { logger } from '../utils/logger';

export default async function taskAssignmentRoutes(fastify: FastifyInstance) {
  const db = DatabaseFactory.getPrimaryDatabase();

  // Ensure table exists (backward compatible)
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS task_rate_assignments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        company_id UUID NOT NULL,
        user_id UUID,
        task_code TEXT NOT NULL,
        rate NUMERIC(5,2) NOT NULL,
        notes TEXT,
        status TEXT DEFAULT 'pending',
        reviewed_by UUID,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch (err) {
    logger.error({ err }, 'Failed to ensure task_rate_assignments table');
  }

  // Assign task profile (employee or company-wide)
  fastify.post('/assign', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId: requesterId, role } = request.user as any;
      const { userId, taskCode, rate, notes } = request.body as any;

      if (!taskCode || typeof rate !== 'number') {
        return reply.code(400).send({ success: false, message: 'taskCode and rate are required' });
      }

      // Owners/admins can assign company-wide or to employees; employees can only self-assign if allowed
      if (userId && role === 'employee' && userId !== requesterId) {
        return reply.code(403).send({ success: false, message: 'Access denied' });
      }

      const result = await db.query(
        `INSERT INTO task_rate_assignments (company_id, user_id, task_code, rate, notes, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         RETURNING *`,
        [companyId, userId || null, taskCode, rate, notes || null]
      );

      // Log action
      await db.query(
        `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, 'assigned', 'task', $3, $4)`,
        [companyId, requesterId, result.rows[0].id, JSON.stringify({ taskCode, rate, targetUserId: userId })]
      );

      return reply.code(201).send({ success: true, data: result.rows[0], message: 'Task assignment created' });
    } catch (error: any) {
      logger.error({ err: error, userId: (request.user as any)?.userId }, 'Failed to assign task');
      return reply.code(500).send({ success: false, message: 'Failed to assign task' });
    }
  });

  // List assignments
  fastify.get('/assignments', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, role, userId } = request.user as any;
      const { status, targetUserId } = request.query as any;

      let query = `SELECT * FROM task_rate_assignments WHERE company_id = $1`;
      const params: any[] = [companyId];
      let idx = 2;

      if (role === 'employee') {
        query += ` AND user_id = $${idx++}`;
        params.push(userId);
      } else if (targetUserId) {
        query += ` AND user_id = $${idx++}`;
        params.push(targetUserId);
      }

      if (status) {
        query += ` AND status = $${idx++}`;
        params.push(status);
      }

      query += ` ORDER BY created_at DESC`;

      const res = await db.query(query, params);
      return reply.code(200).send({ success: true, data: res.rows });
    } catch (error: any) {
      return reply.code(500).send({ success: false, message: 'Failed to fetch task assignments' });
    }
  });

  // Get single assignment
  fastify.get('/assignments/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, role, userId } = request.user as any;
      const { id } = request.params as any;
      const res = await db.query(`SELECT * FROM task_rate_assignments WHERE id = $1 AND company_id = $2`, [id, companyId]);
      if (res.rows.length === 0) {
        return reply.code(404).send({ success: false, message: 'Task assignment not found' });
      }
      const assignment = res.rows[0];
      if (role === 'employee' && assignment.user_id && assignment.user_id !== userId) {
        return reply.code(403).send({ success: false, message: 'Access denied' });
      }
      return reply.code(200).send({ success: true, data: assignment });
    } catch (error: any) {
      return reply.code(500).send({ success: false, message: 'Failed to fetch task assignment' });
    }
  });

  // Review assignment (approve/reject)
  fastify.post('/assignments/:id/review', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, role, userId } = request.user as any;
      const { id } = request.params as any;
      const { approved, notes } = request.body as any;

      if (role !== 'owner' && role !== 'admin') {
        return reply.code(403).send({ success: false, message: 'Only owners and admins can review task assignments' });
      }

      const res = await db.query(`SELECT * FROM task_rate_assignments WHERE id = $1 AND company_id = $2`, [id, companyId]);
      if (res.rows.length === 0) {
        return reply.code(404).send({ success: false, message: 'Task assignment not found' });
      }
      const status = approved ? 'approved' : 'rejected';
      await db.query(
        `UPDATE task_rate_assignments SET status = $1, reviewed_by = $2, reviewed_at = NOW(), notes = COALESCE($3, notes), updated_at = NOW() WHERE id = $4 AND company_id = $5`,
        [status, userId, notes || null, id, companyId]
      );

      // Log action
      await db.query(
        `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, $3, 'task', $4, $5)`,
        [companyId, userId, approved ? 'approved' : 'rejected', id, JSON.stringify({ notes })]
      );

      return reply.code(200).send({ success: true, message: `Task assignment ${status}` });
    } catch (error: any) {
      return reply.code(500).send({ success: false, message: 'Failed to review task assignment' });
    }
  });

  // List available task codes
  fastify.get('/codes', async (_request, reply) => {
    return reply.code(200).send({
      success: true,
      data: [
        { code: 'ADMIN', description: 'Administrative Duties', defaultRate: 1.0 },
        { code: 'TECH', description: 'Technical Support', defaultRate: 1.5 },
        { code: 'FIELD', description: 'Field Operations', defaultRate: 2.0 },
        { code: 'MGT', description: 'Management Oversight', defaultRate: 2.5 }
      ]
    });
  });
}
