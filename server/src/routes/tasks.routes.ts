import { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';

export default async function tasksRoutes(fastify: FastifyInstance) {
  const db = DatabaseFactory.getPrimaryDatabase();
  // Create task
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user;
      const {
        title,
        description,
        assignedTo,
        priority,
        dueDate,
        estimatedHours,
        tags
      } = request.body as any;

      // Only owners and admins can create tasks
      if (role !== 'owner' && role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can create tasks'
        });
      }

      // Validate required fields
      if (!title || !assignedTo) {
        return reply.code(400).send({
          success: false,
          message: 'Title and assigned user are required'
        });
      }

      // Verify assigned user exists and belongs to company
      const userCheck = await db.query(
        'SELECT id FROM users WHERE id = $1 AND company_id = $2 AND is_active = true',
        [assignedTo, companyId]
      );

      if (userCheck.rows.length === 0) {
        return reply.code(400).send({
          success: false,
          message: 'Assigned user not found or not active'
        });
      }

      // Create task
      const result = await db.query(
        `INSERT INTO tasks (
          company_id, title, description, assigned_to, created_by,
          priority, due_date, estimated_hours, tags, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
        RETURNING *`,
        [
          companyId,
          title,
          description,
          assignedTo,
          userId,
          priority || 'medium',
          dueDate,
          estimatedHours,
          tags ? JSON.stringify(tags) : null
        ]
      );

      const task = result.rows[0];

      // Log action
      await db.query(
        `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, 'created', 'task', $3, $4)`,
        [companyId, userId, task.id, JSON.stringify({ title, assignedTo })]
      );

      logger.info({ taskId: task.id, assignedTo, createdBy: userId }, 'Task created');

      return reply.code(201).send({
        success: true,
        data: task,
        message: 'Task created successfully'
      });

    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Failed to create task');
      return reply.code(500).send({
        success: false,
        message: 'Failed to create task'
      });
    }
  });

  // Get all tasks (with filters)
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user;
      const { status, assignedTo, priority, page = 1, limit = 20 } = request.query as any;

      let query = `
        SELECT 
          t.*,
          u.first_name || ' ' || u.last_name as assigned_to_name,
          c.first_name || ' ' || c.last_name as created_by_name
        FROM tasks t
        JOIN users u ON t.assigned_to = u.id
        JOIN users c ON t.created_by = c.id
        WHERE t.company_id = $1
      `;
      const params: any[] = [companyId];
      let paramIndex = 2;

      // If employee, only show their tasks
      if (role === 'employee') {
        query += ` AND t.assigned_to = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }

      // Apply filters
      if (status) {
        query += ` AND t.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (assignedTo && (role === 'owner' || role === 'admin')) {
        query += ` AND t.assigned_to = $${paramIndex}`;
        params.push(assignedTo);
        paramIndex++;
      }

      if (priority) {
        query += ` AND t.priority = $${paramIndex}`;
        params.push(priority);
        paramIndex++;
      }

      query += ' ORDER BY t.created_at DESC';

      // Pagination
      const offset = (page - 1) * limit;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await db.query(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM tasks WHERE company_id = $1';
      const countParams: any[] = [companyId];
      
      if (role === 'employee') {
        countQuery += ' AND assigned_to = $2';
        countParams.push(userId);
      }

      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      return reply.send({
        success: true,
        data: {
          tasks: result.rows,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Failed to fetch tasks');
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch tasks'
      });
    }
  });

  // Get single task
  fastify.get('/:taskId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user;
      const { taskId } = request.params as any;

      const result = await db.query(
        `SELECT 
          t.*,
          u.first_name || ' ' || u.last_name as assigned_to_name,
          c.first_name || ' ' || c.last_name as created_by_name
         FROM tasks t
         JOIN users u ON t.assigned_to = u.id
         JOIN users c ON t.created_by = c.id
         WHERE t.id = $1 AND t.company_id = $2`,
        [taskId, companyId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'Task not found'
        });
      }

      const task = result.rows[0];

      // Employees can only view their own tasks
      if (role === 'employee' && task.assigned_to !== userId) {
        return reply.code(403).send({
          success: false,
          message: 'Access denied'
        });
      }

      return reply.send({
        success: true,
        data: task
      });

    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Failed to fetch task');
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch task'
      });
    }
  });

  // Update task
  fastify.put('/:taskId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user;
      const { taskId } = request.params as any;
      const updates = request.body as any;

      // Only owners and admins can update tasks
      if (role !== 'owner' && role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can update tasks'
        });
      }

      // Build update query
      const allowedFields = ['title', 'description', 'priority', 'due_date', 'estimated_hours', 'tags', 'status'];
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateFields.push(`${field} = $${paramIndex}`);
          values.push(field === 'tags' ? JSON.stringify(updates[field]) : updates[field]);
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        return reply.code(400).send({
          success: false,
          message: 'No valid fields to update'
        });
      }

      values.push(taskId, companyId);

      const result = await db.query(
        `UPDATE tasks 
         SET ${updateFields.join(', ')}, updated_at = NOW()
         WHERE id = $${paramIndex} AND company_id = $${paramIndex + 1}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'Task not found'
        });
      }

      // Log action
      await db.query(
        `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, 'updated', 'task', $3, $4)`,
        [companyId, userId, taskId, JSON.stringify(updates)]
      );

      return reply.send({
        success: true,
        data: result.rows[0],
        message: 'Task updated successfully'
      });

    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Failed to update task');
      return reply.code(500).send({
        success: false,
        message: 'Failed to update task'
      });
    }
  });

  // Mark task as complete (by employee)
  fastify.post('/:taskId/complete', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId } = request.user;
      const { taskId } = request.params as any;
      const { actualHours, completionNotes } = request.body as any;

      // Get task
      const taskResult = await db.query(
        'SELECT * FROM tasks WHERE id = $1 AND company_id = $2',
        [taskId, companyId]
      );

      if (taskResult.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'Task not found'
        });
      }

      const task = taskResult.rows[0];

      // Only assigned user can mark as complete
      if (task.assigned_to !== userId) {
        return reply.code(403).send({
          success: false,
          message: 'Only the assigned user can mark this task as complete'
        });
      }

      // Update task
      const result = await db.query(
        `UPDATE tasks 
         SET status = 'awaiting_review',
             review_status = 'pending_review',
             marked_complete_at = NOW(),
             marked_complete_by = $1,
             actual_hours = $2,
             metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('completion_notes', $3)
         WHERE id = $4
         RETURNING *`,
        [userId, actualHours, completionNotes, taskId]
      );

      // Log action
      await db.query(
        `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, 'marked_complete', 'task', $3, $4)`,
        [companyId, userId, taskId, JSON.stringify({ actualHours, completionNotes })]
      );

      logger.info({ taskId, userId }, 'Task marked as complete');

      return reply.send({
        success: true,
        data: result.rows[0],
        message: 'Task marked as complete and sent for review'
      });

    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Failed to mark task complete');
      return reply.code(500).send({
        success: false,
        message: 'Failed to mark task as complete'
      });
    }
  });

  // Review task (by owner/admin)
  fastify.post('/:taskId/review', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user;
      const { taskId } = request.params as any;
      const { approved, reviewNotes, rejectionReason } = request.body as any;

      // Only owners and admins can review
      if (role !== 'owner' && role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can review tasks'
        });
      }

      // Get task
      const taskResult = await db.query(
        'SELECT * FROM tasks WHERE id = $1 AND company_id = $2',
        [taskId, companyId]
      );

      if (taskResult.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'Task not found'
        });
      }

      const task = taskResult.rows[0];

      if (task.review_status !== 'pending_review') {
        return reply.code(400).send({
          success: false,
          message: 'Task is not awaiting review'
        });
      }

      let newStatus: string;
      let reviewStatus: string;

      if (approved) {
        newStatus = 'completed';
        reviewStatus = 'approved';
      } else {
        newStatus = 'in_progress';
        reviewStatus = 'rejected';
      }

      // Update task
      const result = await db.query(
        `UPDATE tasks 
         SET status = $1,
             review_status = $2,
             reviewed_at = NOW(),
             reviewed_by = $3,
             completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE NULL END,
             rejection_reason = $4,
             metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('review_notes', $5)
         WHERE id = $6
         RETURNING *`,
        [newStatus, reviewStatus, userId, rejectionReason, reviewNotes, taskId]
      );

      // Log action
      await db.query(
        `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, $3, 'task', $4, $5)`,
        [
          companyId,
          userId,
          approved ? 'approved' : 'rejected',
          taskId,
          JSON.stringify({ reviewNotes, rejectionReason })
        ]
      );

      logger.info({ taskId, approved, reviewedBy: userId }, 'Task reviewed');

      return reply.send({
        success: true,
        data: result.rows[0],
        message: approved ? 'Task approved' : 'Task rejected and sent back'
      });

    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Failed to review task');
      return reply.code(500).send({
        success: false,
        message: 'Failed to review task'
      });
    }
  });

  // Get tasks awaiting review
  fastify.get('/awaiting-review', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, role } = request.user;

      // Only owners and admins can access
      if (role !== 'owner' && role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Access denied'
        });
      }

      const result = await db.query(
        `SELECT 
          t.*,
          u.first_name || ' ' || u.last_name as assigned_to_name
         FROM tasks t
         JOIN users u ON t.assigned_to = u.id
         WHERE t.company_id = $1 AND t.review_status = 'pending_review'
         ORDER BY t.marked_complete_at ASC`,
        [companyId]
      );

      return reply.send({
        success: true,
        data: result.rows
      });

    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Failed to fetch tasks awaiting review');
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch tasks awaiting review'
      });
    }
  });

  // Delete task
  fastify.delete('/:taskId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user;
      const { taskId } = request.params as any;

      // Only owners and admins can delete
      if (role !== 'owner' && role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can delete tasks'
        });
      }

      const result = await db.query(
        'DELETE FROM tasks WHERE id = $1 AND company_id = $2 RETURNING id',
        [taskId, companyId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'Task not found'
        });
      }

      // Log action
      await db.query(
        `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id)
         VALUES ($1, $2, 'deleted', 'task', $3)`,
        [companyId, userId, taskId]
      );

      return reply.send({
        success: true,
        message: 'Task deleted successfully'
      });

    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Failed to delete task');
      return reply.code(500).send({
        success: false,
        message: 'Failed to delete task'
      });
    }
  });
}
