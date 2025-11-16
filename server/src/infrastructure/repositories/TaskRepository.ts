import { ITaskRepository, TaskFilters, TaskStats } from '../../domain/repositories/ITaskRepository';
import { Task } from '../../domain/entities/Task';
import { db } from '../../config/database';
import { isPast } from 'date-fns';

export class TaskRepository implements ITaskRepository {
  private tableName = 'tasks';

  async findById(id: string): Promise<Task | null> {
    const { data, error } = await db.getAdminClient()
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findByCompany(companyId: string, filters?: TaskFilters): Promise<Task[]> {
    let query = db.getAdminClient()
      .from(this.tableName)
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null);

    query = this.applyFilters(query, filters);

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(this.mapToEntity);
  }

  async findByUser(userId: string, filters?: TaskFilters): Promise<Task[]> {
    let query = db.getAdminClient()
      .from(this.tableName)
      .select('*')
      .eq('assigned_to', userId)
      .is('deleted_at', null);

    query = this.applyFilters(query, filters);

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(this.mapToEntity);
  }

  async create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const { data, error } = await db.getAdminClient()
      .from(this.tableName)
      .insert(this.mapToDb(task))
      .select()
      .single();

    if (error) throw new Error(`Failed to create task: ${error.message}`);
    return this.mapToEntity(data);
  }

  async update(id: string, taskData: Partial<Task>): Promise<Task> {
    const { data, error } = await db.getAdminClient()
      .from(this.tableName)
      .update(this.mapToDb(taskData))
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update task: ${error.message}`);
    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await db.getAdminClient()
      .from(this.tableName)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(`Failed to delete task: ${error.message}`);
  }

  async getUserTaskStats(userId: string, startDate: Date, endDate: Date): Promise<TaskStats> {
    const { data, error } = await db.getAdminClient()
      .from(this.tableName)
      .select('status, due_date, completed_at')
      .eq('assigned_to', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .is('deleted_at', null);

    if (error || !data) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        overdueTasks: 0,
        onTimeTasks: 0,
        completionRate: 0,
      };
    }

    const stats = data.reduce((acc, task) => {
      acc.totalTasks++;
      if (task.status === 'completed') {
        acc.completedTasks++;
        if (task.completed_at && task.due_date) {
          const completedDate = new Date(task.completed_at);
          const dueDate = new Date(task.due_date);
          if (completedDate <= dueDate) {
            acc.onTimeTasks++;
          }
        }
      }
      if (task.status === 'pending' || task.status === 'in_progress') {
        acc.pendingTasks++;
        if (task.due_date && isPast(new Date(task.due_date))) {
          acc.overdueTasks++;
        }
      }
      return acc;
    }, {
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      overdueTasks: 0,
      onTimeTasks: 0,
    });

    return {
      ...stats,
      completionRate: stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0,
    };
  }

  private applyFilters(query: any, filters?: TaskFilters): any {
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }
    if (filters?.assignedBy) {
      query = query.eq('assigned_by', filters.assignedBy);
    }
    if (filters?.departmentId) {
      query = query.eq('department_id', filters.departmentId);
    }
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.dueDateFrom) {
      query = query.gte('due_date', filters.dueDateFrom.toISOString());
    }
    if (filters?.dueDateTo) {
      query = query.lte('due_date', filters.dueDateTo.toISOString());
    }
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    query = query.order('created_at', { ascending: false });
    return query;
  }

  private mapToEntity(data: any): Task {
    return {
      id: data.id,
      companyId: data.company_id,
      title: data.title,
      description: data.description,
      assignedTo: data.assigned_to,
      assignedBy: data.assigned_by,
      departmentId: data.department_id,
      priority: data.priority,
      status: data.status,
      category: data.category,
      dueDate: data.due_date ? new Date(data.due_date) : undefined,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      estimatedHours: data.estimated_hours,
      actualHours: data.actual_hours,
      attachments: data.attachments || [],
      metadata: data.metadata || {},
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      deletedAt: data.deleted_at ? new Date(data.deleted_at) : undefined,
    };
  }

  private mapToDb(data: Partial<Task>): any {
    const dbData: any = {};
    
    if (data.companyId) dbData.company_id = data.companyId;
    if (data.title) dbData.title = data.title;
    if (data.description !== undefined) dbData.description = data.description;
    if (data.assignedTo !== undefined) dbData.assigned_to = data.assignedTo;
    if (data.assignedBy !== undefined) dbData.assigned_by = data.assignedBy;
    if (data.departmentId !== undefined) dbData.department_id = data.departmentId;
    if (data.priority) dbData.priority = data.priority;
    if (data.status) dbData.status = data.status;
    if (data.category !== undefined) dbData.category = data.category;
    if (data.dueDate !== undefined) dbData.due_date = data.dueDate;
    if (data.completedAt !== undefined) dbData.completed_at = data.completedAt;
    if (data.estimatedHours !== undefined) dbData.estimated_hours = data.estimatedHours;
    if (data.actualHours !== undefined) dbData.actual_hours = data.actualHours;
    if (data.attachments !== undefined) dbData.attachments = data.attachments;
    if (data.metadata !== undefined) dbData.metadata = data.metadata;
    
    return dbData;
  }
}
