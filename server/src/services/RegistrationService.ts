import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { IDatabase } from '../infrastructure/database/IDatabase';
import { logger } from '../utils/logger';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { emailService } from './EmailService';
import { superAdminNotificationService } from './SuperAdminNotificationService';

export interface RegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  industry?: string;
  companySize?: string;
  phoneNumber?: string;
  address?: string;
  timezone?: string;
}

export interface RegistrationResult {
  userId: string;
  companyId: string;
  email: string;
  verificationRequired: boolean;
}

export class RegistrationService {
  private db: IDatabase;
  private backupDb: IDatabase | null;

  constructor() {
    this.db = DatabaseFactory.getPrimaryDatabase();
    this.backupDb = DatabaseFactory.getBackupDatabase();
  }

  /**
   * Register new company and admin user
   */
  async register(data: RegistrationData): Promise<RegistrationResult> {
    logger.info(`Starting registration for ${data.email}`);

    // Validate email doesn't exist
    await this.validateEmail(data.email);

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Generate IDs
    const companyId = randomUUID();
    const userId = randomUUID();
    const slug = this.generateSlug(data.companyName);

    try {
      // Use transaction for atomicity
      const result = await this.db.transaction(async (db) => {
        // Create company
        const company = await db.insert('companies', {
          id: companyId,
          name: data.companyName,
          slug,
          email: data.email,
          phone_number: data.phoneNumber,
          address: data.address,
          industry: data.industry,
          company_size: data.companySize,
          timezone: data.timezone || 'UTC',
          subscription_plan: 'trial',
          subscription_status: 'active',
          is_active: true,
        });

        // Create admin user
        const user = await db.insert('users', {
          id: userId,
          company_id: companyId,
          email: data.email,
          password_hash: passwordHash,
          first_name: data.firstName,
          last_name: data.lastName,
          phone_number: data.phoneNumber,
          role: 'admin',
          is_active: true,
          email_verified: false,
        });

        return { company, user };
      });

      // Sync to backup database (non-blocking)
      this.syncToBackup(companyId, userId, data).catch((error: any) => {
        logger.error(`Failed to sync registration to backup: ${error?.message || 'Unknown error'}`);
      });

      // Send verification email
      try {
        const code = await emailService.generateVerificationCode(data.email);
        await emailService.sendVerificationEmail(data.email, data.firstName, code);
        logger.info(`Verification email sent to ${data.email}`);
      } catch (error: any) {
        logger.error(`Failed to send verification email: ${error?.message || 'Unknown error'}`);
        // Don't fail registration if email fails
      }

      // Notify superadmins of new company registration
      superAdminNotificationService.notifyNewCompany(
        companyId,
        data.companyName,
        data.email
      ).catch(error => {
        logger.error(`Failed to notify superadmin: ${error?.message || 'Unknown error'}`);
      });

      logger.info(`Registration successful - User: ${userId}, Company: ${companyId}`);

      return {
        userId,
        companyId,
        email: data.email,
        verificationRequired: true,
      };
    } catch (error: any) {
      logger.error(`Registration failed: ${error?.message || 'Unknown error'}`);
      throw new Error('Registration failed. Please try again.');
    }
  }

  /**
   * Validate email doesn't exist
   */
  private async validateEmail(email: string): Promise<void> {
    const existing = await this.db.findOne('users', { email });
    
    if (existing) {
      throw new Error('Email already registered');
    }
  }

  /**
   * Generate URL-friendly slug
   */
  private generateSlug(companyName: string): string {
    const base = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Add random suffix to ensure uniqueness
    const suffix = Math.random().toString(36).substring(2, 6);
    return `${base}-${suffix}`;
  }

  /**
   * Sync registration to backup database
   */
  private async syncToBackup(
    companyId: string,
    userId: string,
    data: RegistrationData
  ): Promise<void> {
    if (!this.backupDb) {
      return;
    }

    try {
      await this.backupDb.insert('companies', {
        id: companyId,
        name: data.companyName,
        email: data.email,
      });

      await this.backupDb.insert('users', {
        id: userId,
        company_id: companyId,
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        role: 'admin',
      });

      logger.info(`Registration synced to backup - Company: ${companyId}, User: ${userId}`);
    } catch (error: any) {
      logger.error(`Backup sync failed: ${error?.message || 'Unknown error'}`);
      // Don't throw - backup failure shouldn't break registration
    }
  }

  /**
   * Verify email with code
   */
  async verifyEmail(email: string, code: string): Promise<boolean> {
    // Verify code with email service
    const isValid = await emailService.verifyCode(email, code);
    
    if (!isValid) {
      return false;
    }

    // Mark user as verified
    const updated = await this.db.update(
      'users',
      { email_verified: true },
      { email }
    );

    return updated.length > 0;
  }

  /**
   * Resend verification code
   */
  async resendVerificationCode(email: string): Promise<void> {
    // Get user to get first name
    const user = await this.db.findOne('users', { email });
    
    if (!user) {
      throw new Error('User not found');
    }

    // Generate and send new code
    const code = await emailService.generateVerificationCode(email);
    await emailService.sendVerificationEmail(email, user.first_name, code);
    
    logger.info(`Verification code resent to ${email}`);
  }
}

export const registrationService = new RegistrationService();
