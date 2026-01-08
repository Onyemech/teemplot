import { FastifyInstance } from 'fastify';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { logger } from '../utils/logger';
 
export default async function taxRoutes(fastify: FastifyInstance) {
  const db = DatabaseFactory.getPrimaryDatabase();
 
  // Ensure table exists (backward compatible)
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS tax_assignments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        company_id UUID NOT NULL,
        user_id UUID,
        tax_code TEXT NOT NULL,
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
    logger.error({ err }, 'Failed to ensure tax_assignments table');
  }
 
  // Assign tax profile (employee or company-wide)
  fastify.post('/assign', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId: requesterId, role } = request.user as any;
      const { userId, taxCode, rate, notes } = request.body as any;
 
      if (!taxCode || typeof rate !== 'number') {
        return reply.code(400).send({ success: false, message: 'taxCode and rate are required' });
      }
 
      // Owners/admins can assign company-wide or to employees; employees can only self-assign if allowed
      if (userId && role === 'employee' && userId !== requesterId) {
        return reply.code(403).send({ success: false, message: 'Access denied' });
      }
 
      const result = await db.query(
        `INSERT INTO tax_assignments (company_id, user_id, tax_code, rate, notes, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         RETURNING *`,
        [companyId, userId || null, taxCode, rate, notes || null]
      );
 
      return reply.code(201).send({ success: true, data: result.rows[0], message: 'Tax assignment created' });
    } catch (error: any) {
      logger.error({ err: error, userId: (request.user as any)?.userId }, 'Failed to assign tax');
      return reply.code(500).send({ success: false, message: 'Failed to assign tax' });
    }
  });
 
  // List assignments
  fastify.get('/assignments', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, role, userId } = request.user as any;
      const { status, targetUserId } = request.query as any;
 
      let query = `SELECT * FROM tax_assignments WHERE company_id = $1`;
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
      return reply.code(500).send({ success: false, message: 'Failed to fetch tax assignments' });
    }
  });
 
  // Get single assignment
  fastify.get('/assignments/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, role, userId } = request.user as any;
      const { id } = request.params as any;
      const res = await db.query(`SELECT * FROM tax_assignments WHERE id = $1 AND company_id = $2`, [id, companyId]);
      if (res.rows.length === 0) {
        return reply.code(404).send({ success: false, message: 'Tax assignment not found' });
      }
      const assignment = res.rows[0];
      if (role === 'employee' && assignment.user_id && assignment.user_id !== userId) {
        return reply.code(403).send({ success: false, message: 'Access denied' });
      }
      return reply.code(200).send({ success: true, data: assignment });
    } catch (error: any) {
      return reply.code(500).send({ success: false, message: 'Failed to fetch tax assignment' });
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
        return reply.code(403).send({ success: false, message: 'Only owners and admins can review tax assignments' });
      }
 
      const res = await db.query(`SELECT * FROM tax_assignments WHERE id = $1 AND company_id = $2`, [id, companyId]);
      if (res.rows.length === 0) {
        return reply.code(404).send({ success: false, message: 'Tax assignment not found' });
      }
      const status = approved ? 'approved' : 'rejected';
      await db.query(
        `UPDATE tax_assignments SET status = $1, reviewed_by = $2, reviewed_at = NOW(), notes = COALESCE($3, notes), updated_at = NOW() WHERE id = $4 AND company_id = $5`,
        [status, userId, notes || null, id, companyId]
      );
      return reply.code(200).send({ success: true, message: `Tax assignment ${status}` });
    } catch (error: any) {
      return reply.code(500).send({ success: false, message: 'Failed to review tax assignment' });
    }
  });
 
  // List available tax codes (static for now)
  fastify.get('/codes', async (_request, reply) => {
    return reply.code(200).send({
      success: true,
      data: [
        { code: 'PAYE', description: 'Pay As You Earn', defaultRate: 10.0 },
        { code: 'VAT', description: 'Value Added Tax', defaultRate: 7.5 },
        { code: 'NHF', description: 'National Housing Fund', defaultRate: 2.5 }
      ]
    });
  });
}
