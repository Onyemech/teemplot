import { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { requireFeature } from '../middleware/subscription.middleware';

export default async function leaveRoutes(fastify: FastifyInstance) {
  const db = DatabaseFactory.getPrimaryDatabase();

  // Helper to ensure default leave types exist for a company
  const ensureDefaultLeaveTypes = async (companyId: string) => {
    const existing = await db.query(
      'SELECT id FROM leave_types WHERE company_id = $1 AND slug = $2',
      [companyId, 'annual']
    );
    if (existing.rows.length === 0) {
      // Create defaults
      await db.query(
        `INSERT INTO leave_types (company_id, name, slug, default_days, color)
         VALUES 
         ($1, 'Annual Leave', 'annual', 20, '#0F5D5D'),
         ($1, 'Sick Leave', 'sick', 10, '#EF4444'),
         ($1, 'Unpaid Leave', 'unpaid', 0, '#6B7280')`,
        [companyId]
      );
    }
  };

  // GET /types - Get company leave types
  fastify.get('/types', {
    preHandler: [fastify.authenticate, requireFeature('leave')],
  }, async (request, reply) => {
    try {
      const { companyId } = request.user as any;
      await ensureDefaultLeaveTypes(companyId);

      const result = await db.query(
        'SELECT * FROM leave_types WHERE company_id = $1 AND deleted_at IS NULL ORDER BY name',
        [companyId]
      );
      return reply.send({ success: true, data: result.rows });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to fetch leave types');
      return reply.code(500).send({ success: false, message: 'Failed to fetch leave types' });
    }
  });

  // POST /types - Create/Update leave type (Admin)
  fastify.post('/types', {
    preHandler: [fastify.authenticate, requireFeature('leave')],
  }, async (request, reply) => {
    try {
      const { companyId, role } = request.user as any;
      if (role !== 'admin' && role !== 'owner') {
        return reply.code(403).send({ success: false, message: 'Forbidden' });
      }

      const { name, defaultDays, isPaid, requiresApproval, color } = request.body as any;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const result = await db.query(
        `INSERT INTO leave_types (company_id, name, slug, default_days, is_paid, requires_approval, color)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [companyId, name, slug, defaultDays, isPaid, requiresApproval, color]
      );

      return reply.send({ success: true, data: result.rows[0] });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to create leave type');
      return reply.code(500).send({ success: false, message: 'Failed to create leave type' });
    }
  });

  // Request leave
  fastify.post('/request', {
    preHandler: [fastify.authenticate, requireFeature('leave')],
  }, async (request, reply) => {
    try {
      const { companyId, userId } = request.user as any;
      const {
        leaveTypeId, // Now expecting ID, not slug
        startDate,
        endDate,
        reason,
        halfDay
      } = request.body as any;

      // Validate required fields
      if (!leaveTypeId || !startDate || !endDate || !reason) {
        return reply.code(400).send({
          success: false,
          message: 'Leave type, dates, and reason are required'
        });
      }

      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        return reply.code(400).send({
          success: false,
          message: 'End date must be after start date'
        });
      }

      // Calculate days
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const totalDays = halfDay ? 0.5 : diffDays;

      // Fetch leave type configuration
      const typeResult = await db.query(
        'SELECT * FROM leave_types WHERE id = $1 AND company_id = $2',
        [leaveTypeId, companyId]
      );
      const leaveTypeConfig = typeResult.rows[0];

      if (!leaveTypeConfig) {
        return reply.code(400).send({ success: false, message: 'Invalid leave type' });
      }

      // Check leave balance (Enterprise Logic with dynamic types)
      const currentYear = new Date().getFullYear();
      
      // 1. Get the Leave Type definition
      const typeQuery = await db.query(
        'SELECT id, name, days_allowed FROM leave_types WHERE company_id = $1 AND name = $2',
        [companyId, leaveType === 'annual' ? 'Annual Leave' : 
                   leaveType === 'sick' ? 'Sick Leave' : 
                   leaveType === 'unpaid' ? 'Unpaid Leave' : 
                   leaveType === 'maternity' ? 'Maternity Leave' : 
                   leaveType === 'paternity' ? 'Paternity Leave' : leaveType]
      );
      
      // If dynamic type not found, fallback to legacy checks (for migration safety)
      if (typeQuery.rows.length === 0) {
        if (leaveType === 'annual') {
          const userResult = await db.query('SELECT annual_leave_balance FROM users WHERE id = $1', [userId]);
          const balance = userResult.rows[0]?.annual_leave_balance || 0;
          if (balance < totalDays) {
            return reply.code(400).send({ success: false, message: `Insufficient leave balance. You have ${balance} days available.` });
          }
        }
      } else {
        // 2. Check Dynamic Balance
        const typeId = typeQuery.rows[0].id;
        const balanceQuery = await db.query(
          'SELECT balance_days FROM leave_balances WHERE user_id = $1 AND leave_type_id = $2 AND year = $3',
          [userId, typeId, currentYear]
        );
        
        let balance = 0;
        if (balanceQuery.rows.length > 0) {
          balance = Number(balanceQuery.rows[0].balance_days);
        } else {
          // Initialize balance if not exists (default to type allowance)
          balance = Number(typeQuery.rows[0].days_allowed);
          await db.query(
            'INSERT INTO leave_balances (company_id, user_id, leave_type_id, balance_days, year) VALUES ($1, $2, $3, $4, $5)',
            [companyId, userId, typeId, balance, currentYear]
          );
        }
        
        if (balance < totalDays && leaveType !== 'unpaid') { // Allow unpaid to exceed
           return reply.code(400).send({ success: false, message: `Insufficient leave balance. You have ${balance} days available.` });
        }
      }

      // Determine initial review stage
      const deptRes = await db.query('SELECT department_id FROM users WHERE id = $1', [userId]);
      const departmentId = deptRes.rows[0]?.department_id || null;
      let initialStage = 'admin';
      if (departmentId) {
        const mgrRes = await db.query(
          `SELECT id FROM users 
           WHERE company_id = $1 AND department_id = $2 
             AND (role = 'manager' OR role = 'department_head') AND is_active = true
           LIMIT 1`,
          [companyId, departmentId]
        );
        if (mgrRes.rows.length > 0) {
          initialStage = 'manager';
        }
      }

      // Create leave request
      const result = await db.query(
        `INSERT INTO leave_requests (
          company_id, user_id, leave_type, start_date, end_date,
          total_days, reason, half_day, status, review_stage
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
        RETURNING *`,
        [companyId, userId, leaveTypeConfig.name, startDate, endDate, totalDays, reason, halfDay || false, initialStage]
      );

      const leaveRequest = result.rows[0];

      // Deduct balance
      await db.query(
        `UPDATE employee_leave_balances 
         SET balance = balance - $1
         WHERE user_id = $2 AND leave_type_id = $3 AND year = $4`,
        [totalDays, userId, leaveTypeId, currentYear]
      );

      // Log action
      await db.query(
        `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, 'requested', 'leave', $3, $4)`,
        [companyId, userId, leaveRequest.id, JSON.stringify({ leaveType: leaveTypeConfig.name, totalDays })]
      );

      logger.info({ leaveRequestId: leaveRequest.id, userId, totalDays }, 'Leave requested');

      return reply.code(201).send({
        success: true,
        data: leaveRequest,
        message: 'Leave request submitted successfully'
      });

    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Failed to request leave');
      return reply.code(500).send({
        success: false,
        message: 'Failed to submit leave request'
      });
    }
  });

  // Get leave requests (Existing logic mostly kept, just ensure it works)
  fastify.get('/requests', {
    preHandler: [fastify.authenticate, requireFeature('leave')],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user as any;
      const { status, userId: filterUserId, reviewStage } = request.query as any;

      let query = `
        SELECT 
          lr.*,
          u.first_name || ' ' || u.last_name as user_name,
          u.email as user_email
        FROM leave_requests lr
        JOIN users u ON lr.user_id = u.id
        WHERE lr.company_id = $1
      `;
      const params: any[] = [companyId];
      let paramIndex = 2;

      if (role === 'employee') {
        query += ` AND lr.user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      } else if (role === 'manager' || role === 'department_head') {
        const deptRes = await db.query('SELECT department_id FROM users WHERE id = $1', [userId]);
        const departmentId = deptRes.rows[0]?.department_id || null;
        if (departmentId) {
          query += ` AND u.department_id = $${paramIndex}`;
          params.push(departmentId);
          paramIndex++;
        } else {
          query += ` AND 1 = 0`;
        }
      } else if (filterUserId) {
        query += ` AND lr.user_id = $${paramIndex}`;
        params.push(filterUserId);
        paramIndex++;
      }

      if (status) {
        query += ` AND lr.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      query += ' ORDER BY lr.created_at DESC';

      const result = await db.query(query, params);

      return reply.send({
        success: true,
        data: result.rows
      });

    } catch (error: any) {
      logger.error({ err: error }, 'Failed to fetch requests');
      return reply.code(500).send({ success: false, message: 'Failed to fetch requests' });
    }
  });

  // ... (Keep existing review endpoints)
}
