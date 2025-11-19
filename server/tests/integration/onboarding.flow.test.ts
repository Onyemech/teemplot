import Fastify, { FastifyInstance } from 'fastify';
import { authRoutes } from '../../src/routes/auth.routes';
import { DatabaseFactory } from '../../src/infrastructure/database/DatabaseFactory';
import jwt from '@fastify/jwt';

describe('Complete Onboarding Flow Integration Test', () => {
  let app: FastifyInstance;
  let db: any;

  beforeAll(async () => {
    db = DatabaseFactory.getPrimaryDatabase();
    
    app = Fastify();
    
    await app.register(jwt, {
      secret: 'test-secret-key-for-testing-only',
    });

    app.decorate('authenticate', async function (request: any, reply: any) {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.code(401).send({ success: false, message: 'Unauthorized' });
      }
    });

    await app.register(authRoutes, { prefix: '/api/auth' });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Full Onboarding Journey', () => {
    const testUser = {
      email: 'onboarding@test.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
      companyName: 'Acme Corporation',
      industry: 'Technology',
      companySize: '50-100',
      phoneNumber: '+1234567890',
      address: '123 Main St, City, Country',
      timezone: 'America/New_York',
    };

    let userId: string;
    let companyId: string;
    let authToken: string;

    it('Step 1: User registers with company details', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: testUser,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);

      expect(body.success).toBe(true);
      expect(body.data.userId).toBeDefined();
      expect(body.data.companyId).toBeDefined();
      expect(body.data.verificationRequired).toBe(true);

      userId = body.data.userId;
      companyId = body.data.companyId;

      // Verify database state
      const company = await db.findOne('companies', { id: companyId });
      expect(company).toBeDefined();
      expect(company.name).toBe(testUser.companyName);
      expect(company.subscription_plan).toBe('trial');
      expect(company.subscription_status).toBe('active');

      const user = await db.findOne('users', { id: userId });
      expect(user).toBeDefined();
      expect(user.email).toBe(testUser.email);
      expect(user.role).toBe('admin');
      expect(user.email_verified).toBe(0);
    });

    it('Step 2: User cannot login without email verification', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.requiresVerification).toBe(true);
    });

    it('Step 3: User verifies email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/verify-email',
        payload: {
          email: testUser.email,
          code: '123456',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      // Verify database state
      const user = await db.findOne('users', { id: userId });
      expect(user.email_verified).toBe(1);
    });

    it('Step 4: User logs in successfully after verification', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.success).toBe(true);
      expect(body.data.token).toBeDefined();
      expect(body.data.user.id).toBe(userId);
      expect(body.data.user.companyId).toBe(companyId);
      expect(body.data.user.role).toBe('admin');

      authToken = body.data.token;

      // Verify last login was updated
      const user = await db.findOne('users', { id: userId });
      expect(user.last_login_at).toBeDefined();
    });

    it('Step 5: User can access protected routes with token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.success).toBe(true);
      expect(body.data.id).toBe(userId);
      expect(body.data.email).toBe(testUser.email);
      expect(body.data.companyId).toBe(companyId);
      expect(body.data.emailVerified).toBe(1);
    });

    it('Step 6: Company is on trial plan', async () => {
      const company = await db.findOne('companies', { id: companyId });

      expect(company.subscription_plan).toBe('trial');
      expect(company.subscription_status).toBe('active');
      expect(company.is_active).toBe(1);
    });

    it('Step 7: User can logout', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('Multiple Users Same Company Scenario', () => {
    let companyId: string;
    let adminToken: string;

    it('Admin registers and creates company', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'admin@multiuser.com',
          password: 'AdminPass123!',
          firstName: 'Admin',
          lastName: 'User',
          companyName: 'Multi User Company',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      companyId = body.data.companyId;

      // Verify and login
      await app.inject({
        method: 'POST',
        url: '/api/auth/verify-email',
        payload: {
          email: 'admin@multiuser.com',
          code: '123456',
        },
      });

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'admin@multiuser.com',
          password: 'AdminPass123!',
        },
      });

      const loginBody = JSON.parse(loginResponse.body);
      adminToken = loginBody.data.token;
    });

    it('Company data is correctly stored', async () => {
      const company = await db.findOne('companies', { id: companyId });
      
      expect(company).toBeDefined();
      expect(company.name).toBe('Multi User Company');
      expect(company.is_active).toBe(1);
    });

    it('Admin user has correct role', async () => {
      const user = await db.findOne('users', { email: 'admin@multiuser.com' });
      
      expect(user.role).toBe('admin');
      expect(user.company_id).toBe(companyId);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('User can resend verification code if not received', async () => {
      // Register
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'resend@test.com',
          password: 'SecurePass123!',
          firstName: 'Resend',
          lastName: 'User',
          companyName: 'Resend Company',
        },
      });

      // Resend verification
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/resend-verification',
        payload: {
          email: 'resend@test.com',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('User cannot register with same email twice', async () => {
      const payload = {
        email: 'duplicate@test.com',
        password: 'SecurePass123!',
        firstName: 'Duplicate',
        lastName: 'User',
        companyName: 'Duplicate Company',
      };

      // First registration
      const response1 = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload,
      });
      expect(response1.statusCode).toBe(201);

      // Second registration
      const response2 = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload,
      });
      expect(response2.statusCode).toBe(400);
      
      const body = JSON.parse(response2.body);
      expect(body.success).toBe(false);
      expect(body.message).toContain('already registered');
    });

    it('Login fails with wrong password', async () => {
      // Register and verify
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'wrongpass@test.com',
          password: 'CorrectPass123!',
          firstName: 'Wrong',
          lastName: 'Pass',
          companyName: 'Wrong Pass Company',
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/auth/verify-email',
        payload: {
          email: 'wrongpass@test.com',
          code: '123456',
        },
      });

      // Try login with wrong password
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'wrongpass@test.com',
          password: 'WrongPass123!',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('Data Validation', () => {
    it('Rejects invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'not-an-email',
          password: 'SecurePass123!',
          firstName: 'Invalid',
          lastName: 'Email',
          companyName: 'Invalid Email Company',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('Rejects short password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'short@test.com',
          password: 'short',
          firstName: 'Short',
          lastName: 'Pass',
          companyName: 'Short Pass Company',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('Rejects missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'incomplete@test.com',
          password: 'SecurePass123!',
          // Missing firstName, lastName, companyName
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
