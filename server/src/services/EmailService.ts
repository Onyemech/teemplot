import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { IDatabase } from '../infrastructure/database/IDatabase';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly fromEmail: string;
  private readonly fromName: string = 'Teemplot';
  private readonly brandColor: string = '#0F5D5D';
  private readonly accentColor: string = '#FF5722';
  private db: IDatabase;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@teemplot.com';
    this.db = DatabaseFactory.getPrimaryDatabase();
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      logger.error('Email configuration missing');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      this.transporter.verify((error, success) => {
        if (error) {
          logger.error({ err: error }, 'Email verification failed');
        } else {
          logger.info('Email transporter verified');
        }
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize email');
    }
  }

  async sendEmail(options: EmailOptions, retries = 3): Promise<boolean> {
    if (!this.transporter) {
      logger.error('Email transporter not initialized');
      return false;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const info = await this.transporter.sendMail({
          from: `"${this.fromName}" <${this.fromEmail}>`,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });

        logger.info({ to: options.to, messageId: info.messageId }, `Email sent: ${info.messageId}`);
        return true;
      } catch (error: any) {
        logger.error({ err: error, to: options.to }, `Email failed (attempt ${attempt})`);
        if (attempt === retries) return false;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    return false;
  }

  async generateVerificationCode(email: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const { randomUUID } = await import('crypto');

    try {
      await this.db.insert('email_verification_codes', {
        id: randomUUID(),
        email,
        code,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ err: error, email }, 'Failed to insert verification code into database');
      throw new Error(`Failed to generate verification code: ${error.message}`);
    }

    return code;
  }

  async verifyCode(email: string, code: string): Promise<boolean> {
    const records = await this.db.find('email_verification_codes', { email, code });
    if (records.length === 0) return false;

    const record = records[0];
    if (new Date(record.expires_at) < new Date()) return false;
    if (record.verified_at) return false;

    // Mark as verified (update method now handles tables without updated_at)
    await this.db.update(
      'email_verification_codes',
      { verified_at: new Date().toISOString() },
      { id: record.id }
    );

    return true;
  }

  async sendVerificationEmail(email: string, firstName: string, code: string): Promise<boolean> {
    const html = this.getTemplate({
      title: 'Verify Your Email',
      content: `
        <h2 style="color: #1a2332; margin: 0 0 20px 0; font-size: 26px; font-weight: 700;">Email Verification</h2>
        
        <p style="color: #4a5568; font-size: 15px; margin: 0 0 20px 0;">
          Hello <strong>${firstName}</strong>,
        </p>

        <p style="color: #4a5568; font-size: 15px; margin: 0 0 30px 0;">
          You have requested to verify your email address. Please use the verification code below:
        </p>

        <div style="background: #f7fafc; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 30px 0;">
          <p style="color: #4a5568; font-size: 13px; margin: 0 0 12px 0; font-weight: 600;">VERIFICATION CODE</p>
          <div style="font-size: 36px; font-weight: 700; color: ${this.brandColor}; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</div>
          <p style="color: #718096; font-size: 13px; margin: 12px 0 0 0;">Expires in 10 minutes</p>
        </div>

        <p style="color: #718096; font-size: 13px; margin: 0; line-height: 1.6;">
          If you did not request this verification, please ignore this email.
        </p>
      `,
    });

    return this.sendEmail({
      to: email,
      subject: `${code} is your Teemplot verification code`,
      html,
      text: `Your verification code is: ${code}. This code expires in 10 minutes.`,
    });
  }

  async sendPasswordResetEmail(email: string, firstName: string, code: string): Promise<boolean> {
    const html = this.getTemplate({
      title: 'Reset Your Password',
      content: `
        <h2 style="color: #1a2332; margin: 0 0 20px 0; font-size: 26px; font-weight: 700;">Password Reset Request</h2>
        
        <p style="color: #4a5568; font-size: 15px; margin: 0 0 20px 0;">
          Hello <strong>${firstName}</strong>,
        </p>

        <p style="color: #4a5568; font-size: 15px; margin: 0 0 30px 0;">
          We received a request to reset your password. Use the code below to proceed:
        </p>

        <div style="background: #f7fafc; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 30px 0;">
          <p style="color: #4a5568; font-size: 13px; margin: 0 0 12px 0; font-weight: 600;">RESET CODE</p>
          <div style="font-size: 36px; font-weight: 700; color: ${this.brandColor}; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</div>
          <p style="color: #718096; font-size: 13px; margin: 12px 0 0 0;">Expires in 10 minutes</p>
        </div>

        <div style="background: #fff5f5; border-left: 3px solid #fc8181; border-radius: 4px; padding: 15px; margin: 0 0 20px 0;">
          <p style="color: #c53030; font-size: 13px; margin: 0; line-height: 1.6;">
            <strong>Security Notice:</strong> If you didn't request this, please ignore this email. Your password will remain unchanged.
          </p>
        </div>

        <p style="color: #718096; font-size: 13px; margin: 0; line-height: 1.6;">
          Need help? Contact support at <a href="mailto:support@teemplot.com" style="color: ${this.brandColor}; text-decoration: none;">support@teemplot.com</a>
        </p>
      `,
    });

    return this.sendEmail({
      to: email,
      subject: `${code} is your password reset code`,
      html,
      text: `Your password reset code is: ${code}. This code expires in 10 minutes. If you didn't request this, please ignore this email.`,
    });
  }

  async sendWelcomeEmail(email: string, firstName: string, companyName: string): Promise<boolean> {
    const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;
    const html = this.getTemplate({
      title: 'Welcome to Teemplot',
      content: `
        <h2 style="color: #1a2332; margin: 0 0 20px 0; font-size: 26px; font-weight: 700;">Welcome to Teemplot! 🎉</h2>
        
        <p style="color: #4a5568; font-size: 15px; margin: 0 0 20px 0;">
          Hello <strong>${firstName}</strong>,
        </p>

        <p style="color: #4a5568; font-size: 15px; margin: 0 0 30px 0;">
          Congratulations! Your company <strong>${companyName}</strong> has been successfully set up on Teemplot. You can now start managing your workforce efficiently.
        </p>

        <div style="background: #f7fafc; border-radius: 8px; padding: 20px; margin: 0 0 30px 0;">
          <p style="color: #2d3748; font-size: 14px; margin: 0 0 15px 0; font-weight: 600;">Your platform includes:</p>
          <p style="color: #4a5568; font-size: 14px; margin: 0 0 8px 0;">✓ Smart Attendance Tracking</p>
          <p style="color: #4a5568; font-size: 14px; margin: 0 0 8px 0;">✓ Task Management System</p>
          <p style="color: #4a5568; font-size: 14px; margin: 0;">✓ Real-time Analytics Dashboard</p>
        </div>

        <div style="text-align: center; margin: 0 0 30px 0;">
          <a href="${dashboardUrl}" style="display: inline-block; background: ${this.brandColor}; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
            View Dashboard
          </a>
        </div>

        <p style="color: #718096; font-size: 13px; margin: 0; line-height: 1.6;">
          Need assistance? Contact support at <a href="mailto:support@teemplot.com" style="color: ${this.brandColor}; text-decoration: none;">support@teemplot.com</a>
        </p>
      `,
    });

    return this.sendEmail({
      to: email,
      subject: `🎉 Welcome to Teemplot, ${firstName}!`,
      html,
      text: `Welcome to Teemplot! Your company ${companyName} is now live. Visit your dashboard: ${dashboardUrl}`,
    });
  }

  private getTemplate(options: { title: string; content: string }): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        margin: 20px 10px !important;
      }
      .email-content {
        padding: 30px 20px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table class="email-container" width="500" cellpadding="0" cellspacing="0" style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); margin: 0 auto;">
          
          <!-- Header with Logo and Brand -->
          <tr>
            <td style="background: linear-gradient(135deg, ${this.brandColor} 0%, #0a4545 100%); padding: 30px 40px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-flex; align-items: center; gap: 12px;">
                      <!-- Logo Icon -->
                      <div style="background: white; width: 40px; height: 40px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="${this.brandColor}"/>
                          <path d="M2 17L12 22L22 17V12L12 17L2 12V17Z" fill="${this.accentColor}"/>
                        </svg>
                      </div>
                      <!-- Brand Name -->
                      <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                        Teemplot
                      </h1>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="email-content" style="padding: 40px; font-size: 15px; line-height: 1.6; color: #333;">
              ${options.content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #1a2332; padding: 30px 40px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #ffffff; font-weight: 600;">
                Teemplot Workforce Management System
              </p>
              <p style="margin: 0 0 16px 0; font-size: 12px; color: #a0aec0; line-height: 1.5;">
                © ${new Date().getFullYear()} Teemplot. All rights reserved.
              </p>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #a0aec0; line-height: 1.5;">
                This is an automated message, please do not reply to this email.
              </p>
              <p style="margin: 0; font-size: 12px; color: #a0aec0;">
                Need help? Contact your HR department or system administrator.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }
}

export const emailService = new EmailService();
