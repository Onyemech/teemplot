import { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';

export default async function leaveRoutes(fastify: FastifyInstance) {
  const db = DatabaseFactory.getPrimaryDatabase();

  // Get leave types for company
  fastify.get('/types', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId } = request.user;

      const result = await db.query(
        'SELECT * FROM leave_types WHERE company_id = $1 AND is_active = true ORDER BY name',
        [companyId]
      );

      return reply.send({
        success: true,
        data: result.rows
      });

    } catch (error: any) {
      logger.error({ err: error, companyId: request.user?.companyId }, 'Failed to fetch leave types');
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch leave types'
      });
    }
  });

  // Create leave type (owners/admins only)
  fastify.post('/types', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user;
      const { name, code, annualAllocation, carryForwardLimit, color } = request.body as any;

      if (!['owner', 'admin'].includes(role)) {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can create leave types'
        });
      }

      if (!name || !code) {
        return reply.code(400).send({
          success: false,
          message: 'Name and code are required'
        });
      }

      const result = await db.query(
        `INSERT INTO leave_types (company_id, name, code, annual_allocation, carry_forward_limit, color)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [companyId, name, code.toUpperCase(), annualAllocation || 0, carryForwardLimit || 0, color || '#0F5D5D']
      );

      return reply.code(201).send({
        success: true,
        data: result.rows[0],
        message: 'Leave type created successfully'
      });

    } catch (error: any) {
      if (error.code === '23505') {
        return reply.code(400).send({
          success: false,
          message: 'Leave type code already exists'
        });
      }
      logger.error({ err: error, companyId: request.user?.companyId }, 'Failed to create leave type');
      return reply.code(500).send({
        success: false,
        message: 'Failed to create leave type'
      });
    }
  });

  // Get user leave balances
  fastify.get('/balances/:userId?', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId: currentUserId, role } = request.user;
      const { userId } = request.params as any;
      
      // Use current user if no userId specified, or if employee role
      const targetUserId = (role === 'employee' || !userId) ? currentUserId : userId;

      // Verify target user belongs to company
      if (targetUserId !== currentUserId) {
        const userCheck = await db.query(
          'SELECT id FROM users WHERE id = $1 AND company_id = $2',
          [targetUserId, companyId]
        );

        if (userCheck.rows.length === 0) {
          return reply.code(404).send({
            success: false,
            message: 'User not found'
          });
        }
      }

      const result = await db.query(
        `SELECT 
          ulb.*,
          lt.name as leave_type_name,
          lt.code as leave_type_code,
          lt.color as leave_type_color
         FROM user_leave_balances ulb
         JOIN leave_types lt ON ulb.leave_type_id = lt.id
         WHERE ulb.company_id = $1 AND ulb.user_id = $2 AND ulb.year = $3
         ORDER BY lt.name`,
        [companyId, targetUserId, new Date().getFullYear()]
      );

      return reply.send({
        success: true,
        data: result.rows
      });

    } catch (error: any) {
      logger.error({ err: error, companyId: request.user?.companyId }, 'Failed to fetch leave balances');
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch leave balances'
      });
    }
  });

  // Set user leave balance (owners/admins only)
  fastify.post('/balances/set', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId: currentUserId, role } = request.user;
      const { userId, leaveTypeId, allocatedDays } = request.body as any;

      if (!['owner', 'admin'].includes(role)) {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can set leave balances'
        });
      }

      // Verify user and leave type belong to company
      const userCheck = await db.query(
        'SELECT id FROM users WHERE id = $1 AND company_id = $2',
        [userId, companyId]
      );

      const leaveTypeCheck = await db.query(
        'SELECT id FROM leave_types WHERE id = $1 AND company_id = $2',
        [leaveTypeId, companyId]
      );

      if (userCheck.rows.length === 0 || leaveTypeCheck.rows.length === 0) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid user or leave type'
        });
      }

      const year = new Date().getFullYear();

      // Upsert leave balance
      const result = await db.query(
        `INSERT INTO user_leave_balances (company_id, user_id, leave_type_id, allocated_days, remaining_days, year)
         VALUES ($1, $2, $3, $4, $4, $5)
         ON CONFLICT (company_id, user_id, leave_type_id, year)
         DO UPDATE SET 
           allocated_days = $4,
           remaining_days = $4 - EXCLUDED.used_days,
           updated_at = NOW()
         RETURNING *`,
        [companyId, userId, leaveTypeId, allocatedDays, year]
      );

      return reply.send({
        success: true,
        data: result.rows[0],
        message: 'Leave balance updated successfully'
      });

    } catch (error: any) {
      logger.error({ err: error, companyId: request.user?.companyId }, 'Failed to set leave balance');
      return reply.code(500).send({
        success: false,
        message: 'Failed to set leave balance'
      });
    }
  });
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

  // Department manager review (first level)
  fastify.post('/requests/:requestId/dept-review', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user;
      const { requestId } = request.params as any;
      const { approved, notes } = request.body as any;

      // Only department managers can do first level review
      if (role !== 'department_manager') {
        return reply.code(403).send({
          success: false,
          message: 'Only department managers can perform department-level reviews'
        });
      }

      // Get leave request and verify it's in manager's department
      const leaveResult = await db.query(
        `SELECT lr.*, u.department_id, u.first_name || ' ' || u.last_name as user_name
         FROM leave_requests lr
         JOIN users u ON lr.user_id = u.id
         WHERE lr.id = $1 AND lr.company_id = $2`,
        [requestId, companyId]
      );

      if (leaveResult.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'Leave request not found'
        });
      }

      const leaveRequest = leaveResult.rows[0];

      // Verify manager's department
      const managerCheck = await db.query(
        'SELECT department_id FROM users WHERE id = $1 AND company_id = $2',
        [userId, companyId]
      );

      if (managerCheck.rows[0]?.department_id !== leaveRequest.department_id) {
        return reply.code(403).send({
          success: false,
          message: 'You can only review leave requests from your department'
        });
      }

      if (leaveRequest.dept_manager_status !== null) {
        return reply.code(400).send({
          success: false,
          message: 'Leave request has already been reviewed at department level'
        });
      }

      const deptStatus = approved ? 'approved' : 'rejected';
      let finalStatus = leaveRequest.status;

      // If rejected at dept level, final status is rejected
      if (!approved) {
        finalStatus = 'rejected';
      }

      await db.query(
        `UPDATE leave_requests 
         SET dept_manager_status = $1, 
             dept_manager_reviewed_by = $2, 
             dept_manager_reviewed_at = NOW(), 
             dept_manager_notes = $3,
             status = $4
         WHERE id = $5`,
        [deptStatus, userId, notes, finalStatus, requestId]
      );

      return reply.send({
        success: true,
        message: `Leave request ${deptStatus} at department level`
      });

    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Failed to review leave request');
      return reply.code(500).send({
        success: false,
        message: 'Failed to review leave request'
      });
    }
  });

  // Final admin/owner review (second level)
  fastify.post('/requests/:requestId/final-review', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user;
      const { requestId } = request.params as any;
      const { approved, notes } = request.body as any;

      // Only owners and admins can do final review
      if (!['owner', 'admin'].includes(role)) {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can perform final reviews'
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

      // Check if department manager has approved (if applicable)
      if (leaveRequest.dept_manager_status === 'rejected') {
        return reply.code(400).send({
          success: false,
          message: 'Leave request was rejected at department level'
        });
      }

      if (leaveRequest.status === 'approved' || leaveRequest.status === 'rejected') {
        return reply.code(400).send({
          success: false,
          message: 'Leave request has already been finalized'
        });
      }

      const finalStatus = approved ? 'approved' : 'rejected';

      await db.query(
        `UPDATE leave_requests 
         SET status = $1, 
             final_reviewed_by = $2, 
             final_reviewed_at = NOW(), 
             final_review_notes = $3
         WHERE id = $4`,
        [finalStatus, userId, notes, requestId]
      );

      // Update leave balance if approved
      if (approved) {
        await db.query(
          `UPDATE user_leave_balances 
           SET used_days = used_days + $1,
               remaining_days = remaining_days - $1
           WHERE company_id = $2 AND user_id = $3 AND year = $4`,
          [leaveRequest.total_days, companyId, leaveRequest.user_id, new Date().getFullYear()]
        );
      }

      return reply.send({
        success: true,
        message: `Leave request ${finalStatus} successfully`
      });

    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Failed to finalize leave request');
      return reply.code(500).send({
        success: false,
        message: 'Failed to finalize leave request'
      });
    }
  });

  // Initialize default leave types for company (called during onboarding)
  fastify.post('/initialize-defaults', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, role } = request.user;

      if (!['owner', 'admin'].includes(role)) {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can initialize leave types'
        });
      }

      // Check if leave types already exist
      const existingTypes = await db.query(
        'SELECT COUNT(*) FROM leave_types WHERE company_id = $1',
        [companyId]
      );

      if (parseInt(existingTypes.rows[0].count) > 0) {
        return reply.send({
          success: true,
          message: 'Leave types already initialized'
        });
      }

      // Insert default leave types
      const defaultTypes = [
        { name: 'Annual Leave', code: 'ANNUAL', allocation: 21, color: '#0F5D5D' },
        { name: 'Sick Leave', code: 'SICK', allocation: 10, color: '#EF4444' },
        { name: 'Maternity Leave', code: 'MATERNITY', allocation: 90, color: '#8B5CF6' },
        { name: 'Paternity Leave', code: 'PATERNITY', allocation: 14, color: '#3B82F6' },
        { name: 'Compassionate Leave', code: 'COMPASSIONATE', allocation: 5, color: '#6B7280' }
      ];

      for (const type of defaultTypes) {
        await db.query(
          `INSERT INTO leave_types (company_id, name, code, annual_allocation, color)
           VALUES ($1, $2, $3, $4, $5)`,
          [companyId, type.name, type.code, type.allocation, type.color]
        );
      }

      return reply.send({
        success: true,
        message: 'Default leave types initialized successfully'
      });

    } catch (error: any) {
      logger.error({ err: error, companyId: request.user?.companyId }, 'Failed to initialize leave types');
      return reply.code(500).send({
        success: false,
        message: 'Failed to initialize leave types'
      });
    }
  });

  // Update leave type (owners/admins only)
  fastify.put('/types/:typeId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, role } = request.user;
      const { typeId } = request.params as any;
      const { name, code, annualAllocation, carryForwardLimit, color } = request.body as any;

      if (!['owner', 'admin'].includes(role)) {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can update leave types'
        });
      }

      if (!name || !code) {
        return reply.code(400).send({
          success: false,
          message: 'Name and code are required'
        });
      }

      // Check if leave type exists and belongs to company
      const existingType = await db.query(
        'SELECT id FROM leave_types WHERE id = $1 AND company_id = $2',
        [typeId, companyId]
      );

      if (existingType.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'Leave type not found'
        });
      }

      // Check for duplicate code (excluding current type)
      const duplicateCheck = await db.query(
        'SELECT id FROM leave_types WHERE code = $1 AND company_id = $2 AND id != $3',
        [code, companyId, typeId]
      );

      if (duplicateCheck.rows.length > 0) {
        return reply.code(400).send({
          success: false,
          message: 'Leave type code already exists'
        });
      }

      const result = await db.query(
        `UPDATE leave_types 
         SET name = $1, code = $2, annual_allocation = $3, 
             carry_forward_limit = $4, color = $5, updated_at = NOW()
         WHERE id = $6 AND company_id = $7
         RETURNING *`,
        [name, code, annualAllocation || 0, carryForwardLimit || 0, color || '#0F5D5D', typeId, companyId]
      );

      return reply.send({
        success: true,
        data: result.rows[0],
        message: 'Leave type updated successfully'
      });

    } catch (error: any) {
      logger.error({ err: error, companyId: request.user?.companyId }, 'Failed to update leave type');
      return reply.code(500).send({
        success: false,
        message: 'Failed to update leave type'
      });
    }
  });

  // Delete leave type (owners/admins only)
  fastify.delete('/types/:typeId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, role } = request.user;
      const { typeId } = request.params as any;

      if (!['owner', 'admin'].includes(role)) {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can delete leave types'
        });
      }

      // Check if leave type exists and belongs to company
      const existingType = await db.query(
        'SELECT id, name FROM leave_types WHERE id = $1 AND company_id = $2',
        [typeId, companyId]
      );

      if (existingType.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'Leave type not found'
        });
      }

      // Check if leave type is being used in any leave requests
      const usageCheck = await db.query(
        'SELECT COUNT(*) as count FROM leave_requests WHERE leave_type_id = $1',
        [typeId]
      );

      if (parseInt(usageCheck.rows[0].count) > 0) {
        return reply.code(400).send({
          success: false,
          message: 'Cannot delete leave type that is being used in leave requests. Consider deactivating it instead.'
        });
      }

      // Check if leave type is being used in any leave balances
      const balanceCheck = await db.query(
        'SELECT COUNT(*) as count FROM leave_balances WHERE leave_type_id = $1',
        [typeId]
      );

      if (parseInt(balanceCheck.rows[0].count) > 0) {
        // Soft delete by marking as inactive
        await db.query(
          'UPDATE leave_types SET is_active = false, updated_at = NOW() WHERE id = $1',
          [typeId]
        );

        return reply.send({
          success: true,
          message: 'Leave type deactivated successfully (has existing balances)'
        });
      } else {
        // Hard delete if no usage
        await db.query('DELETE FROM leave_types WHERE id = $1', [typeId]);

        return reply.send({
          success: true,
          message: 'Leave type deleted successfully'
        });
      }

    } catch (error: any) {
      logger.error({ err: error, companyId: request.user?.companyId }, 'Failed to delete leave type');
      return reply.code(500).send({
        success: false,
        message: 'Failed to delete leave type'
      });
    }
  });

  // Reset leave balance for employee (owners/admins only)
  fastify.post('/balances/:employeeId/reset', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, role } = request.user;
      const { employeeId } = request.params as any;
      const { leaveTypeId, newBalance } = request.body as any;

      if (!['owner', 'admin'].includes(role)) {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can reset leave balances'
        });
      }

      // Verify employee belongs to company
      const employeeCheck = await db.query(
        'SELECT id FROM users WHERE id = $1 AND company_id = $2',
        [employeeId, companyId]
      );

      if (employeeCheck.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'Employee not found'
        });
      }

      // Update or create leave balance
      await db.query(
        `INSERT INTO leave_balances (user_id, leave_type_id, allocated_days, used_days, remaining_days)
         VALUES ($1, $2, $3, 0, $3)
         ON CONFLICT (user_id, leave_type_id)
         DO UPDATE SET 
           allocated_days = $3,
           remaining_days = $3 - used_days,
           updated_at = NOW()`,
        [employeeId, leaveTypeId, newBalance]
      );

      return reply.send({
        success: true,
        message: 'Leave balance reset successfully'
      });

    } catch (error: any) {
      logger.error({ err: error, companyId: request.user?.companyId }, 'Failed to reset leave balance');
      return reply.code(500).send({
        success: false,
        message: 'Failed to reset leave balance'
      });
    }
  });
}