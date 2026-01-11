import { pool } from '../config/database';
import { logger } from '../utils/logger';
import nodemailer from 'nodemailer';
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

  constructor() {
    this.initializeEmailTransporter();
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
    // Get user's company_id
    const userQuery = `SELECT company_id FROM users WHERE id = $1`;
    const userResult = await pool.query(userQuery, [notification.userId]);
    
    if (userResult.rows.length === 0) {
      logger.error({ userId: notification.userId });
      return;
    }

    const companyId = userResult.rows[0].company_id;
    const notificationType = notification.data?.type || 'info';

    const query = `
      INSERT INTO notifications (
        user_id,
        company_id,
        title,
        body,
        type,
        data,
        is_read,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
      RETURNING id, created_at
    `;

    try {
      const result = await pool.query(query, [
        notification.userId,
        companyId,
        notification.title,
        notification.body,
        notificationType,
        JSON.stringify(notification.data || {}),
      ]);

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
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT id, title, body, type, data, is_read, created_at
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
    const query = `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`;
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const query = `
      UPDATE notifications 
      SET is_read = true 
      WHERE id = $1 AND user_id = $2
    `;
    await pool.query(query, [notificationId, userId]);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    const query = `
      UPDATE notifications 
      SET is_read = true 
      WHERE user_id = $1 AND is_read = false
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
}

export const notificationService = new NotificationService();
