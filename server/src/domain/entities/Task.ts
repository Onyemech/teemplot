export interface Task {
  id: string;
  companyId: string;
  title: string;
  description?: string;
  assignedTo?: string;
  assignedBy?: string;
  departmentId?: string;
  priority: TaskPriority;
  status: TaskStatus;
  category?: string;
  dueDate?: Date;
  completedAt?: Date;
  estimatedHours?: number;
  actualHours?: number;
  attachments?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
