import { FastifyInstance } from 'fastify';
import { query } from '../config/database';
import { logger } from '../utils/logger';

export default async function managersRoutes(fastify: FastifyInstance) {
  // Get manager dashboard stats
  fastify.get('/dashboard-stats', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user;

      // Only managers, admins, and owners can access this
      if (!['manager', 'department_manager', 'admin', 'owner'].includes(role)) {
        return reply.code(403).send({
          success: false,
          message: 'Access denied. Manager role required.'
        });
      }

      // Get department employees for department managers
      let departmentFilter = '';
      let departmentParams: any[] = [companyId];
      
      if (role === 'department_manager') {
        // Get manager's department
        const managerDept = await query(
          `SELECT department_id FROM users WHERE id = $1`,
          [userId]
        );
        
        if (managerDept.rows.length > 0 && managerDept.rows[0].department_id) {
          departmentFilter = 'AND u.department_id = $2';
          departmentParams.push(managerDept.rows[0].department_id);
        }
      }

      // Get total employees under management
      const employeesResult = await query(
        `SELECT COUNT(*) as total
         FROM users u
         WHERE u.company_id = $1 
           AND u.role IN ('employee', 'department_manager')
           AND u.is_active = true
           ${departmentFilter}`,
        departmentParams
      );

      // Get pending leave requests
      const leaveRequestsResult = await query(
        `SELECT COUNT(*) as total
         FROM leave_requests lr
         JOIN users u ON lr.user_id = u.id
         WHERE u.company_id = $1 
           AND lr.status = 'pending'
           ${departmentFilter.replace('u.department_id', 'u.department_id')}`,
        departmentParams
      );

      // Get pending tasks (if company has tasks feature)
      const tasksResult = await query(
        `SELECT COUNT(*) as total
         FROM task_assignments ta
         JOIN users u ON ta.assigned_to = u.id
         WHERE u.company_id = $1 
           AND ta.status = 'pending'
           ${departmentFilter.replace('u.department_id', 'u.department_id')}`,
        departmentParams
      );

      // Get today's attendance
      const today = new Date().toISOString().split('T')[0];
      const attendanceResult = await query(
        `SELECT 
           COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present,
           COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late,
           COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent
         FROM attendance a
         JOIN users u ON a.user_id = u.id
         WHERE u.company_id = $1 
           AND DATE(a.clock_in_time) = $2
           ${departmentFilter.replace('u.department_id', 'u.department_id')}`,
        [...departmentParams, today]
      );

      const stats = {
        totalEmployees: parseInt(employeesResult.rows[0].total),
        pendingLeaveRequests: parseInt(leaveRequestsResult.rows[0].total),
        pendingTasks: parseInt(tasksResult.rows[0].total),
        attendanceToday: {
          present: parseInt(attendanceResult.rows[0].present || 0),
          late: parseInt(attendanceResult.rows[0].late || 0),
          absent: parseInt(attendanceResult.rows[0].absent || 0)
        }
      };

      return reply.code(200).send({
        success: true,
        data: stats,
        message: 'Dashboard stats retrieved successfully'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Failed to get manager dashboard stats');
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve dashboard stats'
      });
    }
  });

  // Get leave requests for approval
  fastify.get('/leave-requests', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user;

      if (!['manager', 'department_manager', 'admin', 'owner'].includes(role)) {
        return reply.code(403).send({
          success: false,
          message: 'Access denied. Manager role required.'
        });
      }

      let departmentFilter = '';
      let departmentParams: any[] = [companyId];
      
      if (role === 'department_manager') {
        const managerDept = await query(
          `SELECT department_id FROM users WHERE id = $1`,
          [userId]
        );
        
        if (managerDept.rows.length > 0 && managerDept.rows[0].department_id) {
          departmentFilter = 'AND u.department_id = $2';
          departmentParams.push(managerDept.rows[0].department_id);
        }
      }

      const result = await query(
        `SELECT 
           lr.id,
           CONCAT(u.first_name, ' ', u.last_name) as "employeeName",
           lr.leave_type as "leaveType",
           lr.start_date as "startDate",
           lr.end_date as "endDate",
           lr.reason,
           lr.status,
           lr.days_requested as days,
           lr.created_at as "requestDate"
         FROM leave_requests lr
         JOIN users u ON lr.user_id = u.id
         WHERE u.company_id = $1 
           ${departmentFilter}
         ORDER BY lr.created_at DESC
         LIMIT 50`,
        departmentParams
      );

      return reply.code(200).send({
        success: true,
        data: result.rows,
        message: 'Leave requests retrieved successfully'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Failed to get leave requests');
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve leave requests'
      });
    }
  });

  // Update leave request status
  fastify.patch('/leave-requests/:requestId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user;
      const { requestId } = request.params as { requestId: string };
      const { status } = request.body as { status: 'approved' | 'rejected' };

      if (!['manager', 'department_manager', 'admin', 'owner'].includes(role)) {
        return reply.code(403).send({
          success: false,
          message: 'Access denied. Manager role required.'
        });
      }

      if (!['approved', 'rejected'].includes(status)) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid status. Must be approved or rejected.'
        });
      }

      // Verify the leave request belongs to the manager's department (for department managers)
      let departmentCheck = '';
      let checkParams: any[] = [requestId, companyId];
      
      if (role === 'department_manager') {
        const managerDept = await query(
          `SELECT department_id FROM users WHERE id = $1`,
          [userId]
        );
        
        if (managerDept.rows.length > 0 && managerDept.rows[0].department_id) {
          departmentCheck = 'AND u.department_id = $3';
          checkParams.push(managerDept.rows[0].department_id);
        }
      }

      const leaveRequest = await query(
        `SELECT lr.*, u.first_name, u.last_name, u.id as user_id
         FROM leave_requests lr
         JOIN users u ON lr.user_id = u.id
         WHERE lr.id = $1 AND u.company_id = $2 ${departmentCheck}`,
        checkParams
      );

      if (leaveRequest.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'Leave request not found or access denied'
        });
      }

      // Update leave request status
      const result = await query(
        `UPDATE leave_requests 
         SET status = $1, 
             reviewed_by = $2, 
             reviewed_at = NOW(),
             updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [status, userId, requestId]
      );

      // If approved, update employee leave balance
      if (status === 'approved') {
        await query(
          `UPDATE users 
           SET leave_balance = GREATEST(0, leave_balance - $1)
           WHERE id = $2`,
          [leaveRequest.rows[0].days_requested, leaveRequest.rows[0].user_id]
        );
      }

      logger.info({
        managerId: userId,
        requestId,
        status,
        employeeId: leaveRequest.rows[0].user_id
      }, 'Leave request status updated');

      return reply.code(200).send({
        success: true,
        data: result.rows[0],
        message: `Leave request ${status} successfully`
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Failed to update leave request');
      return reply.code(500).send({
        success: false,
        message: 'Failed to update leave request'
      });
    }
  });

  // Get task assignments (Gold plan feature)
  fastify.get('/task-assignments', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user;

      if (!['manager', 'department_manager', 'admin', 'owner'].includes(role)) {
        return reply.code(403).send({
          success: false,
          message: 'Access denied. Manager role required.'
        });
      }

      let departmentFilter = '';
      let departmentParams: any[] = [companyId];
      
      if (role === 'department_manager') {
        const managerDept = await query(
          `SELECT department_id FROM users WHERE id = $1`,
          [userId]
        );
        
        if (managerDept.rows.length > 0 && managerDept.rows[0].department_id) {
          departmentFilter = 'AND u.department_id = $2';
          departmentParams.push(managerDept.rows[0].department_id);
        }
      }

      const result = await query(
        `SELECT 
           ta.id,
           CONCAT(u.first_name, ' ', u.last_name) as "employeeName",
           ta.title,
           ta.description,
           ta.due_date as "dueDate",
           ta.priority,
           ta.status,
           ta.created_at as "assignedDate"
         FROM task_assignments ta
         JOIN users u ON ta.assigned_to = u.id
         WHERE u.company_id = $1 
           ${departmentFilter}
         ORDER BY ta.created_at DESC
         LIMIT 50`,
        departmentParams
      );

      return reply.code(200).send({
        success: true,
        data: result.rows,
        message: 'Task assignments retrieved successfully'
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Failed to get task assignments');
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve task assignments'
      });
    }
  });

  // Update task status
  fastify.patch('/tasks/:taskId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user;
      const { taskId } = request.params as { taskId: string };
      const { status } = request.body as { status: 'in_progress' | 'completed' };

      if (!['manager', 'department_manager', 'admin', 'owner'].includes(role)) {
        return reply.code(403).send({
          success: false,
          message: 'Access denied. Manager role required.'
        });
      }

      if (!['in_progress', 'completed'].includes(status)) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid status. Must be in_progress or completed.'
        });
      }

      // Verify task belongs to manager's department
      let departmentCheck = '';
      let checkParams: any[] = [taskId, companyId];
      
      if (role === 'department_manager') {
        const managerDept = await query(
          `SELECT department_id FROM users WHERE id = $1`,
          [userId]
        );
        
        if (managerDept.rows.length > 0 && managerDept.rows[0].department_id) {
          departmentCheck = 'AND u.department_id = $3';
          checkParams.push(managerDept.rows[0].department_id);
        }
      }

      const task = await query(
        `SELECT ta.* 
         FROM task_assignments ta
         JOIN users u ON ta.assigned_to = u.id
         WHERE ta.id = $1 AND u.company_id = $2 ${departmentCheck}`,
        checkParams
      );

      if (task.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'Task not found or access denied'
        });
      }

      const result = await query(
        `UPDATE task_assignments 
         SET status = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [status, taskId]
      );

      logger.info({
        managerId: userId,
        taskId,
        status
      }, 'Task status updated');

      return reply.code(200).send({
        success: true,
        data: result.rows[0],
        message: `Task ${status.replace('_', ' ')} successfully`
      });
    } catch (error: any) {
      logger.error({ error, userId: request.user.userId }, 'Failed to update task');
      return reply.code(500).send({
        success: false,
        message: 'Failed to update task'
      });
    }
  });
}