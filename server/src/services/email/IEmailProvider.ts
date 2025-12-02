/**
 * Email Provider Interface
 * Allows easy switching between email providers (Brevo, SendGrid, Mailgun, etc.)
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface IEmailProvider {
  /**
   * Send an email
   * @param options Email options
   * @returns Promise<boolean> indicating success
   */
  sendEmail(options: EmailOptions): Promise<boolean>;

  /**
   * Verify the email provider connection
   * @returns Promise<boolean> indicating if connection is valid
   */
  verify(): Promise<boolean>;
}
