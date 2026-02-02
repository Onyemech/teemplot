import { pool, transaction } from '../config/database';
import { logger } from '../utils/logger';

export interface TaskReviewData {
  taskId: string;
  reviewerId: string;
  approved: boolean;
  reviewNotes?: string;
  rejectionReason?: string;
}

export interface TaskCompletionData {
  taskId: string;
  userId: string;
  actualHours?: number;
  completionNotes?: string;
}

export class TaskReviewService {
  /**
   * Mark task as complete by staff member
   * Status changes to 'awaiting_review'
   */
  async markTaskComplete(data: TaskCompletionData): Promise<any> {
    return transaction(async (client) => {
      // Verify task exists and is assigned to user
      const taskQuery = `
        SELECT id, company_id, assigned_to, status
        FROM tasks
        WHERE id = $1 AND deleted_at IS NULL
      `;
      
      const taskResult = await client.query(taskQuery, [data.taskId]);
      
      if (taskResult.rows.length === 0) {
        throw new Error('Task not found');
      }

      const task = taskResult.rows[0];

      if (task.assigned_to !== data.userId) {
        throw new Error('Task not assigned to this user');
      }

      if (task.status === 'completed' || task.status === 'approved') {
        throw new Error('Task already completed');
      }

      // Update task to awaiting review
      const updateQuery = `
        UPDATE tasks
        SET 
          status = 'awaiting_review',
          review_status = 'pending_review',
          marked_complete_at = NOW(),
          marked_complete_by = $2,
          actual_hours = COALESCE($3, actual_hours),
          metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{completion_notes}',
            to_jsonb($4::text)
          ),
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;

      const result = await client.query(updateQuery, [
        data.taskId,
        data.userId,
        data.actualHours,
        data.completionNotes || ''
      ]);

      // Create audit log
      await this.createAuditLog(client, {
        companyId: task.company_id,
        userId: data.userId,
        action: 'TASK_MARKED_COMPLETE',
        entityType: 'task',
        entityId: data.taskId,
        metadata: {
          status: { from: task.status, to: 'awaiting_review' },
          actualHours: data.actualHours,
          completionNotes: data.completionNotes
        }
      });

      logger.info(`Task ${data.taskId} marked complete by user ${data.userId}`);

      return result.rows[0];
    });
  }

  /**
   * Review and approve/reject task completion
   * Only admins can review tasks
   */
  async reviewTask(data: TaskReviewData): Promise<any> {
    return transaction(async (client) => {
      // Verify reviewer is admin
      const reviewerQuery = `
        SELECT id, company_id, role
        FROM users
        WHERE id = $1 AND deleted_at IS NULL
      `;
      
      const reviewerResult = await client.query(reviewerQuery, [data.reviewerId]);
      
      if (reviewerResult.rows.length === 0) {
        throw new Error('Reviewer not found');
      }

      const reviewer = reviewerResult.rows[0];

      if (reviewer.role !== 'admin') {
        throw new Error('Only admins can review tasks');
      }

      // Get task
      const taskQuery = `
        SELECT t.id, t.company_id, t.assigned_to, t.status, t.review_status,
               u.first_name || ' ' || u.last_name as assigned_to_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        WHERE t.id = $1 AND t.deleted_at IS NULL
      `;
      
      const taskResult = await client.query(taskQuery, [data.taskId]);
      
      if (taskResult.rows.length === 0) {
        throw new Error('Task not found');
      }

      const task = taskResult.rows[0];

      // Verify task belongs to same company
      if (task.company_id !== reviewer.company_id) {
        throw new Error('Task does not belong to reviewer company');
      }

      if (task.review_status !== 'pending_review') {
        throw new Error('Task is not awaiting review');
      }

      // Update task based on review decision
      const newStatus = data.approved ? 'approved' : 'rejected';
      const taskStatus = data.approved ? 'completed' : 'in_progress';

      const updateQuery = `
        UPDATE tasks
        SET 
          status = $2,
          review_status = $3,
          reviewed_at = NOW(),
          reviewed_by = $4,
          review_notes = $5,
          rejection_reason = $6,
          completed_at = CASE WHEN $3 = 'approved' THEN NOW() ELSE NULL END,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;

      const result = await client.query(updateQuery, [
        data.taskId,
        taskStatus,
        newStatus,
        data.reviewerId,
        data.reviewNotes,
        data.rejectionReason
      ]);

      // Create audit log
      await this.createAuditLog(client, {
        companyId: task.company_id,
        userId: data.reviewerId,
        action: data.approved ? 'TASK_APPROVED' : 'TASK_REJECTED',
        entityType: 'task',
        entityId: data.taskId,
        metadata: {
          reviewStatus: { from: 'pending_review', to: newStatus },
          status: { from: task.status, to: taskStatus },
          reviewNotes: data.reviewNotes,
          rejectionReason: data.rejectionReason,
          assignedTo: task.assigned_to,
          assignedToName: task.assigned_to_name
        }
      });

      // Notify assigned user
      await this.notifyTaskReview(client, {
        taskId: data.taskId,
        userId: task.assigned_to,
        approved: data.approved,
        reviewNotes: data.reviewNotes,
        rejectionReason: data.rejectionReason
      });

      logger.info(`Task ${data.taskId} ${data.approved ? 'approved' : 'rejected'} by admin ${data.reviewerId}`);

      return result.rows[0];
    });
  }

  /**
   * Get tasks awaiting review for a company
   */
  async getTasksAwaitingReview(companyId: string, adminId: string): Promise<any[]> {
    // Verify admin
    const adminQuery = `
      SELECT id, role
      FROM users
      WHERE id = $1 AND company_id = $2 AND role = 'admin' AND deleted_at IS NULL
    `;
    
    const adminResult = await pool.query(adminQuery, [adminId, companyId]);
    
    if (adminResult.rows.length === 0) {
      throw new Error('Admin not found or unauthorized');
    }

    const query = `
      SELECT 
        t.*,
        u.first_name || ' ' || u.last_name as assigned_to_name,
        u.email as assigned_to_email,
        d.name as department_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE t.company_id = $1
        AND t.review_status = 'pending_review'
        AND t.status = 'awaiting_review'
        AND t.deleted_at IS NULL
      ORDER BY t.marked_complete_at ASC
    `;

    const result = await pool.query(query, [companyId]);
    return result.rows;
  }

  /**
   * Get task review history
   */
  async getTaskReviewHistory(taskId: string): Promise<any[]> {
    const query = `
      SELECT 
        al.*,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.entity_type = 'task'
        AND al.entity_id = $1
        AND al.action IN ('TASK_MARKED_COMPLETE', 'TASK_APPROVED', 'TASK_REJECTED')
      ORDER BY al.created_at DESC
    `;

    const result = await pool.query(query, [taskId]);
    return result.rows;
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(client: any, data: {
    companyId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata: any;
  }): Promise<void> {
    const query = `
      INSERT INTO audit_logs (
        company_id,
        user_id,
        action,
        entity_type,
        entity_id,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await client.query(query, [
      data.companyId,
      data.userId,
      data.action,
      data.entityType,
      data.entityId,
      JSON.stringify(data.metadata)
    ]);
  }

  /**
   * Notify user about task review
   * This can be extended to send email/push notifications
   */
  private async notifyTaskReview(client: any, data: {
    taskId: string;
    userId: string;
    approved: boolean;
    reviewNotes?: string;
    rejectionReason?: string;
  }): Promise<void> {
    // TODO: Implement notification system (email, push, in-app)
    logger.info(`Notification: Task ${data.taskId} ${data.approved ? 'approved' : 'rejected'} for user ${data.userId}`);
    
    // Placeholder for future notification implementation
    // await emailService.sendTaskReviewNotification(...)
    // await pushNotificationService.send(...)
  }

  /**
   * Get task review statistics for a company
   */
  async getReviewStatistics(companyId: string, startDate?: Date, endDate?: Date): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE review_status = 'pending_review') as pending_reviews,
        COUNT(*) FILTER (WHERE review_status = 'approved') as approved_tasks,
        COUNT(*) FILTER (WHERE review_status = 'rejected') as rejected_tasks,
        AVG(
          EXTRACT(EPOCH FROM (reviewed_at - marked_complete_at)) / 3600
        ) FILTER (WHERE reviewed_at IS NOT NULL) as avg_review_time_hours
      FROM tasks
      WHERE company_id = $1
        AND deleted_at IS NULL
        ${startDate ? 'AND created_at >= $2' : ''}
        ${endDate ? 'AND created_at <= $3' : ''}
    `;

    const params: (string | Date)[] = [companyId];
    if (startDate) params.push(startDate);
    if (endDate) params.push(endDate);

    const result = await pool.query(query, params);
    return result.rows[0];
  }
}

export const taskReviewService = new TaskReviewService();
