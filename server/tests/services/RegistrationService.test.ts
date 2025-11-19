import { RegistrationService } from '../../src/services/RegistrationService';
import { DatabaseFactory } from '../../src/infrastructure/database/DatabaseFactory';

describe('RegistrationService', () => {
  let service: RegistrationService;
  let db: any;

  beforeAll(() => {
    service = new RegistrationService();
    db = DatabaseFactory.getPrimaryDatabase();
  });

  describe('register', () => {
    const validRegistrationData = {
      email: 'admin@testcompany.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
      companyName: 'Test Company Inc',
      industry: 'technology',
      companySize: '11-50',
      phoneNumber: '+234 800 000 0000',
      address: '123 Test Street, Lagos',
      timezone: 'Africa/Lagos',
    };

    it('should successfully register a new company and admin user', async () => {
      const result = await service.register(validRegistrationData);

      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('companyId');
      expect(result.email).toBe(validRegistrationData.email);
      expect(result.verificationRequired).toBe(true);
    });

    it('should create company with correct data', async () => {
      const result = await service.register(validRegistrationData);

      const company = await db.findOne('companies', { id: result.companyId });

      expect(company).toBeDefined();
      expect(company.name).toBe(validRegistrationData.companyName);
      expect(company.email).toBe(validRegistrationData.email);
      expect(company.industry).toBe(validRegistrationData.industry);
      expect(company.timezone).toBe(validRegistrationData.timezone);
      expect(company.subscription_plan).toBe('trial');
      expect(company.is_active).toBe(true);
    });

    it('should create admin user with correct data', async () => {
      const result = await service.register(validRegistrationData);

      const user = await db.findOne('users', { id: result.userId });

      expect(user).toBeDefined();
      expect(user.email).toBe(validRegistrationData.email);
      expect(user.first_name).toBe(validRegistrationData.firstName);
      expect(user.last_name).toBe(validRegistrationData.lastName);
      expect(user.role).toBe('admin');
      expect(user.company_id).toBe(result.companyId);
      expect(user.is_active).toBe(true);
      expect(user.email_verified).toBe(false);
    });

    it('should hash password correctly', async () => {
      const result = await service.register(validRegistrationData);

      const user = await db.findOne('users', { id: result.userId });

      expect(user.password_hash).toBeDefined();
      expect(user.password_hash).not.toBe(validRegistrationData.password);
      expect(user.password_hash.length).toBeGreaterThan(50); // bcrypt hash length
    });

    it('should generate unique slug for company', async () => {
      const result1 = await service.register(validRegistrationData);
      const result2 = await service.register({
        ...validRegistrationData,
        email: 'admin2@testcompany.com',
      });

      const company1 = await db.findOne('companies', { id: result1.companyId });
      const company2 = await db.findOne('companies', { id: result2.companyId });

      expect(company1.slug).toBeDefined();
      expect(company2.slug).toBeDefined();
      expect(company1.slug).not.toBe(company2.slug);
      expect(company1.slug).toMatch(/^test-company-inc-[a-z0-9]{4}$/);
    });

    it('should reject duplicate email', async () => {
      await service.register(validRegistrationData);

      await expect(
        service.register(validRegistrationData)
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

      const result = await service.register(minimalData);

      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('companyId');

      const company = await db.findOne('companies', { id: result.companyId });
      expect(company.timezone).toBe('UTC'); // Default value
    });

    it('should rollback on error', async () => {
      // Force an error by using invalid data
      const invalidData = {
        ...validRegistrationData,
        email: '', // Invalid email
      };

      await expect(service.register(invalidData)).rejects.toThrow();

      // Verify no data was created
      const companies = await db.find('companies', {});
      const users = await db.find('users', {});

      expect(companies.length).toBe(0);
      expect(users.length).toBe(0);
    });
  });

  describe('verifyEmail', () => {
    it('should mark email as verified', async () => {
      const registrationData = {
        email: 'verify@test.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
        companyName: 'Test Company',
      };

      const result = await service.register(registrationData);
      
      const verified = await service.verifyEmail(result.email, '123456');

      expect(verified).toBe(true);

      const user = await db.findOne('users', { id: result.userId });
      expect(user.email_verified).toBe(true);
    });

    it('should return false for non-existent email', async () => {
      const verified = await service.verifyEmail('nonexistent@test.com', '123456');
      expect(verified).toBe(false);
    });
  });

  describe('Database Type Detection', () => {
    it('should use SQLite in test environment', () => {
      const db = DatabaseFactory.getPrimaryDatabase();
      expect(db.getType()).toBe('sqlite');
    });

    it('should pass health check', async () => {
      const health = await DatabaseFactory.healthCheck();
      expect(health.primary).toBe(true);
      expect(health.type).toBe('sqlite');
    });
  });
});
