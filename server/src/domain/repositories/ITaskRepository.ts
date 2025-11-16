import { Task } from '../entities/Task';

export interface ITaskRepository {
  findById(id: string): Promise<Task | null>;
  findByCompany(companyId: string, filters?: TaskFilters): Promise<Task[]>;
  findByUser(userId: string, filters?: TaskFilters): Promise<Task[]>;
  create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task>;
  update(id: string, data: Partial<Task>): Promise<Task>;
  delete(id: string): Promise<void>;
  getUserTaskStats(userId: string, startDate: Date, endDate: Date): Promise<TaskStats>;
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  assignedTo?: string;
  assignedBy?: string;
  departmentId?: string;
  category?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  onTimeTasks: number;
  completionRate: number;
}
