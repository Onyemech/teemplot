import { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';

export default async function leaveRoutes(fastify: FastifyInstance) {
  const db = DatabaseFactory.getPrimaryDatabase();
  
  // Request leave
  fastify.post('/request', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId } = request.user;
      const {
        leaveType,
        startDate,
        endDate,
        reason,
        halfDay
      } = request.body as any;

      // Validate required fields
      if (!leaveType || !startDate || !endDate || !reason) {
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

      // Check leave balance
      const userResult = await db.query(
        'SELECT annual_leave_balance FROM users WHERE id = $1',
        [userId]
      );
      
      const balance = userResult.rows[0]?.annual_leave_balance || 0;
      
      if (leaveType === 'annual' && balance < totalDays) {
        return reply.code(400).send({
          success: false,
          message: `Insufficient leave balance. You have ${balance} days available.`
        });
      }

      // Determine initial review stage: manager if available in user's department, otherwise admin
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

      // Create leave request with hierarchical stage
      const result = await db.query(
        `INSERT INTO leave_requests (
          company_id, user_id, leave_type, start_date, end_date,
          total_days, reason, half_day, status, review_stage
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
        RETURNING *`,
        [companyId, userId, leaveType, startDate, endDate, totalDays, reason, halfDay || false, initialStage]
      );

      const leaveRequest = result.rows[0];

      // Log action
      await db.query(
        `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, 'requested', 'leave', $3, $4)`,
        [companyId, userId, leaveRequest.id, JSON.stringify({ leaveType, totalDays })]
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

  // Get leave requests
  fastify.get('/requests', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user;
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

      // Employees can only see their own requests
      if (role === 'employee') {
        query += ` AND lr.user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      } else if (role === 'manager' || role === 'department_head') {
        // Managers/department heads can see their department users
        const deptRes = await db.query('SELECT department_id FROM users WHERE id = $1', [userId]);
        const departmentId = deptRes.rows[0]?.department_id || null;
        if (departmentId) {
          query += ` AND u.department_id = $${paramIndex}`;
          params.push(departmentId);
          paramIndex++;
        } else {
          // If no department, restrict to none
          query += ` AND 1 = 0`;
        }
      } else if (filterUserId) {
        // Admins/owners can filter by user
        query += ` AND lr.user_id = $${paramIndex}`;
        params.push(filterUserId);
        paramIndex++;
      }

      // Filter by status
      if (status) {
        query += ` AND lr.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      // Filter by review stage
      if (reviewStage) {
        query += ` AND lr.review_stage = $${paramIndex}`;
        params.push(reviewStage);
        paramIndex++;
      }

      query += ' ORDER BY lr.created_at DESC';

      const result = await db.query(query, params);

      return reply.send({
        success: true,
        data: result.rows
      });

    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Failed to fetch leave requests');
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch leave requests'
      });
    }
  });

  // Get single leave request
  fastify.get('/requests/:requestId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user;
      const { requestId } = request.params as any;

      const result = await db.query(
        `SELECT 
          lr.*,
          u.first_name || ' ' || u.last_name as user_name,
          u.email as user_email,
          CASE WHEN lr.reviewed_by IS NOT NULL 
            THEN (SELECT first_name || ' ' || last_name FROM users WHERE id = lr.reviewed_by)
            ELSE NULL 
          END as reviewed_by_name
         FROM leave_requests lr
         JOIN users u ON lr.user_id = u.id
         WHERE lr.id = $1 AND lr.company_id = $2`,
        [requestId, companyId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'Leave request not found'
        });
      }

      const leaveRequest = result.rows[0];

      // Employees can only view their own requests
      if (role === 'employee' && leaveRequest.user_id !== userId) {
        return reply.code(403).send({
          success: false,
          message: 'Access denied'
        });
      }

      return reply.send({
        success: true,
        data: leaveRequest
      });

    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Failed to fetch leave request');
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch leave request'
      });
    }
  });

  // Approve/Reject leave request
  fastify.post('/requests/:requestId/review', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user;
      const { requestId } = request.params as any;
      const { approved, reviewNotes } = request.body as any;

      // Get leave request
      const leaveResult = await db.query(
        'SELECT * FROM leave_requests WHERE id = $1 AND company_id = $2',
        [requestId, companyId]
      );

      if (leaveResult.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'Leave request not found'
        });
      }

      const leaveRequest = leaveResult.rows[0];

      // Hierarchical review: manager -> admin -> owner
      if (leaveRequest.status !== 'pending' && leaveRequest.status !== 'in_review') {
        return reply.code(400).send({ success: false, message: 'Leave request is not in a reviewable state' });
      }
      
      const stage = leaveRequest.review_stage || 'manager';
      if (stage === 'manager') {
        if (role !== 'manager' && role !== 'department_head' && role !== 'admin' && role !== 'owner') {
          return reply.code(403).send({ success: false, message: 'Manager review required' });
        }
        const deptRes = await db.query('SELECT department_id FROM users WHERE id = $1', [leaveRequest.user_id]);
        const employeeDept = deptRes.rows[0]?.department_id || null;
        if ((role === 'manager' || role === 'department_head') && employeeDept) {
          const mgrDeptRes = await db.query('SELECT department_id FROM users WHERE id = $1', [userId]);
          if (mgrDeptRes.rows[0]?.department_id !== employeeDept) {
            return reply.code(403).send({ success: false, message: 'Managers can only review their department' });
          }
        }
        if (!approved) {
          await db.query(
            `UPDATE leave_requests SET status = 'rejected', review_stage = 'manager',
             manager_notes = $1, reviewed_by_manager = $2, reviewed_at_manager = NOW()
             WHERE id = $3 AND company_id = $4`,
            [reviewNotes || null, userId, requestId, companyId]
          );
          return reply.send({ success: true, message: 'Leave request rejected by manager' });
        } else {
          await db.query(
            `UPDATE leave_requests SET status = 'in_review', review_stage = 'admin',
             manager_notes = $1, reviewed_by_manager = $2, reviewed_at_manager = NOW()
             WHERE id = $3 AND company_id = $4`,
            [reviewNotes || null, userId, requestId, companyId]
          );
          return reply.send({ success: true, message: 'Leave request escalated to admin' });
        }
      } else if (stage === 'admin') {
        if (role !== 'admin' && role !== 'owner') {
          return reply.code(403).send({ success: false, message: 'Admin review required' });
        }
        if (!approved) {
          await db.query(
            `UPDATE leave_requests SET status = 'rejected', review_stage = 'admin',
             admin_notes = $1, reviewed_by_admin = $2, reviewed_at_admin = NOW()
             WHERE id = $3 AND company_id = $4`,
            [reviewNotes || null, userId, requestId, companyId]
          );
          return reply.send({ success: true, message: 'Leave request rejected by admin' });
        } else {
          await db.query(
            `UPDATE leave_requests SET status = 'in_review', review_stage = 'owner',
             admin_notes = $1, reviewed_by_admin = $2, reviewed_at_admin = NOW()
             WHERE id = $3 AND company_id = $4`,
            [reviewNotes || null, userId, requestId, companyId]
          );
          return reply.send({ success: true, message: 'Leave request escalated to owner' });
        }
      } else if (stage === 'owner') {
        if (role !== 'owner') {
          return reply.code(403).send({ success: false, message: 'Owner review required' });
        }
        if (!approved) {
          await db.query(
            `UPDATE leave_requests SET status = 'rejected', review_stage = 'owner',
             owner_notes = $1, reviewed_by_owner = $2, reviewed_at_owner = NOW()
             WHERE id = $3 AND company_id = $4`,
            [reviewNotes || null, userId, requestId, companyId]
          );
          return reply.send({ success: true, message: 'Leave request rejected by owner' });
        } else {
          await db.query(
            `UPDATE leave_requests SET status = 'approved',
             owner_notes = $1, reviewed_by_owner = $2, reviewed_at_owner = NOW()
             WHERE id = $3 AND company_id = $4`,
            [reviewNotes || null, userId, requestId, companyId]
          );
          return reply.send({ success: true, message: 'Leave request approved' });
        }
      } else {
        return reply.code(400).send({ success: false, message: 'Invalid review stage' });
      }

      
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to review leave request'
      });
    }
  });
}
