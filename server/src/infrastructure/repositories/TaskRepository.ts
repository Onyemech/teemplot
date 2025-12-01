import { ITaskRepository, TaskFilters, TaskStats } from '../../domain/repositories/ITaskRepository';
import { Task } from '../../domain/entities/Task';
import { DatabaseFactory } from '../database/DatabaseFactory';
import { IDatabase } from '../database/IDatabase';

export class TaskRepository implements ITaskRepository {
  private tableName = 'tasks';
  private db: IDatabase;

  constructor() {
    this.db = DatabaseFactory.getPrimaryDatabase();
  }

  async findById(id: string): Promise<Task | null> {
    return await this.db.findOne(this.tableName, { id, deleted_at: null });
  }

  async getUserTaskStats(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<TaskStats> {
  const result = await this.db.query(
    `SELECT status, due_date, completed_at 
     FROM ${this.tableName}
     WHERE assigned_to = $1
       AND created_at >= $2
       AND created_at <= $3
       AND deleted_at IS NULL`,
    [userId, startDate.toISOString(), endDate.toISOString()]
  );

  const rows = result.rows;

  const stats = {
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    onTimeTasks: 0,
    completionRate: 0,
  };

  for (const task of rows) {
    stats.totalTasks++;

    // Completed tasks
    if (task.status === 'completed') {
      stats.completedTasks++;

      // On-time vs overdue
      if (task.completed_at && task.due_date) {
        const completed = new Date(task.completed_at);
        const due = new Date(task.due_date);

        if (completed <= due) stats.onTimeTasks++;
        else stats.overdueTasks++;
      }

      continue;
    }

    // Pending tasks
    if (task.status === 'pending' || task.status === 'in_progress') {
      stats.pendingTasks++;

      // Overdue pending tasks
      if (task.due_date && new Date(task.due_date) < new Date()) {
        stats.overdueTasks++;
      }
    }
  }

  stats.completionRate =
    stats.totalTasks > 0
      ? (stats.completedTasks / stats.totalTasks) * 100
      : 0;

  return stats;
}

  async findByCompany(companyId: string, filters?: TaskFilters): Promise<Task[]> {
    const where: any = { company_id: companyId, deleted_at: null };
    return await this.db.find(this.tableName, where);
  }

  async findByUser(userId: string, filters?: TaskFilters): Promise<Task[]> {
    const where: any = { assigned_to: userId, deleted_at: null };
    return await this.db.find(this.tableName, where);
  }

  async create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    return await this.db.insert(this.tableName, task as any);
  }

  async update(id: string, taskData: Partial<Task>): Promise<Task> {
    const results = await this.db.update(this.tableName, taskData as any, { id });
    if (results.length === 0) throw new Error('Task not found');
    return results[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.update(this.tableName, { deleted_at: new Date().toISOString() } as any, { id });
  }

  async getTaskStats(companyId: string, startDate: Date, endDate: Date): Promise<TaskStats> {
    const result = await this.db.query(
      `SELECT status, priority FROM ${this.tableName} 
       WHERE company_id = $1 
       AND created_at >= $2 
       AND created_at <= $3 
       AND deleted_at IS NULL`,
      [companyId, startDate.toISOString(), endDate.toISOString()]
    );

    const data = result.rows;
    const stats = data.reduce((acc: any, task: any) => {
      acc.total++;
      if (task.status === 'completed') acc.completed++;
      if (task.status === 'in_progress') acc.inProgress++;
      if (task.status === 'pending') acc.pending++;
      if (task.priority === 'high' || task.priority === 'urgent') acc.highPriority++;
      return acc;
    }, {
      total: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
      highPriority: 0,
    });

    return {
      ...stats,
      completionRate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
    };
  }
}
