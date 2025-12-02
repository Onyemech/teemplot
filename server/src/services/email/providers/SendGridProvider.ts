import { logger } from '../../../utils/logger';
import { IEmailProvider, EmailOptions } from '../IEmailProvider';

export class SendGridProvider implements IEmailProvider {
  private readonly apiKey: string;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY || '';
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@teemplot.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'Teemplot';
  }

  async verify(): Promise<boolean> {
    if (!this.apiKey) {
      logger.error('SendGrid API key not configured');
      return false;
    }
    logger.info('SendGrid email provider configured');
    return true;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      let sgMail: any;
      
      try {
        sgMail = await import('@sendgrid/mail');
      } catch (error) {
        console.error('SendGrid dependency not installed');
        return false;
      }
      
      sgMail.default.setApiKey(this.apiKey);

      await sgMail.default.send({
        to: options.to,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: options.subject,
        text: options.text || '',
        html: options.html,
      });

      logger.info({ to: options.to }, 'Email sent via SendGrid');
      return true;
    } catch (error: any) {
      logger.error({ err: error, to: options.to }, 'SendGrid email send failed');
      return false;
    }
  }
}
