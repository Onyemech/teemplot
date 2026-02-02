
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { emailService } from './EmailService';
import { notificationService } from './NotificationService';
import { auditService } from './AuditService';
import { logger } from '../utils/logger';

export class BirthdayService {
  private db;

  constructor() {
    this.db = DatabaseFactory.getPrimaryDatabase();
  }

  async processDailyBirthdays() {
    logger.info('Starting daily birthday processing...');
    
    try {
      // Find users with birthday today (ignoring year)
      // Postgres: extract(month from date_of_birth) = extract(month from current_date)
      const celebrantsResult = await this.db.query(
        `SELECT id, company_id, first_name, last_name, email, date_of_birth
         FROM users 
         WHERE date_of_birth IS NOT NULL 
           AND is_active = true
           AND deleted_at IS NULL
           AND EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
           AND EXTRACT(DAY FROM date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE)`
      );

      const celebrants = celebrantsResult.rows;
      logger.info(`Found ${celebrants.length} birthday celebrants today.`);

      if (celebrants.length === 0) return;

      // Group by company for batch processing notifications
      const companyCelebrants: Record<string, any[]> = {};
      for (const user of celebrants) {
        if (!companyCelebrants[user.company_id]) {
          companyCelebrants[user.company_id] = [];
        }
        companyCelebrants[user.company_id].push(user);
      }

      for (const companyId in companyCelebrants) {
        await this.processCompanyBirthdays(companyId, companyCelebrants[companyId]);
      }

    } catch (error) {
      logger.error({ error }, 'Failed to process daily birthdays');
    }
  }

  private async processCompanyBirthdays(companyId: string, celebrants: any[]) {
    // Get company admins/owners
    const adminsResult = await this.db.query(
      `SELECT id, email, first_name, last_name, role 
       FROM users 
       WHERE company_id = $1 
         AND role IN ('owner', 'admin') 
         AND is_active = true 
         AND deleted_at IS NULL`,
      [companyId]
    );
    const admins = adminsResult.rows;

    // Get company details for email context
    const companyRes = await this.db.query('SELECT name FROM companies WHERE id = $1', [companyId]);
    const companyName = companyRes.rows[0]?.name || 'Teemplot';

    for (const celebrant of celebrants) {
      const celebrantName = `${celebrant.first_name} ${celebrant.last_name}`;

      // 1. Audit Log (Logged before notifications)
      try {
        await auditService.logAction({
          userId: celebrant.id, // Using celebrant as the actor for their own birthday event
          companyId: companyId,
          action: 'birthday_celebrated',
          entityType: 'user',
          entityId: celebrant.id,
          metadata: {
            celebrantName: celebrantName,
            date: new Date().toISOString().split('T')[0]
          }
        });
      } catch (err) {
        logger.error({ err, userId: celebrant.id }, 'Failed to log birthday audit');
      }

      // 2. Send Happy Birthday Email to Celebrant
      try {
        await emailService.sendEmail({
          to: celebrant.email,
          subject: `Happy Birthday, ${celebrant.first_name}! 🎂`,
          html: this.getCelebrantEmailTemplate(celebrant.first_name, companyName)
        });
      } catch (err) {
        logger.error({ err, userId: celebrant.id }, 'Failed to send birthday email to celebrant');
      }

      // 3. Notify Admins (if not the celebrant)
      for (const admin of admins) {
        if (admin.id !== celebrant.id) {
          try {
            await emailService.sendEmail({
              to: admin.email,
              subject: `It's ${celebrantName}'s Birthday Today! 🎈`,
              html: this.getAdminNotificationTemplate(admin.first_name, celebrantName, companyName)
            });
          } catch (err) {
            logger.error({ err, adminId: admin.id }, 'Failed to send birthday notification email to admin');
          }
        }
      }
    }

    // 4. Send Push Notification to ALL company employees
    // We can group celebrants into one message if multiple
    const celebrantNames = celebrants.map(c => `${c.first_name} ${c.last_name}`).join(', ');
    const isMultiple = celebrants.length > 1;
    
    const title = isMultiple ? 'Birthdays Today! 🎂' : 'Birthday Alert! 🎂';
    const message = isMultiple 
      ? `Today is the birthday of ${celebrantNames}! Let's wish them a wonderful day!` 
      : `Today is ${celebrantNames}'s birthday! 🎈 Let's wish them a wonderful and blessed day!`;

    try {
        // Get all active users in company
        const allUsersRes = await this.db.query(
            `SELECT id FROM users WHERE company_id = $1 AND is_active = true AND deleted_at IS NULL`,
            [companyId]
        );
        
        for (const user of allUsersRes.rows) {
             await notificationService.sendPushNotification({
                userId: user.id,
                title: title,
                body: message,
                data: {
                    type: 'birthday',
                    url: '/dashboard/employees',
                    celebrantIds: celebrants.map(c => c.id)
                }
            });
        }
    } catch (err) {
        logger.error({ err, companyId }, 'Failed to send company-wide birthday notifications');
    }
  }

  private getCelebrantEmailTemplate(firstName: string, companyName: string): string {
    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 10px; border: 1px solid #e0e0e0;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #f0f0f0;">
           <h1 style="color: #16a06e; margin-bottom: 10px;">Happy Birthday, ${firstName}! 🎂</h1>
           <p style="font-size: 18px; color: #555; margin: 0;">Have a wonderful day!</p>
        </div>
        
        <div style="padding: 30px 20px; text-align: center;">
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
            Dear <strong>${firstName}</strong>,
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
            Wishing you a day filled with laughter, joy, and everything that makes you happy. 
            May this new year of your life bring you success, health, and prosperity.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 30px;">
            Enjoy your lovely and blessed day! We are grateful to have you on our team.
          </p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; display: inline-block;">
            <p style="margin: 0; color: #666; font-style: italic;">
              "Count your life by smiles, not tears. Count your age by friends, not years. Happy birthday!"
            </p>
          </div>
        </div>

        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #f0f0f0; margin-top: 20px;">
          <p style="font-size: 14px; color: #888;">Best wishes,</p>
          <p style="font-size: 16px; font-weight: bold; color: #333; margin-top: 5px;">The ${companyName} Team</p>
        </div>
      </div>
    `;
  }

  private getAdminNotificationTemplate(adminName: string, celebrantName: string, companyName: string): string {
    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 10px; border: 1px solid #e0e0e0;">
        <div style="border-left: 4px solid #16a06e; padding-left: 15px; margin-bottom: 20px;">
          <h2 style="color: #333; margin: 0;">Birthday Alert 🔔</h2>
        </div>

        <div style="padding: 10px 0;">
          <p style="font-size: 16px; color: #333;">Hello <strong>${adminName}</strong>,</p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Just a friendly reminder that today is <strong>${celebrantName}'s</strong> birthday! 🎈
          </p>
          
          <div style="background-color: #f0f9f6; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #bce3d4;">
            <p style="margin: 0; color: #0c5238; font-weight: 500;">
              Let's make their day special!
            </p>
            <p style="margin: 10px 0 0 0; color: #333; font-size: 14px;">
              Don't forget to send your personal wishes or give them a shoutout in the team chat.
            </p>
          </div>

          <p style="font-size: 14px; color: #666;">
            A system notification has also been sent to the team.
          </p>
        </div>
        
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #f0f0f0; margin-top: 10px;">
           <a href="${process.env.FRONTEND_URL}/dashboard/employees" style="display: inline-block; background-color: #16a06e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: 500;">View Team</a>
        </div>
      </div>
    `;
  }
}

export const birthdayService = new BirthdayService();
