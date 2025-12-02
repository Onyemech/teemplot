import { logger } from '../../../utils/logger';
import { IEmailProvider, EmailOptions } from '../IEmailProvider';

export class MailgunProvider implements IEmailProvider {
  private readonly apiKey: string;
  private readonly domain: string;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor() {
    this.apiKey = process.env.MAILGUN_API_KEY || '';
    this.domain = process.env.MAILGUN_DOMAIN || '';
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@teemplot.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'Teemplot';
  }

  async verify(): Promise<boolean> {
    if (!this.apiKey || !this.domain) {
      logger.error('Mailgun API key or domain not configured');
      return false;
    }
    logger.info('Mailgun email provider configured');
    return true;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      let formData: any;
      let Mailgun: any;
      
      try {
        formData = await import('form-data');
        Mailgun = await import('mailgun.js');
      } catch (error) {
        console.error('Mailgun dependencies not installed');
        return false;
      }
      
      const mailgun = new Mailgun.default(formData.default);
      const mg = mailgun.client({
        username: 'api',
        key: this.apiKey,
      });

      await mg.messages.create(this.domain, {
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [options.to],
        subject: options.subject,
        text: options.text || '',
        html: options.html,
      });

      logger.info({ to: options.to }, 'Email sent via Mailgun');
      return true;
    } catch (error: any) {
      logger.error({ err: error, to: options.to }, 'Mailgun email send failed');
      return false;
    }
  }
}
