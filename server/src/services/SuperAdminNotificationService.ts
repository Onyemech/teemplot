import { IDatabase } from '../infrastructure/database/IDatabase';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { logger } from '../utils/logger';
import { emailService } from './EmailService';

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum NotificationType {
  ERROR = 'error',
  SECURITY = 'security',
  PAYMENT = 'payment',
  COMPANY_REGISTRATION = 'company_registration',
  DOCUMENT_REVIEW = 'document_review',
  SUBSCRIPTION_CHANGE = 'subscription_change',
  SYSTEM_ALERT = 'system_alert',
}

export interface SuperAdminNotification {
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  companyId?: string;
  userId?: string;
}

export class SuperAdminNotificationService {
  private db: IDatabase;
  private readonly SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'admin@teemplot.com';
  private readonly ENABLE_EMAIL_NOTIFICATIONS = process.env.ENABLE_SUPERADMIN_EMAIL_NOTIFICATIONS !== 'false';
  private readonly ENABLE_PUSH_NOTIFICATIONS = process.env.ENABLE_SUPERADMIN_PUSH_NOTIFICATIONS === 'true';

  constructor() {
    this.db = DatabaseFactory.getPrimaryDatabase();
  }

  /**
   * Send notification to all superadmins
   */
  async notify(notification: SuperAdminNotification): Promise<void> {
    try {
      // Log notification
      logger.info({
        type: notification.type,
        priority: notification.priority,
        title: notification.title,
      }, 'SuperAdmin notification');

      // Store in database for dashboard display
      await this.storeNotification(notification);

      // Send email for high/critical priority
      if (this.shouldSendEmail(notification.priority)) {
        await this.sendEmailNotification(notification);
      }

      // Send push notification if enabled
      if (this.ENABLE_PUSH_NOTIFICATIONS) {
        await this.sendPushNotification(notification);
      }
    } catch (error: any) {
      logger.error('Failed to send superadmin notification:', error);
      // Don't throw - notification failure shouldn't break the main flow
    }
  }

  /**
   * Notify about application errors
   */
  async notifyError(error: Error, context?: Record<string, any>): Promise<void> {
    await this.notify({
      type: NotificationType.ERROR,
      priority: NotificationPriority.HIGH,
      title: 'Application Error',
      message: `Error: ${error.message}`,
      data: {
        stack: error.stack,
        ...context,
      },
    });
  }

  /**
   * Notify about security events
   */
  async notifySecurityEvent(event: string, details: Record<string, any>): Promise<void> {
    await this.notify({
      type: NotificationType.SECURITY,
      priority: NotificationPriority.CRITICAL,
      title: `Security Alert: ${event}`,
      message: `Security event detected: ${event}`,
      data: details,
    });
  }

  /**
   * Notify about new company registration
   */
  async notifyNewCompany(companyId: string, companyName: string, ownerEmail: string): Promise<void> {
    await this.notify({
      type: NotificationType.COMPANY_REGISTRATION,
      priority: NotificationPriority.MEDIUM,
      title: 'New Company Registration',
      message: `${companyName} has registered on Teemplot`,
      companyId,
      data: {
        companyName,
        ownerEmail,
        registeredAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Notify about documents pending review
   */
  async notifyDocumentReview(companyId: string, companyName: string): Promise<void> {
    await this.notify({
      type: NotificationType.DOCUMENT_REVIEW,
      priority: NotificationPriority.MEDIUM,
      title: 'Documents Pending Review',
      message: `${companyName} has uploaded documents for review`,
      companyId,
      data: {
        companyName,
        uploadedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Notify about payment events
   */
  async notifyPayment(
    companyId: string,
    companyName: string,
    amount: number,
    status: 'success' | 'failed'
  ): Promise<void> {
    await this.notify({
      type: NotificationType.PAYMENT,
      priority: status === 'failed' ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
      title: `Payment ${status === 'success' ? 'Received' : 'Failed'}`,
      message: `Payment of ₦${amount.toLocaleString()} from ${companyName} ${status === 'success' ? 'received' : 'failed'}`,
      companyId,
      data: {
        companyName,
        amount,
        status,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Notify about subscription changes
   */
  async notifySubscriptionChange(
    companyId: string,
    companyName: string,
    oldPlan: string,
    newPlan: string
  ): Promise<void> {
    await this.notify({
      type: NotificationType.SUBSCRIPTION_CHANGE,
      priority: NotificationPriority.LOW,
      title: 'Subscription Changed',
      message: `${companyName} changed from ${oldPlan} to ${newPlan}`,
      companyId,
      data: {
        companyName,
        oldPlan,
        newPlan,
        changedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Notify about system alerts
   */
  async notifySystemAlert(alert: string, severity: 'info' | 'warning' | 'error'): Promise<void> {
    const priorityMap = {
      info: NotificationPriority.LOW,
      warning: NotificationPriority.MEDIUM,
      error: NotificationPriority.HIGH,
    };

    await this.notify({
      type: NotificationType.SYSTEM_ALERT,
      priority: priorityMap[severity],
      title: `System Alert: ${severity.toUpperCase()}`,
      message: alert,
      data: {
        severity,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Store notification in database
   */
  private async storeNotification(notification: SuperAdminNotification): Promise<void> {
    try {
      // Get all active superadmins
      const superadmins = await this.db.findOne('super_admins', {
        is_active: true,
      });
      
      const superadminsList = superadmins ? [superadmins] : [];

      // Create notification for each superadmin
      for (const admin of superadminsList) {
        await this.db.insert('notifications', {
          user_id: admin.id,
          company_id: notification.companyId || null,
          title: notification.title,
          body: notification.message,
          type: notification.type,
          data: JSON.stringify({
            priority: notification.priority,
            ...notification.data,
          }),
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error('Failed to store superadmin notification:', error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: SuperAdminNotification): Promise<void> {
    if (!this.ENABLE_EMAIL_NOTIFICATIONS) {
      return;
    }

    try {
      const priorityColors = {
        low: '#4caf50',
        medium: '#ff9800',
        high: '#ff5722',
        critical: '#f44336',
      };

      const priorityEmojis = {
        low: 'ℹ️',
        medium: '⚠️',
        high: '🚨',
        critical: '🔴',
      };

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 12px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0F5D5D, #0a4545); padding: 32px; text-align: center;">
              <h2 style="margin: 0; color: white; font-size: 24px;">Teemplot SuperAdmin</h2>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">System Notification</p>
            </td>
          </tr>
          
          <!-- Priority Badge -->
          <tr>
            <td style="padding: 24px 40px 0 40px;">
              <div style="display: inline-block; background: ${priorityColors[notification.priority]}; color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
                ${priorityEmojis[notification.priority]} ${notification.priority} Priority
              </div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 24px 40px;">
              <h1 style="margin: 0 0 16px 0; color: #333; font-size: 22px;">${notification.title}</h1>
              <p style="margin: 0 0 24px 0; color: #666; font-size: 16px; line-height: 1.6;">${notification.message}</p>
              
              ${notification.data ? `
              <div style="background: #f8f9fa; border-left: 4px solid #0F5D5D; padding: 16px; border-radius: 4px; margin: 24px 0;">
                <h3 style="margin: 0 0 12px 0; color: #333; font-size: 14px; font-weight: 600;">Additional Details:</h3>
                <pre style="margin: 0; font-family: 'Courier New', monospace; font-size: 12px; color: #666; white-space: pre-wrap; word-wrap: break-word;">${JSON.stringify(notification.data, null, 2)}</pre>
              </div>
              ` : ''}
              
              <div style="margin-top: 32px; text-align: center;">
                <a href="${process.env.FRONTEND_URL}/superadmin" style="display: inline-block; background: #0F5D5D; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  View Dashboard
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #f8f9fa; padding: 24px 40px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; color: #6c757d; font-size: 12px;">
                This is an automated notification from Teemplot SuperAdmin System<br>
                Timestamp: ${new Date().toLocaleString()}
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      await (emailService as any).sendEmail({
        to: this.SUPERADMIN_EMAIL,
        subject: `[${notification.priority.toUpperCase()}] ${notification.title}`,
        html,
        text: `
${notification.title}

Priority: ${notification.priority.toUpperCase()}
Type: ${notification.type}

${notification.message}

${notification.data ? `Details:\n${JSON.stringify(notification.data, null, 2)}` : ''}

---
Teemplot SuperAdmin System
${new Date().toLocaleString()}
        `.trim(),
      });

      logger.info(`SuperAdmin email notification sent: ${notification.title}`);
    } catch (error: any) {
      logger.error('Failed to send superadmin email:', error);
    }
  }

  /**
   * Send push notification (placeholder for future implementation)
   */
  private async sendPushNotification(notification: SuperAdminNotification): Promise<void> {
    // TODO: Implement push notification with Firebase Cloud Messaging or OneSignal
    logger.info({ title: notification.title }, 'Push notification queued');
  }

  /**
   * Determine if email should be sent based on priority
   */
  private shouldSendEmail(priority: NotificationPriority): boolean {
    return priority === NotificationPriority.HIGH || priority === NotificationPriority.CRITICAL;
  }

  /**
   * Get unread notifications count for superadmin
   */
  async getUnreadCount(superadminId: string): Promise<number> {
    try {
      const notification = await this.db.findOne('notifications', {
        user_id: superadminId,
        is_read: false,
      });
      return notification ? 1 : 0;
    } catch (error: any) {
      logger.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await this.db.update(
        'notifications',
        {
          is_read: true,
          read_at: new Date().toISOString(),
        },
        { id: notificationId }
      );
    } catch (error: any) {
      logger.error('Failed to mark notification as read:', error);
    }
  }

  /**
   * Get recent notifications for superadmin
   */
  async getRecentNotifications(superadminId: string, limit: number = 50): Promise<any[]> {
    try {
      const notification = await this.db.findOne('notifications', {
        user_id: superadminId,
      });

      return notification ? [notification] : [];
    } catch (error: any) {
      logger.error('Failed to get recent notifications:', error);
      return [];
    }
  }
}

export const superAdminNotificationService = new SuperAdminNotificationService();
