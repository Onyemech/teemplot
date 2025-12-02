import { IEmailProvider } from './IEmailProvider';
import { BrevoProvider } from './providers/BrevoProvider';
// import { SendGridProvider } from './providers/SendGridProvider';
// import { MailgunProvider } from './providers/MailgunProvider';
import { logger } from '../../utils/logger';

export type EmailProviderType = 'brevo' | 'sendgrid' | 'mailgun';

export class EmailProviderFactory {
  static createProvider(type?: EmailProviderType): IEmailProvider {
    const providerType = type || (process.env.EMAIL_PROVIDER as EmailProviderType) || 'brevo';

    logger.info({ provider: providerType }, 'Initializing email provider');

    switch (providerType.toLowerCase()) {
      case 'sendgrid':
        logger.warn('SendGrid provider not available, falling back to Brevo');
        return new BrevoProvider();
        // return new SendGridProvider();
      case 'mailgun':
        logger.warn('Mailgun provider not available, falling back to Brevo');
        return new BrevoProvider();
        // return new MailgunProvider();
      case 'brevo':
      default:
        return new BrevoProvider();
    }
  }
}
