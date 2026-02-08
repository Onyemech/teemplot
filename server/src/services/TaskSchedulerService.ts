import { query } from '../config/database';
import { logger } from '../utils/logger';
import { notificationService } from './NotificationService';

class TaskSchedulerService {
    private checkInterval: NodeJS.Timeout | null = null;
    private readonly CHECK_INTERVAL_MS = 60 * 1000; // Check every minute
    private taskSchemaPromise?: Promise<{
        primaryAssigneeColumn: 'assignee_id' | 'assigned_to';
        hasDeletedAt: boolean;
    }>;

    private async getTaskSchema() {
        if (!this.taskSchemaPromise) {
            this.taskSchemaPromise = (async () => {
                const res = await query(
                    `SELECT column_name
                     FROM information_schema.columns
                     WHERE table_schema = 'public' AND table_name = 'tasks'`
                );
                const columns = new Set<string>((res.rows || []).map((r: any) => String(r.column_name)));
                const primaryAssigneeColumn = columns.has('assignee_id') ? 'assignee_id' : 'assigned_to';
                return {
                    primaryAssigneeColumn,
                    hasDeletedAt: columns.has('deleted_at')
                };
            })();
        }
        return this.taskSchemaPromise;
    }

    async runOnce(): Promise<void> {
        await this.checkDueTasks();
    }

    /**
     * Start the scheduler
     */
    start() {
        if (this.checkInterval) {
            logger.warn('TaskSchedulerService is already running');
            return;
        }

        logger.info('Starting TaskSchedulerService...');

        // Run immediately on start
        this.checkDueTasks();

        // Set interval
        this.checkInterval = setInterval(() => {
            this.checkDueTasks();
        }, this.CHECK_INTERVAL_MS);
    }

    /**
     * Stop the scheduler
     */
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            logger.info('Stopped TaskSchedulerService');
        }
    }

    /**
     * Check for tasks that are due and send notifications
     */
    private async checkDueTasks() {
        try {
            const schema = await this.getTaskSchema();

            // Find tasks that:
            // 1. Are NOT completed/cancelled
            // 2. Are due within the last hour (to avoid spamming old tasks, or adjusting window as needed)
            //    OR just check due_date <= NOW()
            // 3. Have NOT had a 'due_soon' or 'due_now' notification sent yet?
            //    For simplicity, let's assume we want to notify exactly when due or slightly before.
            //    We can add a 'notification_sent_at' column to tasks or task_metadata to track this.
            //    However, since we can't easily modify schema right now without approval, 
            //    we'll use a robust approach: Check for tasks due in the current minute window 
            //    OR store a flag in the `metadata` jsonb column if available.

            // Let's assume 'metadata' column exists or we can check last notification.
            // Actually, standard practice without schema change: 
            // We will look for tasks due between (NOW - 1 min) and NOW.

            const now = new Date();
            const windowMinutes = parseInt(process.env.TASK_DUE_WINDOW_MINUTES || '1');
            const windowAgo = new Date(now.getTime() - windowMinutes * 60 * 1000);

            // Query for tasks due in this window
            const result = await query(
                `SELECT t.id, t.title, t.${schema.primaryAssigneeColumn} as assigned_to, t.company_id, t.due_date, c.name as company_name
         FROM tasks t
         JOIN companies c ON t.company_id = c.id
         WHERE t.due_date >= $1 
           AND t.due_date <= $2
           AND t.status NOT IN ('completed', 'cancelled')
           ${schema.hasDeletedAt ? 'AND t.deleted_at IS NULL' : ''}`,
                [windowAgo, now]
            );

            if (result.rows.length === 0) {
                return;
            }

            logger.info({ count: result.rows.length }, 'Found tasks due for notification');

            for (const task of result.rows) {
                try {
                    if (!task.assigned_to) continue;
                    await notificationService.notifyTaskDue({
                        userId: task.assigned_to,
                        taskTitle: task.title,
                        taskId: task.id,
                        dueDate: task.due_date,
                        companyName: task.company_name,
                        companyId: task.company_id
                    });

                    logger.info({ taskId: task.id }, 'Sent due date notification');
                } catch (err) {
                    logger.error({ err, taskId: task.id }, 'Failed to send task notification');
                }
            }

            const overdueWindowMinutes = parseInt(process.env.TASK_OVERDUE_WINDOW_MINUTES || '5');
            const overdueAgo = new Date(now.getTime() - overdueWindowMinutes * 60 * 1000);

            const overdueRes = await query(
                `SELECT t.id, t.title, t.${schema.primaryAssigneeColumn} as assigned_to, t.due_date
         FROM tasks t
         WHERE t.due_date >= $1
           AND t.due_date < $2
           AND t.status NOT IN ('completed', 'cancelled')
           ${schema.hasDeletedAt ? 'AND t.deleted_at IS NULL' : ''}`,
                [overdueAgo, now]
            );

            for (const task of overdueRes.rows) {
                try {
                    if (!task.assigned_to) continue;
                    await notificationService.notifyTaskOverdue({
                        userId: task.assigned_to,
                        taskTitle: task.title,
                        taskId: task.id,
                        dueDate: task.due_date,
                    });
                } catch (err) {
                    logger.error({ err, taskId: task.id }, 'Failed to send overdue task notification');
                }
            }

        } catch (error) {
            logger.error({ err: error }, 'Error in TaskSchedulerService.checkDueTasks');
        }
    }
}

export const taskSchedulerService = new TaskSchedulerService();
