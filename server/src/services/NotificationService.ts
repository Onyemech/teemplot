import nodemailer from 'nodemailer';
import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { realtimeService } from './RealtimeService';

interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface PushNotification {
  userId: string;
  title: string;
  body: string;
  data?: any;
}

interface EarlyDepartureNotification {
  companyId: string;
  userId: string;
  userName: string;
  departureTime: Date;
  scheduledEndTime: string;
  minutesEarly: number;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export class NotificationService {
  private transporter: nodemailer.Transporter | null = null;
  private notificationSchemaPromise?: Promise<{
    hasBody: boolean;
    hasMessage: boolean;
    hasIsRead: boolean;
    hasRead: boolean;
    hasData: boolean;
    hasLink: boolean;
    hasActionUrl: boolean;
    columns: Set<string>;
  }>;

  constructor() {
    this.initializeEmailTransporter();
  }

  private async getNotificationSchema() {
    if (!this.notificationSchemaPromise) {
      this.notificationSchemaPromise = (async () => {
        const result = await pool.query(
          `SELECT column_name
           FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'notifications'`
        );
        const columns = new Set<string>((result.rows || []).map((r: any) => String(r.column_name)));
        return {
          hasBody: columns.has('body'),
          hasMessage: columns.has('message'),
          hasIsRead: columns.has('is_read'),
          hasRead: columns.has('read'),
          hasData: columns.has('data'),
          hasLink: columns.has('link'),
          hasActionUrl: columns.has('action_url'),
          columns,
        };
      })();
    }
    return this.notificationSchemaPromise;
  }

  /**
   * Initialize email transporter
   */
  private initializeEmailTransporter(): void {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      logger.warn('Email configuration missing. Email notifications disabled.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    logger.info('Email transporter initialized');
  }

  /**
   * Notify admins/managers about new leave request
   */
  async notifyLeaveRequestCreated(data: {
    companyId: string;
    requesterId: string;
    requesterName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    days: number;
    reason: string;
  }): Promise<void> {
    try {
      // Get admins and managers
      const recipientsQuery = `
        SELECT id, email, first_name, last_name, role
        FROM users
        WHERE company_id = $1
          AND role IN ('admin', 'owner', 'manager', 'department_head')
          AND is_active = true
          AND deleted_at IS NULL
          AND id != $2
      `;

      const recipientsRes = await pool.query(recipientsQuery, [data.companyId, data.requesterId]);

      for (const recipient of recipientsRes.rows) {
        // In-app notification
        await this.sendPushNotification({
          userId: recipient.id,
          title: 'New Leave Request',
          body: `${data.requesterName} requested ${data.days} day(s) for ${data.leaveType}`,
          data: {
            type: 'leave_request',
            url: '/dashboard/leave/requests',
            requesterId: data.requesterId
          }
        });

        // Email notification
        await this.sendEmail({
          to: recipient.email,
          subject: `Leave Request: ${data.requesterName}`,
          html: `
            <h3>New Leave Request</h3>
            <p><strong>${data.requesterName}</strong> has requested leave.</p>
            <ul>
              <li><strong>Type:</strong> ${data.leaveType}</li>
              <li><strong>Dates:</strong> ${data.startDate} to ${data.endDate}</li>
              <li><strong>Duration:</strong> ${data.days} day(s)</li>
              <li><strong>Reason:</strong> ${data.reason}</li>
            </ul>
            <p><a href="${process.env.FRONTEND_URL}/dashboard/leave/requests">Review Request</a></p>
          `
        });
      }
    } catch (error) {
      logger.error({ error }, 'Failed to send leave request notifications');
    }
  }

  /**
   * Notify employee about leave request status change
   */
  async notifyLeaveRequestStatus(data: {
    userId: string;
    status: string;
    approverName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
  }): Promise<void> {
    try {
      const userRes = await pool.query('SELECT email, first_name FROM users WHERE id = $1', [data.userId]);
      if (userRes.rows.length === 0) return;
      const user = userRes.rows[0];

      const statusText = data.status === 'approved' ? 'Approved' : 'Rejected';
      const color = data.status === 'approved' ? '#0F5D5D' : '#DC2626';

      // In-app
      await this.sendPushNotification({
        userId: data.userId,
        title: `Leave Request ${statusText}`,
        body: `Your ${data.leaveType} request has been ${data.status} by ${data.approverName}`,
        data: {
          type: 'leave_status',
          status: data.status,
          url: '/dashboard/leave'
        }
      });

      // Email
      await this.sendEmail({
        to: user.email,
        subject: `Leave Request ${statusText}`,
        html: `
          <h3>Leave Request Update</h3>
          <p>Hi ${user.first_name},</p>
          <p>Your request for <strong>${data.leaveType}</strong> (${data.startDate} - ${data.endDate}) has been <strong style="color: ${color}">${statusText.toUpperCase()}</strong> by ${data.approverName}.</p>
          <p><a href="${process.env.FRONTEND_URL}/dashboard/leave">View Details</a></p>
        `
      });

    } catch (error) {
      logger.error({ error }, 'Failed to send leave status notification');
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(notification: EmailNotification): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('Email transporter not initialized');
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@teemplot.com',
        to: notification.to,
        subject: notification.subject,
        text: notification.text,
        html: notification.html,
      });

      logger.info({ messageId: info.messageId, to: notification.to }, `Email sent: ${info.messageId}`);
      return true;
    } catch (error) {
      logger.error({ error, to: notification.to });
      return false;
    }
  }

  /**
   * Send push notification
   */
  async sendPushNotification(notification: PushNotification): Promise<boolean> {
    logger.info({
      userId: notification.userId,
      title: notification.title,
    }, 'Push notification queued');

    // Store notification in database and send real-time update
    await this.storeInAppNotification(notification);

    return true;
  }

  /**
   * Store notification in database for in-app display and send SSE
   */
  private async storeInAppNotification(notification: PushNotification): Promise<void> {
    const schema = await this.getNotificationSchema();

    // Get user's company_id
    const userQuery = `SELECT company_id FROM users WHERE id = $1`;
    const userResult = await pool.query(userQuery, [notification.userId]);

    if (userResult.rows.length === 0) {
      logger.error({ userId: notification.userId });
      return;
    }

    const companyId = userResult.rows[0].company_id;
    const notificationType = notification.data?.type || 'info';

    try {
      const url = notification.data?.url;

      const insertColumns: string[] = ['user_id', 'company_id', 'type', 'title', 'created_at'];
      const values: any[] = [notification.userId, companyId, notificationType, notification.title, 'NOW()'];

      if (schema.hasBody) {
        insertColumns.push('body');
        values.splice(values.length - 1, 0, notification.body);
      } else if (schema.hasMessage) {
        insertColumns.push('message');
        values.splice(values.length - 1, 0, notification.body);
      }

      if (schema.hasData) {
        insertColumns.push('data');
        values.splice(values.length - 1, 0, JSON.stringify(notification.data || {}));
      } else if (schema.hasActionUrl && url) {
        insertColumns.push('action_url');
        values.splice(values.length - 1, 0, String(url));
      } else if (schema.hasLink && url) {
        insertColumns.push('link');
        values.splice(values.length - 1, 0, String(url));
      }

      if (schema.hasIsRead) {
        insertColumns.push('is_read');
        values.splice(values.length - 1, 0, false);
      } else if (schema.hasRead) {
        insertColumns.push('read');
        values.splice(values.length - 1, 0, false);
      }

      const placeholders = values.map((_, i) => {
        if (values[i] === 'NOW()') return 'NOW()';
        return `$${i + 1}`;
      });

      const query = `
        INSERT INTO notifications (${insertColumns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING id, created_at
      `;

      const preparedValues = values.filter((v) => v !== 'NOW()');
      const result = await pool.query(query, preparedValues);

      const newNotification = result.rows[0];

      // Send real-time update via SSE
      realtimeService.sendToUser(notification.userId, 'notification', {
        id: newNotification.id,
        title: notification.title,
        body: notification.body,
        type: notificationType,
        data: notification.data,
        is_read: false,
        created_at: newNotification.created_at
      });

    } catch (error) {
      logger.error({ error }, 'Failed to store in-app notification');
    }
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(userId: string, page = 1, limit = 20) {
    const schema = await this.getNotificationSchema();
    const offset = (page - 1) * limit;

    const bodyExpr = schema.hasBody ? 'body' : schema.hasMessage ? 'message as body' : `''::text as body`;
    const readExpr = schema.hasIsRead ? 'is_read' : schema.hasRead ? '"read" as is_read' : 'false as is_read';
    const dataExpr = schema.hasData ? 'data' : schema.hasLink ? `jsonb_build_object('url', link) as data` : schema.hasActionUrl ? `jsonb_build_object('url', action_url) as data` : `'{}'::jsonb as data`;

    const query = `
      SELECT id, title, ${bodyExpr}, type, ${dataExpr}, ${readExpr}, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `SELECT COUNT(*) FROM notifications WHERE user_id = $1`;

    const [notifications, countResult] = await Promise.all([
      pool.query(query, [userId, limit, offset]),
      pool.query(countQuery, [userId])
    ]);

    return {
      items: notifications.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const schema = await this.getNotificationSchema();
    const readColumn = schema.hasIsRead ? 'is_read' : schema.hasRead ? '"read"' : null;
    if (!readColumn) return 0;
    const query = `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND ${readColumn} = false`;
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const schema = await this.getNotificationSchema();
    const readColumn = schema.hasIsRead ? 'is_read' : schema.hasRead ? '"read"' : null;
    if (!readColumn) return;
    const query = `
      UPDATE notifications 
      SET ${readColumn} = true 
      WHERE id = $1 AND user_id = $2
    `;
    await pool.query(query, [notificationId, userId]);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    const schema = await this.getNotificationSchema();
    const readColumn = schema.hasIsRead ? 'is_read' : schema.hasRead ? '"read"' : null;
    if (!readColumn) return;
    const query = `
      UPDATE notifications 
      SET ${readColumn} = true 
      WHERE user_id = $1 AND ${readColumn} = false
    `;
    await pool.query(query, [userId]);
  }

  /**
   * Notify admins about early departure
   */
  async notifyEarlyDeparture(data: EarlyDepartureNotification): Promise<void> {
    try {
      // Get all admins for the company
      const adminsQuery = `
        SELECT id, email, first_name, last_name
        FROM users
        WHERE company_id = $1
          AND role = 'admin'
          AND is_active = true
          AND deleted_at IS NULL
      `;

      const adminsResult = await pool.query(adminsQuery, [data.companyId]);

      if (adminsResult.rows.length === 0) {
        logger.warn(`No admins found for company ${data.companyId}`);
        return;
      }

      // Send notifications to each admin
      for (const admin of adminsResult.rows) {
        // Send email
        await this.sendEarlyDepartureEmail({
          adminEmail: admin.email,
          adminName: `${admin.first_name} ${admin.last_name}`,
          employeeName: data.userName,
          departureTime: data.departureTime,
          scheduledEndTime: data.scheduledEndTime,
          minutesEarly: data.minutesEarly,
        });

        // Send push notification
        await this.sendPushNotification({
          userId: admin.id,
          title: '⚠️ Early Departure Alert',
          body: `${data.userName} left ${data.minutesEarly} minutes early`,
          data: {
            type: 'early_departure',
            userId: data.userId,
            departureTime: data.departureTime.toISOString(),
            minutesEarly: data.minutesEarly,
          },
        });
      }

      logger.info({
        userId: data.userId,
        companyId: data.companyId,
        adminCount: adminsResult.rows.length,
      }, `Early departure notifications sent for user ${data.userId}`);
    } catch (error) {
      logger.error({ error }, 'Failed to send early departure notifications');
    }
  }

  /**
   * Send early departure email
   */
  private async sendEarlyDepartureEmail(data: {
    adminEmail: string;
    adminName: string;
    employeeName: string;
    departureTime: Date;
    scheduledEndTime: string;
    minutesEarly: number;
  }): Promise<void> {
    const formattedTime = data.departureTime.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0F5D5D; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .alert { background: #fff3cd; border-left: 4px solid #FF5722; padding: 15px; margin: 20px 0; }
          .details { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .detail-label { font-weight: bold; color: #666; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>⚠️ Early Departure Alert</h2>
          </div>
          <div class="content">
            <p>Hello ${data.adminName},</p>
            
            <div class="alert">
              <strong>${data.employeeName}</strong> has left the office earlier than scheduled.
            </div>

            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Employee:</span>
                <span>${data.employeeName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Departure Time:</span>
                <span>${formattedTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Scheduled End Time:</span>
                <span>${data.scheduledEndTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Left Early By:</span>
                <span style="color: #FF5722; font-weight: bold;">${data.minutesEarly} minutes</span>
              </div>
            </div>

            <p>Please review this attendance record and take appropriate action if necessary.</p>

            <p style="margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL}/dashboard/attendance" 
                 style="background: #0F5D5D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                View Attendance Records
              </a>
            </p>
          </div>
          <div class="footer">
            <p>This is an automated notification from Teemplot HRMS</p>
            <p>© ${new Date().getFullYear()} Teemplot. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Early Departure Alert
      
      Hello ${data.adminName},
      
      ${data.employeeName} has left the office earlier than scheduled.
      
      Details:
      - Employee: ${data.employeeName}
      - Departure Time: ${formattedTime}
      - Scheduled End Time: ${data.scheduledEndTime}
      - Left Early By: ${data.minutesEarly} minutes
      
      Please review this attendance record and take appropriate action if necessary.
      
      View attendance records: ${process.env.FRONTEND_URL}/dashboard/attendance
    `;

    await this.sendEmail({
      to: data.adminEmail,
      subject: `⚠️ Early Departure Alert: ${data.employeeName}`,
      html,
      text,
    });
  }

  /**
   * Send geofence violation notification
   */
  async notifyGeofenceViolation(data: {
    companyId: string;
    userId: string;
    userName: string;
    distance: number;
    allowedRadius: number;
  }): Promise<void> {
    try {
      const adminsQuery = `
        SELECT id, email, first_name, last_name
        FROM users
        WHERE company_id = $1
          AND role = 'admin'
          AND is_active = true
          AND deleted_at IS NULL
      `;

      const adminsResult = await pool.query(adminsQuery, [data.companyId]);

      for (const admin of adminsResult.rows) {
        await this.sendPushNotification({
          userId: admin.id,
          title: '📍 Geofence Violation',
          body: `${data.userName} attempted clock-in ${Math.round(data.distance)}m away from office`,
          data: {
            type: 'geofence_violation',
            userId: data.userId,
            distance: data.distance,
            allowedRadius: data.allowedRadius,
          },
        });
      }

      logger.info(`Geofence violation notifications sent for user ${data.userId}`);
    } catch (error) {
      logger.error({ error }, 'Failed to send geofence violation notifications');
    }
  }

  async notifyTaskAssigned(data: {
    userId: string;
    assignerName: string;
    taskTitle: string;
    dueDate: Date;
    taskId: string;
  }): Promise<void> {
    try {
      const userRes = await pool.query('SELECT email, first_name FROM users WHERE id = $1', [data.userId]);
      if (userRes.rows.length === 0) return;
      const user = userRes.rows[0];
      
      const formattedDate = new Date(data.dueDate).toLocaleString();

      // Push
      await this.sendPushNotification({
        userId: data.userId,
        title: 'New Task Assigned',
        body: `${data.assignerName} assigned you: "${data.taskTitle}"`,
        data: {
          type: 'task_assigned',
          taskId: data.taskId,
          url: '/dashboard/tasks'
        }
      });

      // Email
      await this.sendEmail({
        to: user.email,
        subject: `New Task: ${data.taskTitle}`,
        html: `
          <h3>New Task Assigned</h3>
          <p>Hi ${user.first_name},</p>
          <p><strong>${data.assignerName}</strong> has assigned you a new task.</p>
          <p><strong>Task:</strong> ${data.taskTitle}</p>
          <p><strong>Due:</strong> ${formattedDate}</p>
          <p><a href="${process.env.FRONTEND_URL}/dashboard/tasks">View Task</a></p>
        `
      });
    } catch (error) {
      logger.error({ error }, 'Failed to send task assignment notification');
    }
  }

  async notifyTaskCompleted(data: {
    assignerId: string;
    assigneeName: string;
    taskTitle: string;
    taskId: string;
  }): Promise<void> {
    try {
       const userRes = await pool.query('SELECT email, first_name FROM users WHERE id = $1', [data.assignerId]);
       if (userRes.rows.length === 0) return;
       const assigner = userRes.rows[0];

       // Push
       await this.sendPushNotification({
         userId: data.assignerId,
         title: 'Task Completed ✅',
         body: `${data.assigneeName} completed "${data.taskTitle}"`,
         data: {
           type: 'task_completed',
           taskId: data.taskId,
           url: '/dashboard/tasks'
         }
       });

       // Email
       await this.sendEmail({
         to: assigner.email,
         subject: `Task Completed: ${data.taskTitle}`,
         html: `
           <h3>Task Completed</h3>
           <p>Hi ${assigner.first_name},</p>
           <p><strong>${data.assigneeName}</strong> has completed the task: <strong>${data.taskTitle}</strong>.</p>
           <p><a href="${process.env.FRONTEND_URL}/dashboard/tasks">View Task</a></p>
         `
       });
    } catch (error) {
      logger.error({ error }, 'Failed to send task completion notification');
    }
  }

  /**
   * Send task due notification
   */
  async notifyTaskDue(data: {
    userId: string;
    taskTitle: string;
    taskId: string;
    dueDate: Date;
    companyName: string;
    companyId: string;
  }): Promise<void> {
    try {
      const formattedDate = new Date(data.dueDate).toLocaleString();

      // Send Push/In-App
      await this.sendPushNotification({
        userId: data.userId,
        title: 'Task Due Soon',
        body: `Task "${data.taskTitle}" is due at ${formattedDate}`,
        data: {
          type: 'task',
          taskId: data.taskId,
          url: '/dashboard/tasks/status',
          companyLogo: true // Signal frontend to try and fetch company logo
        }
      });

      // Optional: Send Email
      // Get user email
      const userRes = await pool.query('SELECT email, first_name FROM users WHERE id = $1', [data.userId]);
      if (userRes.rows.length > 0) {
        const user = userRes.rows[0];

        await this.sendEmail({
          to: user.email,
          subject: `Task Due: ${data.taskTitle}`,
          html: `
            <h3>Task Reminder</h3>
            <p>Hi ${user.first_name},</p>
            <p>The task <strong>${data.taskTitle}</strong> is due at ${formattedDate}.</p>
            <p><a href="${process.env.FRONTEND_URL}/dashboard/tasks/status">View Task</a></p>
          `
        });
      }

    } catch (error) {
      logger.error({ error, ...data }, 'Failed to send task due notification');
    }
  }

  async notifyTaskOverdue(data: {
    userId: string;
    taskTitle: string;
    taskId: string;
    dueDate: Date;
  }): Promise<void> {
    try {
      const formattedDate = new Date(data.dueDate).toLocaleString();

      await this.sendPushNotification({
        userId: data.userId,
        title: 'Task Overdue',
        body: `Task "${data.taskTitle}" was due at ${formattedDate}`,
        data: {
          type: 'task_overdue',
          taskId: data.taskId,
          url: '/dashboard/tasks/status',
        },
      });

      const userRes = await pool.query('SELECT email, first_name FROM users WHERE id = $1', [data.userId]);
      if (userRes.rows.length === 0) return;
      const user = userRes.rows[0];

      await this.sendEmail({
        to: user.email,
        subject: `Task Overdue: ${data.taskTitle}`,
        html: `
          <h3>Task Overdue</h3>
          <p>Hi ${user.first_name},</p>
          <p>The task <strong>${data.taskTitle}</strong> was due at ${formattedDate} and is now overdue.</p>
          <p><a href="${process.env.FRONTEND_URL}/dashboard/tasks/status">View Task</a></p>
        `,
      });
    } catch (error) {
      logger.error({ error, ...data }, 'Failed to send task overdue notification');
    }
  }
}

export const notificationService = new NotificationService();
