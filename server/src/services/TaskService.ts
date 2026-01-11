import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { logger } from '../utils/logger';

interface CreateTaskData {
  title: string;
  description?: string;
  assignedTo: string;
  priority?: string;
  dueDate?: string;
  estimatedHours?: number;
  tags?: string[];
}

interface UpdateTaskData {
  title?: string;
  description?: string;
  priority?: string;
  dueDate?: string;
  estimatedHours?: number;
  tags?: string[];
  status?: string;
  [key: string]: any;
}

interface MarkCompleteData {
  actualHours?: number;
  completionNotes?: string;
}

interface ReviewTaskData {
  approved: boolean;
  reviewNotes?: string;
  rejectionReason?: string;
}

interface GetTasksFilters {
  status?: string;
  assignedTo?: string;
  priority?: string;
  page?: number;
  limit?: number;
}

interface UserContext {
  companyId: string;
  userId: string;
  role: string;
}

export class TaskService {
  private db;

  constructor() {
    this.db = DatabaseFactory.getPrimaryDatabase();
  }

  async createTask(data: CreateTaskData, user: UserContext): Promise<any> {
    const { companyId, userId, role } = user;
    const {
      title,
      description,
      assignedTo,
      priority = 'medium',
      dueDate,
      estimatedHours,
      tags
    } = data;

    // Role-based assignment permissions
    // - Owner: can assign to admins, managers, employees
    // - Admin: can assign to managers and employees
    // - Manager/Department Head: can assign to employees under their supervision (same department)
    // - Employee: cannot create tasks
    if (role === 'employee') {
      throw new Error('Employees cannot create tasks');
    }

    if (!title || !assignedTo) {
      throw new Error('Title and assigned user are required');
    }

    // Validate assignee and role hierarchy constraints
    const assigneeRes = await this.db.query(
      'SELECT id, role, department_id FROM users WHERE id = $1 AND company_id = $2 AND is_active = true',
      [assignedTo, companyId]
    );

    if (assigneeRes.rows.length === 0) {
      throw new Error('Assigned user not found or not active');
    }
    const assignee = assigneeRes.rows[0];
    const assigneeRole = String(assignee.role || '').toLowerCase();
    const canAssign =
      role === 'owner' ? ['admin', 'manager', 'employee'].includes(assigneeRole) :
      role === 'admin' ? ['manager', 'employee'].includes(assigneeRole) :
      (role === 'manager' || role === 'department_head') ? assigneeRole === 'employee' : false;
    if (!canAssign) {
      throw new Error('Insufficient permission to assign to this role');
    }
    if (role === 'manager' || role === 'department_head') {
      const mgrRes = await this.db.query(
        'SELECT department_id FROM users WHERE id = $1 AND company_id = $2',
        [userId, companyId]
      );
      const mgrDept = mgrRes.rows[0]?.department_id;
      if (!mgrDept || mgrDept !== assignee.department_id) {
        throw new Error('Managers can only assign tasks within their department');
      }
    }

    const result = await this.db.query(
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
        priority,
        dueDate,
        estimatedHours,
        tags ? JSON.stringify(tags) : null
      ]
    );

    const task = result.rows[0];

    await this.db.query(
      `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, 'created', 'task', $3, $4)`,
      [companyId, userId, task.id, JSON.stringify({ title, assignedTo })]
    );

    logger.info({ taskId: task.id, assignedTo, createdBy: userId }, 'Task created');

    return task;
  }

  async getDepartmentTasks(user: UserContext): Promise<any[]> {
    const { companyId, userId } = user;

    // Get user's department
    const userQuery = await this.db.query(
      'SELECT department_id FROM users WHERE id = $1 AND company_id = $2',
      [userId, companyId]
    );
    const departmentId = userQuery.rows[0]?.department_id;

    if (!departmentId) {
      return [];
    }

    const query = `
      SELECT 
        t.*,
        u.first_name || ' ' || u.last_name as assigned_to_name,
        u.avatar_url as assigned_to_avatar
      FROM tasks t
      JOIN users u ON t.assigned_to = u.id
      WHERE t.company_id = $1
        AND (u.department_id = $2 OR t.department_id = $2)
        AND t.deleted_at IS NULL
      ORDER BY t.created_at DESC
    `;

    const result = await this.db.query(query, [companyId, departmentId]);
    
    // Map to frontend format
    return result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      assignedTo: {
        id: row.assigned_to,
        name: row.assigned_to_name,
        avatar: row.assigned_to_avatar
      },
      status: row.status,
      priority: row.priority,
      dueDate: row.due_date,
      createdAt: row.created_at
    }));
  }

  async getTasks(filters: GetTasksFilters, user: UserContext): Promise<{ tasks: any[]; pagination: any }> {
    const { companyId, userId, role } = user;
    const { status, assignedTo, priority, page = 1, limit = 20 } = filters;

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

    if (role === 'employee') {
      query += ` AND t.assigned_to = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

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

    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this.db.query(query, params);

    let countQuery = 'SELECT COUNT(*) FROM tasks WHERE company_id = $1';
    const countParams: any[] = [companyId];
    
    if (role === 'employee') {
      countQuery += ' AND assigned_to = $2';
      countParams.push(userId);
    }

    const countResult = await this.db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return {
      tasks: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getTask(taskId: string, user: UserContext): Promise<any> {
    const { companyId, userId, role } = user;

    const result = await this.db.query(
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
      throw new Error('Task not found');
    }

    const task = result.rows[0];

    if (role === 'employee' && task.assigned_to !== userId) {
      throw new Error('Access denied');
    }

    return task;
  }

  async updateTask(taskId: string, updates: UpdateTaskData, user: UserContext): Promise<any> {
    const { companyId, userId, role } = user;

    if (role !== 'owner' && role !== 'admin' && role !== 'department_head' && role !== 'manager') {
      throw new Error('Only owners, admins, and managers can update tasks');
    }

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
      throw new Error('No valid fields to update');
    }

    values.push(taskId, companyId);

    const result = await this.db.query(
      `UPDATE tasks 
       SET ${updateFields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex} AND company_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Task not found');
    }

    await this.db.query(
      `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, 'updated', 'task', $3, $4)`,
      [companyId, userId, taskId, JSON.stringify(updates)]
    );

    return result.rows[0];
  }

  async markTaskComplete(taskId: string, data: MarkCompleteData, user: UserContext): Promise<any> {
    const { companyId, userId } = user;
    const { actualHours, completionNotes } = data;

    const taskResult = await this.db.query(
      'SELECT * FROM tasks WHERE id = $1 AND company_id = $2',
      [taskId, companyId]
    );

    if (taskResult.rows.length === 0) {
      throw new Error('Task not found');
    }

    const task = taskResult.rows[0];

    if (task.assigned_to !== userId) {
      throw new Error('Only the assigned user can mark this task as complete');
    }

    const result = await this.db.query(
      `UPDATE tasks 
       SET status = 'awaiting_review',
           review_status = 'pending_review',
           marked_complete_at = NOW(),
           marked_complete_by = $1,
           actual_hours = $2,
           metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('completion_notes', $3)
       WHERE id = $4 AND company_id = $5
       RETURNING *`,
      [userId, actualHours, completionNotes, taskId, companyId]
    );

    await this.db.query(
      `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, 'marked_complete', 'task', $3, $4)`,
      [companyId, userId, taskId, JSON.stringify({ actualHours, completionNotes })]
    );

    logger.info({ taskId, userId }, 'Task marked as complete');

    return result.rows[0];
  }

  async reviewTask(taskId: string, data: ReviewTaskData, user: UserContext): Promise<any> {
    const { companyId, userId, role } = user;
    const { approved, reviewNotes, rejectionReason } = data;

    // Only original assigner must verify completion

    const taskResult = await this.db.query(
      'SELECT * FROM tasks WHERE id = $1 AND company_id = $2',
      [taskId, companyId]
    );

    if (taskResult.rows.length === 0) {
      throw new Error('Task not found');
    }

    const task = taskResult.rows[0];
    
    // Allow owners to review any task, others only if they created it
    if (role !== 'owner' && task.created_by !== userId) {
      throw new Error('Only the original assigner (or owner) can review this task');
    }

    if (task.review_status !== 'pending_review') {
      throw new Error('Task is not awaiting review');
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

    const result = await this.db.query(
      `UPDATE tasks 
       SET status = $1,
           review_status = $2,
           reviewed_at = NOW(),
           reviewed_by = $3,
           completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE NULL END,
           rejection_reason = $4,
           metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('review_notes', $5)
       WHERE id = $6 AND company_id = $7
       RETURNING *`,
      [newStatus, reviewStatus, userId, rejectionReason, reviewNotes, taskId, companyId]
    );

    await this.db.query(
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

    return result.rows[0];
  }

  async getAwaitingReview(user: UserContext): Promise<any[]> {
    const { companyId, role } = user;

    // Any role can view tasks they assigned that await review

    const result = await this.db.query(
      `SELECT 
        t.*,
        u.first_name || ' ' || u.last_name as assigned_to_name
       FROM tasks t
       JOIN users u ON t.assigned_to = u.id
       WHERE t.company_id = $1 AND t.review_status = 'pending_review' AND t.created_by = $2
       ORDER BY t.marked_complete_at ASC`,
      [companyId, user.userId]
    );

    return result.rows;
  }

  async deleteTask(taskId: string, user: UserContext): Promise<void> {
    const { companyId, userId, role } = user;

    if (role !== 'owner' && role !== 'admin' && role !== 'department_head') {
      throw new Error('Only owners, admins, and department heads can delete tasks');
    }

    const result = await this.db.query(
      'DELETE FROM tasks WHERE id = $1 AND company_id = $2 RETURNING id',
      [taskId, companyId]
    );

    if (result.rows.length === 0) {
      throw new Error('Task not found');
    }

    await this.db.query(
      `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id)
       VALUES ($1, $2, 'deleted', 'task', $3)`,
      [companyId, userId, taskId]
    );
  }
}

export const taskService = new TaskService();
