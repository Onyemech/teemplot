import nodemailer from 'nodemailer';
import { logger } from '../../../utils/logger';
import { IEmailProvider, EmailOptions } from '../IEmailProvider';

export class BrevoProvider implements IEmailProvider {
  private transporter: nodemailer.Transporter;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@teemplot.com';
    this.fromName = process.env.FROM_NAME || 'Teemplot';

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Brevo email provider verified');
      return true;
    } catch (error) {
      logger.error({ err: error }, 'Brevo verification failed');
      return false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      logger.info({ to: options.to, messageId: info.messageId }, 'Email sent via Brevo');
      return true;
    } catch (error: any) {
      logger.error({ err: error, to: options.to }, 'Brevo email send failed');
      return false;
    }
  }
}
