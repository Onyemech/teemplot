import { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';

export default async function dashboardRoutes(fastify: FastifyInstance) {
  const db = DatabaseFactory.getPrimaryDatabase();
  // Owner/Admin Dashboard Stats
  fastify.get('/stats', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, role } = request.user;

      // Only owners and admins can access this
      if (role !== 'owner' && role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Access denied'
        });
      }

      // Get total employees
      const totalEmployeesResult = await db.query(
        'SELECT COUNT(*) as count FROM users WHERE company_id = $1 AND is_active = true',
        [companyId]
      );
      const totalEmployees = parseInt(totalEmployeesResult.rows[0].count);

      // Get active employees (logged in within last 30 days)
      const activeEmployeesResult = await db.query(
        `SELECT COUNT(*) as count FROM users 
         WHERE company_id = $1 AND is_active = true 
         AND last_login_at > NOW() - INTERVAL '30 days'`,
        [companyId]
      );
      const activeEmployees = parseInt(activeEmployeesResult.rows[0].count);

      // Get today's attendance stats
      const today = new Date().toISOString().split('T')[0];
      const attendanceStatsResult = await db.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'present') as present,
          COUNT(*) FILTER (WHERE status = 'absent') as absent,
          COUNT(*) FILTER (WHERE status = 'late') as late
         FROM attendance_records 
         WHERE company_id = $1 AND DATE(clock_in_time) = $2`,
        [companyId, today]
      );
      const attendanceStats = attendanceStatsResult.rows[0];

      // Get employees on leave today
      const onLeaveResult = await db.query(
        `SELECT COUNT(DISTINCT user_id) as count 
         FROM leave_requests 
         WHERE company_id = $1 
         AND status = 'approved' 
         AND start_date <= CURRENT_DATE 
         AND end_date >= CURRENT_DATE`,
        [companyId]
      );
      const onLeave = parseInt(onLeaveResult.rows[0].count);

      // Get task stats
      const taskStatsResult = await db.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress')) as pending,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE review_status = 'pending_review') as awaiting_review
         FROM tasks 
         WHERE company_id = $1`,
        [companyId]
      );
      const taskStats = taskStatsResult.rows[0];

      // Get pending leave requests
      const pendingLeaveResult = await db.query(
        'SELECT COUNT(*) as count FROM leave_requests WHERE company_id = $1 AND status = \'pending\'',
        [companyId]
      );
      const pendingLeaveRequests = parseInt(pendingLeaveResult.rows[0].count);

      // Calculate average attendance rate (last 30 days)
      const attendanceRateResult = await db.query(
        `SELECT 
          ROUND(
            (COUNT(*) FILTER (WHERE status = 'present' OR status = 'late')::numeric / 
            NULLIF(COUNT(*)::numeric, 0)) * 100, 
            1
          ) as rate
         FROM attendance_records 
         WHERE company_id = $1 
         AND clock_in_time > NOW() - INTERVAL '30 days'`,
        [companyId]
      );
      const averageAttendanceRate = parseFloat(attendanceRateResult.rows[0].rate || '0');

      // Calculate average task completion rate
      const taskCompletionResult = await db.query(
        `SELECT 
          ROUND(
            (COUNT(*) FILTER (WHERE status = 'completed')::numeric / 
            NULLIF(COUNT(*)::numeric, 0)) * 100, 
            1
          ) as rate
         FROM tasks 
         WHERE company_id = $1 
         AND created_at > NOW() - INTERVAL '30 days'`,
        [companyId]
      );
      const averageTaskCompletionRate = parseFloat(taskCompletionResult.rows[0].rate || '0');

      // Get trial info
      const companyResult = await db.query(
        'SELECT trial_end_date, subscription_plan FROM companies WHERE id = $1',
        [companyId]
      );
      const company = companyResult.rows[0];
      
      let trialDaysLeft = null;
      if (company.trial_end_date) {
        const trialEnd = new Date(company.trial_end_date);
        const now = new Date();
        const diffTime = trialEnd.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        trialDaysLeft = diffDays > 0 ? diffDays : 0;
      }

      return reply.send({
        success: true,
        data: {
          totalEmployees,
          activeEmployees,
          presentToday: parseInt(attendanceStats.present || '0'),
          absentToday: parseInt(attendanceStats.absent || '0'),
          lateToday: parseInt(attendanceStats.late || '0'),
          onLeave,
          pendingTasks: parseInt(taskStats.pending || '0'),
          completedTasks: parseInt(taskStats.completed || '0'),
          pendingLeaveRequests,
          pendingTaskReviews: parseInt(taskStats.awaiting_review || '0'),
          averageAttendanceRate,
          averageTaskCompletionRate,
          trialDaysLeft
        }
      });

    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Failed to fetch dashboard stats');
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch dashboard statistics'
      });
    }
  });

  // Recent Activity
  fastify.get('/recent-activity', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, role } = request.user;

      // Only owners and admins can access this
      if (role !== 'owner' && role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Access denied'
        });
      }

      // Get recent activity from audit logs
      const activityResult = await db.query(
        `SELECT 
          al.id,
          al.action,
          al.entity_type,
          al.created_at,
          u.first_name || ' ' || u.last_name as user_name
         FROM audit_logs al
         JOIN users u ON al.user_id = u.id
         WHERE al.company_id = $1
         ORDER BY al.created_at DESC
         LIMIT 20`,
        [companyId]
      );

      const activities = activityResult.rows.map(row => {
        let type: 'attendance' | 'task' | 'leave' | 'alert' = 'alert';
        let message = '';

        if (row.entity_type === 'attendance') {
          type = 'attendance';
          if (row.action === 'clock_in') {
            message = `${row.user_name} clocked in`;
          } else if (row.action === 'clock_out') {
            message = `${row.user_name} clocked out`;
          } else if (row.action === 'early_departure') {
            message = `${row.user_name} left early`;
            type = 'alert';
          }
        } else if (row.entity_type === 'task') {
          type = 'task';
          if (row.action === 'created') {
            message = `New task assigned to ${row.user_name}`;
          } else if (row.action === 'completed') {
            message = `${row.user_name} completed a task`;
          } else if (row.action === 'marked_complete') {
            message = `${row.user_name} marked task as complete`;
          }
        } else if (row.entity_type === 'leave') {
          type = 'leave';
          if (row.action === 'requested') {
            message = `${row.user_name} requested leave`;
          } else if (row.action === 'approved') {
            message = `Leave request approved for ${row.user_name}`;
          } else if (row.action === 'rejected') {
            message = `Leave request rejected for ${row.user_name}`;
          }
        }

        return {
          id: row.id,
          type,
          message,
          timestamp: new Date(row.created_at).toLocaleString(),
          user: row.user_name
        };
      });

      return reply.send({
        success: true,
        data: activities
      });

    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Failed to fetch recent activity');
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch recent activity'
      });
    }
  });

  // Employee Dashboard Stats
  fastify.get('/employee-stats', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { userId, companyId } = request.user;

      // Get my tasks
      const tasksResult = await db.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
          COUNT(*) FILTER (WHERE review_status = 'pending_review') as awaiting_review,
          COUNT(*) FILTER (WHERE status = 'completed') as completed
         FROM tasks 
         WHERE assigned_to = $1 AND company_id = $2`,
        [userId, companyId]
      );
      const myTasks = tasksResult.rows[0];

      // Get attendance stats (last 30 days)
      const attendanceResult = await db.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'present' OR status = 'late') as present,
          COUNT(*) FILTER (WHERE status = 'absent') as absent,
          COUNT(*) FILTER (WHERE status = 'late') as late,
          ROUND(
            (COUNT(*) FILTER (WHERE status = 'present' OR status = 'late')::numeric / 
            NULLIF(COUNT(*)::numeric, 0)) * 100, 
            1
          ) as rate
         FROM attendance_records 
         WHERE user_id = $1 
         AND clock_in_time > NOW() - INTERVAL '30 days'`,
        [userId]
      );
      const attendance = attendanceResult.rows[0];

      // Get leave balance
      const leaveResult = await db.query(
        `SELECT 
          COALESCE(annual_leave_balance, 0) as available,
          COALESCE(annual_leave_used, 0) as used
         FROM users 
         WHERE id = $1`,
        [userId]
      );
      const leave = leaveResult.rows[0];

      // Get pending leave requests
      const pendingLeaveResult = await db.query(
        'SELECT COUNT(*) as count FROM leave_requests WHERE user_id = $1 AND status = \'pending\'',
        [userId]
      );
      const pendingLeave = parseInt(pendingLeaveResult.rows[0].count);

      // Get performance metrics
      const performanceResult = await db.query(
        `SELECT 
          COALESCE(AVG(rating), 0) as avg_rating,
          COALESCE(SUM(points), 0) as total_points,
          ROUND(
            (COUNT(*) FILTER (WHERE status = 'completed')::numeric / 
            NULLIF(COUNT(*)::numeric, 0)) * 100, 
            1
          ) as completion_rate
         FROM tasks 
         WHERE assigned_to = $1 
         AND created_at > NOW() - INTERVAL '30 days'`,
        [userId]
      );
      const performance = performanceResult.rows[0];

      return reply.send({
        success: true,
        data: {
          myTasks: {
            pending: parseInt(myTasks.pending || '0'),
            inProgress: parseInt(myTasks.in_progress || '0'),
            awaitingReview: parseInt(myTasks.awaiting_review || '0'),
            completed: parseInt(myTasks.completed || '0')
          },
          attendance: {
            presentDays: parseInt(attendance.present || '0'),
            absentDays: parseInt(attendance.absent || '0'),
            lateDays: parseInt(attendance.late || '0'),
            attendanceRate: parseFloat(attendance.rate || '0')
          },
          leave: {
            available: parseInt(leave.available || '0'),
            used: parseInt(leave.used || '0'),
            pending: pendingLeave
          },
          performance: {
            taskCompletionRate: parseFloat(performance.completion_rate || '0'),
            averageRating: parseFloat(performance.avg_rating || '0'),
            totalPoints: parseInt(performance.total_points || '0')
          }
        }
      });

    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Failed to fetch employee stats');
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch employee statistics'
      });
    }
  });
}
