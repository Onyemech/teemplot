import { IDatabase } from '../infrastructure/database/IDatabase';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { logger } from '../utils/logger';
import { emailService } from './EmailService';
import bcrypt from 'bcrypt';

export class PasswordResetService {
  private db: IDatabase;

  constructor() {
    this.db = DatabaseFactory.getPrimaryDatabase();
  }

  /**
   * Send password reset code
   */
  async sendResetCode(email: string): Promise<boolean> {
    // Check if user exists
    const user = await this.db.findOne('users', { email });

    if (!user) {
      // Don't reveal if email exists for security
      logger.warn(`Password reset requested for non-existent email: ${email}`);
      return true; // Return true anyway
    }

    try {
      // Generate 6-digit code
      const code = await emailService.generateVerificationCode(email);

      logger.info(`Generated reset code for ${email}: ${code}`);

      // Send reset email
      const sent = await emailService.sendPasswordResetEmail(email, user.first_name, code);

      if (!sent) {
        logger.error(`Failed to send password reset email to ${email}`);
        throw new Error('Failed to send reset email. Please try again.');
      }

      logger.info(`Password reset code sent successfully to ${email}`);
      return true;
    } catch (error: any) {
      logger.error(`Failed to send reset code: ${error?.message}`, error);
      throw new Error(`Failed to send reset code: ${error.message}`);
    }
  }

  /**
   * Verify reset code
   */
  async verifyResetCode(email: string, code: string): Promise<boolean> {
    return await emailService.validateCode(email, code);
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<boolean> {
    // Verify AND consume the code
    const isValid = await emailService.verifyCode(email, code);

    if (!isValid) {
      throw new Error('Invalid or expired reset code');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update user password
    const updated = await this.db.update(
      'users',
      { password_hash: passwordHash },
      { email }
    );

    if (updated.length === 0) {
      throw new Error('Failed to reset password');
    }

    logger.info(`Password reset successful for ${email}`);
    return true;
  }
}

export const passwordResetService = new PasswordResetService();
