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

    await this.db.insert('email_verification_codes', {
      email,
      code,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    });

    return code;
  }

  async verifyCode(email: string, code: string): Promise<boolean> {
    const records = await this.db.findMany('email_verification_codes', { email, code });
    if (records.length === 0) return false;

    const record = records[0];
    if (new Date(record.expires_at) < new Date()) return false;
    if (record.verified_at) return false;

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
        <h1 style="color: ${this.brandColor}; margin: 0 0 24px 0;">Verify Your Email</h1>
        <p>Hi ${firstName},</p>
        <p>Use this code to verify your email:</p>
        <div style="background: #f8f9fa; border: 2px dashed ${this.brandColor}; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
          <div style="font-size: 36px; font-weight: bold; color: ${this.brandColor}; letter-spacing: 8px;">${code}</div>
          <div style="font-size: 12px; color: #999; margin-top: 8px;">Expires in 10 minutes</div>
        </div>
      `,
    });

    return this.sendEmail({
      to: email,
      subject: `${code} is your Teemplot verification code`,
      html,
      text: `Your verification code is: ${code}`,
    });
  }

  async sendWelcomeEmail(email: string, firstName: string, companyName: string): Promise<boolean> {
    const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;
    const html = this.getTemplate({
      title: 'Welcome to Teemplot',
      content: `
        <h1 style="color: ${this.brandColor};">Welcome to Teemplot! 🎉</h1>
        <p>Hi ${firstName},</p>
        <p>Your company <strong>${companyName}</strong> is ready!</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${dashboardUrl}" style="background: ${this.brandColor}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600;">Go to Dashboard</a>
        </div>
      `,
    });

    return this.sendEmail({
      to: email,
      subject: `Welcome to Teemplot, ${firstName}!`,
      html,
      text: `Welcome to Teemplot! Visit: ${dashboardUrl}`,
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
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, ${this.brandColor}, #0a4545); padding: 32px; text-align: center;">
              <div style="background: white; display: inline-block; padding: 12px 24px; border-radius: 8px;">
                <h2 style="margin: 0; color: ${this.brandColor}; font-size: 28px;">Teemplot</h2>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px; font-size: 16px; line-height: 1.6; color: #333;">
              ${options.content}
            </td>
          </tr>
          <tr>
            <td style="background: #f8f9fa; padding: 32px; text-align: center; font-size: 12px; color: #6c757d;">
              © ${new Date().getFullYear()} Teemplot. All rights reserved.
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
