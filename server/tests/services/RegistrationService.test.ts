import { RegistrationService } from '../../src/services/RegistrationService';
import { DatabaseFactory } from '../../src/infrastructure/database/DatabaseFactory';
import bcrypt from 'bcrypt';

describe('RegistrationService', () => {
  let registrationService: RegistrationService;
  let db: any;

  beforeAll(() => {
    db = DatabaseFactory.getPrimaryDatabase();
    registrationService = new RegistrationService();
  });

  describe('register', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
      companyName: 'Test Company Inc',
      industry: 'Technology',
      companySize: '10-50',
      phoneNumber: '+1234567890',
      address: '123 Test St',
      timezone: 'America/New_York',
    };

    it('should register a new company and admin user successfully', async () => {
      const result = await registrationService.register(validRegistrationData);

      expect(result).toBeDefined();
      expect(result.userId).toBeDefined();
      expect(result.companyId).toBeDefined();
      expect(result.email).toBe(validRegistrationData.email);
      expect(result.verificationRequired).toBe(true);

      // Verify company was created
      const company = await db.findOne('companies', { id: result.companyId });
      expect(company).toBeDefined();
      expect(company.name).toBe(validRegistrationData.companyName);
      expect(company.email).toBe(validRegistrationData.email);
      expect(company.industry).toBe(validRegistrationData.industry);
      expect(company.company_size).toBe(validRegistrationData.companySize);
      expect(company.timezone).toBe(validRegistrationData.timezone);
      expect(company.subscription_plan).toBe('trial');
      expect(company.subscription_status).toBe('active');

      // Verify user was created
      const user = await db.findOne('users', { id: result.userId });
      expect(user).toBeDefined();
      expect(user.email).toBe(validRegistrationData.email);
      expect(user.first_name).toBe(validRegistrationData.firstName);
      expect(user.last_name).toBe(validRegistrationData.lastName);
      expect(user.role).toBe('admin');
      expect(user.company_id).toBe(result.companyId);
      expect(user.email_verified).toBe(0);

      // Verify password was hashed
      expect(user.password_hash).toBeDefined();
      expect(user.password_hash).not.toBe(validRegistrationData.password);
      const passwordMatch = await bcrypt.compare(
        validRegistrationData.password,
        user.password_hash
      );
      expect(passwordMatch).toBe(true);
    });

    it('should generate unique company slug', async () => {
      const data1 = { ...validRegistrationData, email: 'user1@test.com' };
      const data2 = { ...validRegistrationData, email: 'user2@test.com' };

      const result1 = await registrationService.register(data1);
      const result2 = await registrationService.register(data2);

      const company1 = await db.findOne('companies', { id: result1.companyId });
      const company2 = await db.findOne('companies', { id: result2.companyId });

      expect(company1.slug).toBeDefined();
      expect(company2.slug).toBeDefined();
      expect(company1.slug).not.toBe(company2.slug);
    });

    it('should reject duplicate email', async () => {
      await registrationService.register(validRegistrationData);

      await expect(
        registrationService.register(validRegistrationData)
      ).rejects.toThrow('Email already registered');
    });

    it('should handle missing optional fields', async () => {
      const minimalData = {
        email: 'minimal@test.com',
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Smith',
        companyName: 'Minimal Company',
      };

      const result = await registrationService.register(minimalData);

      expect(result).toBeDefined();
      expect(result.userId).toBeDefined();
      expect(result.companyId).toBeDefined();

      const company = await db.findOne('companies', { id: result.companyId });
      expect(company.timezone).toBe('UTC'); // Default value
    });

    it('should create user with correct role', async () => {
      const data = {
        ...validRegistrationData,
        email: 'admin@test.com',
      };

      const result = await registrationService.register(data);
      const user = await db.findOne('users', { id: result.userId });

      expect(user.role).toBe('admin');
    });
  });

  describe('verifyEmail', () => {
    beforeEach(async () => {
      // Create a test user
      await registrationService.register({
        email: 'verify@test.com',
        password: 'SecurePass123!',
        firstName: 'Verify',
        lastName: 'Test',
        companyName: 'Verify Company',
      });
    });

    it('should verify email successfully', async () => {
      const result = await registrationService.verifyEmail('verify@test.com', '123456');

      expect(result).toBe(true);

      // Check user is verified
      const user = await db.findOne('users', { email: 'verify@test.com' });
      expect(user.email_verified).toBe(1);
    });

    it('should return false for non-existent email', async () => {
      const result = await registrationService.verifyEmail('nonexistent@test.com', '123456');

      expect(result).toBe(false);
    });
  });

  describe('resendVerificationCode', () => {
    it('should not throw error for valid email', async () => {
      await registrationService.register({
        email: 'resend@test.com',
        password: 'SecurePass123!',
        firstName: 'Resend',
        lastName: 'Test',
        companyName: 'Resend Company',
      });

      await expect(
        registrationService.resendVerificationCode('resend@test.com')
      ).resolves.not.toThrow();
    });
  });
});
