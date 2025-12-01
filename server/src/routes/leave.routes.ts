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

      // Create leave request
      const result = await db.query(
        `INSERT INTO leave_requests (
          company_id, user_id, leave_type, start_date, end_date,
          total_days, reason, half_day, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
        RETURNING *`,
        [companyId, userId, leaveType, startDate, endDate, totalDays, reason, halfDay || false]
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
      const { status, userId: filterUserId } = request.query as any;

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

      // Only owners and admins can review
      if (role !== 'owner' && role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can review leave requests'
        });
      }

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

      if (leaveRequest.status !== 'pending') {
        return reply.code(400).send({
          success: false,
          message: 'Leave request has already been reviewed'
        });
      }

      // Update leave request status
      const newStatus = approved ? 'approved' : 'rejected';
      await db.query(
        `UPDATE leave_requests 
         SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_notes = $3
         WHERE id = $4`,
        [newStatus, userId, reviewNotes, requestId]
      );

      return reply.send({
        success: true,
        message: `Leave request ${newStatus} successfully`
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to review leave request'
      });
    }
  });
}
