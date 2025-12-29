import { PasswordResetService } from '../../src/services/PasswordResetService';
import { DatabaseFactory } from '../../src/infrastructure/database/DatabaseFactory';
import { emailService } from '../../src/services/EmailService';
import bcrypt from 'bcrypt';

jest.mock('../../src/services/EmailService', () => ({
  emailService: {
    generateVerificationCode: jest.fn().mockResolvedValue('123456'),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    validateCode: jest.fn(),
    verifyCode: jest.fn(),
  }
}));

describe('PasswordResetService', () => {
  let passwordResetService: PasswordResetService;
  let db: any;

  beforeAll(() => {
    db = DatabaseFactory.getPrimaryDatabase();
    passwordResetService = new PasswordResetService();
  });

  beforeEach(async () => {
    // Clean up users table
    await db.delete('users', {});
    
    // Create test user
    const passwordHash = await bcrypt.hash('OldPassword123!', 12);
    await db.insert('users', {
      id: 'test-user-id',
      company_id: 'test-company-id',
      email: 'test@example.com',
      password_hash: passwordHash,
      first_name: 'John',
      last_name: 'Doe',
      role: 'admin',
      is_active: true
    });
  });

  describe('sendResetCode', () => {
    it('should send a reset code for an existing user', async () => {
      const result = await passwordResetService.sendResetCode('test@example.com');
      
      expect(result).toBe(true);
      expect(emailService.generateVerificationCode).toHaveBeenCalledWith('test@example.com');
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        'John',
        '123456'
      );
    });

    it('should return true even if user does not exist (security)', async () => {
      const result = await passwordResetService.sendResetCode('nonexistent@example.com');
      
      expect(result).toBe(true);
      expect(emailService.generateVerificationCode).not.toHaveBeenCalledWith('nonexistent@example.com');
    });
  });

  describe('verifyResetCode', () => {
    it('should call emailService.validateCode', async () => {
      (emailService.validateCode as jest.Mock).mockResolvedValue(true);
      
      const result = await passwordResetService.verifyResetCode('test@example.com', '123456');
      
      expect(result).toBe(true);
      expect(emailService.validateCode).toHaveBeenCalledWith('test@example.com', '123456');
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset password with valid code', async () => {
      (emailService.verifyCode as jest.Mock).mockResolvedValue(true);
      
      const newPassword = 'NewSecurePass123!';
      const result = await passwordResetService.resetPassword('test@example.com', '123456', newPassword);
      
      expect(result).toBe(true);
      
      // Verify password was updated in DB
      const user = await db.findOne('users', { email: 'test@example.com' });
      const passwordMatch = await bcrypt.compare(newPassword, user.password_hash);
      expect(passwordMatch).toBe(true);
    });

    it('should throw error for invalid code', async () => {
      (emailService.verifyCode as jest.Mock).mockResolvedValue(false);
      
      await expect(
        passwordResetService.resetPassword('test@example.com', 'invalid', 'newPass')
      ).rejects.toThrow('Invalid or expired reset code');
    });

    it('should throw error if user not found during update', async () => {
      (emailService.verifyCode as jest.Mock).mockResolvedValue(true);
      
      await expect(
        passwordResetService.resetPassword('wrong@example.com', '123456', 'newPass')
      ).rejects.toThrow('Failed to reset password');
    });
  });
});
