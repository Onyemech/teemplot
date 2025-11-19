import Fastify, { FastifyInstance } from 'fastify';
import { authRoutes } from '../../src/routes/auth.routes';
import { DatabaseFactory } from '../../src/infrastructure/database/DatabaseFactory';
import jwt from '@fastify/jwt';

describe('Auth Routes', () => {
  let app: FastifyInstance;
  let db: any;

  beforeAll(async () => {
    db = DatabaseFactory.getPrimaryDatabase();
    
    app = Fastify();
    
    // Register JWT
    await app.register(jwt, {
      secret: 'test-secret-key-for-testing-only',
    });

    // Add authenticate decorator
    app.decorate('authenticate', async function (request: any, reply: any) {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.code(401).send({ success: false, message: 'Unauthorized' });
      }
    });

    // Register routes
    await app.register(authRoutes, { prefix: '/api/auth' });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    const validPayload = {
      email: 'newuser@test.com',
      password: 'SecurePass123!',
      firstName: 'New',
      lastName: 'User',
      companyName: 'New Company',
      industry: 'Technology',
      companySize: '10-50',
      phoneNumber: '+1234567890',
      timezone: 'UTC',
    };

    it('should register successfully with valid data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: validPayload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      
      expect(body.success).toBe(true);
      expect(body.data.userId).toBeDefined();
      expect(body.data.companyId).toBeDefined();
      expect(body.data.email).toBe(validPayload.email);
      expect(body.data.verificationRequired).toBe(true);
      expect(body.message).toContain('verify');
    });

    it('should reject invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          ...validPayload,
          email: 'invalid-email',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should reject short password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          ...validPayload,
          email: 'shortpass@test.com',
          password: 'short',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should reject duplicate email', async () => {
      // First registration
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { ...validPayload, email: 'duplicate@test.com' },
      });

      // Second registration with same email
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { ...validPayload, email: 'duplicate@test.com' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toContain('already registered');
    });

    it('should reject missing required fields', async () => {
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
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('POST /api/auth/verify-email', () => {
    beforeEach(async () => {
      // Register a user first
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'verify@test.com',
          password: 'SecurePass123!',
          firstName: 'Verify',
          lastName: 'User',
          companyName: 'Verify Company',
        },
      });
    });

    it('should verify email with valid code', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/verify-email',
        payload: {
          email: 'verify@test.com',
          code: '123456',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('verified');
    });

    it('should reject invalid code format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/verify-email',
        payload: {
          email: 'verify@test.com',
          code: '12345', // Too short
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should reject invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/verify-email',
        payload: {
          email: 'invalid-email',
          code: '123456',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    beforeEach(async () => {
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
    });

    it('should resend verification code', async () => {
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

    it('should reject invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/resend-verification',
        payload: {
          email: 'invalid-email',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    const userEmail = 'login@test.com';
    const userPassword = 'SecurePass123!';

    beforeEach(async () => {
      // Register and verify user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: userEmail,
          password: userPassword,
          firstName: 'Login',
          lastName: 'User',
          companyName: 'Login Company',
        },
      });

      // Verify email
      await app.inject({
        method: 'POST',
        url: '/api/auth/verify-email',
        payload: {
          email: userEmail,
          code: '123456',
        },
      });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: userEmail,
          password: userPassword,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.success).toBe(true);
      expect(body.data.token).toBeDefined();
      expect(body.data.user).toBeDefined();
      expect(body.data.user.email).toBe(userEmail);
      expect(body.data.user.role).toBe('admin');
    });

    it('should reject invalid password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: userEmail,
          password: 'WrongPassword123!',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toContain('Invalid credentials');
    });

    it('should reject non-existent email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'nonexistent@test.com',
          password: userPassword,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toContain('Invalid credentials');
    });

    it('should reject unverified email', async () => {
      // Register new user without verification
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'unverified@test.com',
          password: 'SecurePass123!',
          firstName: 'Unverified',
          lastName: 'User',
          companyName: 'Unverified Company',
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'unverified@test.com',
          password: 'SecurePass123!',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toContain('verify');
      expect(body.requiresVerification).toBe(true);
    });

    it('should update last login timestamp', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: userEmail,
          password: userPassword,
        },
      });

      const user = await db.findOne('users', { email: userEmail });
      expect(user.last_login_at).toBeDefined();
    });
  });

  describe('GET /api/auth/me', () => {
    let token: string;
    let userId: string;

    beforeEach(async () => {
      // Register, verify, and login
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'me@test.com',
          password: 'SecurePass123!',
          firstName: 'Me',
          lastName: 'User',
          companyName: 'Me Company',
        },
      });

      const registerBody = JSON.parse(registerResponse.body);
      userId = registerBody.data.userId;

      await app.inject({
        method: 'POST',
        url: '/api/auth/verify-email',
        payload: {
          email: 'me@test.com',
          code: '123456',
        },
      });

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'me@test.com',
          password: 'SecurePass123!',
        },
      });

      const loginBody = JSON.parse(loginResponse.body);
      token = loginBody.data.token;
    });

    it('should get current user with valid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(userId);
      expect(body.data.email).toBe('me@test.com');
      expect(body.data.firstName).toBe('Me');
      expect(body.data.role).toBe('admin');
    });

    it('should reject request without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    let token: string;

    beforeEach(async () => {
      // Register, verify, and login
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'logout@test.com',
          password: 'SecurePass123!',
          firstName: 'Logout',
          lastName: 'User',
          companyName: 'Logout Company',
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/auth/verify-email',
        payload: {
          email: 'logout@test.com',
          code: '123456',
        },
      });

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'logout@test.com',
          password: 'SecurePass123!',
        },
      });

      const loginBody = JSON.parse(loginResponse.body);
      token = loginBody.data.token;
    });

    it('should logout successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Logged out');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
