"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const auth_routes_1 = require("../../src/routes/auth.routes");
const DatabaseFactory_1 = require("../../src/infrastructure/database/DatabaseFactory");
const jwt_1 = __importDefault(require("@fastify/jwt"));
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('Auth Routes', () => {
    let app;
    let db;
    (0, globals_1.beforeAll)(async () => {
        db = DatabaseFactory_1.DatabaseFactory.getPrimaryDatabase();
        app = (0, fastify_1.default)();
        // Register JWT
        await app.register(jwt_1.default, {
            secret: 'test-secret-key-for-testing-only',
        });
        // Add authenticate decorator
        app.decorate('authenticate', async function (request, reply) {
            try {
                await request.jwtVerify();
            }
            catch (err) {
                reply.code(401).send({ success: false, message: 'Unauthorized' });
            }
        });
        // Register routes
        await app.register(auth_routes_1.authRoutes, { prefix: '/api/auth' });
    });
    (0, globals_1.afterAll)(async () => {
        await app.close();
    });
    (0, globals_1.describe)('POST /api/auth/register', () => {
        const validPayload = {
            email: 'newuser@test.com',
            password: 'SecurePass123!',
            firstName: 'New',
            lastName: 'User',
            companyName: 'New Company',
            industry: 'Technology',
            companySize: '10',
            phoneNumber: '+1234567890',
            timezone: 'UTC',
        };
        (0, globals_1.it)('should register successfully with valid data', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/register',
                payload: validPayload,
            });
            (0, globals_1.expect)(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            (0, globals_1.expect)(body.success).toBe(true);
            (0, globals_1.expect)(body.data.userId).toBeDefined();
            (0, globals_1.expect)(body.data.companyId).toBeDefined();
            (0, globals_1.expect)(body.data.email).toBe(validPayload.email);
            (0, globals_1.expect)(body.data.verificationRequired).toBe(true);
            (0, globals_1.expect)(body.message).toContain('verify');
        });
        (0, globals_1.it)('should reject invalid email', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/register',
                payload: {
                    ...validPayload,
                    email: 'invalid-email',
                },
            });
            (0, globals_1.expect)(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            (0, globals_1.expect)(body.success).toBe(false);
        });
        (0, globals_1.it)('should reject short password', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/register',
                payload: {
                    ...validPayload,
                    email: 'shortpass@test.com',
                    password: 'short',
                },
            });
            (0, globals_1.expect)(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            (0, globals_1.expect)(body.success).toBe(false);
        });
        (0, globals_1.it)('should reject duplicate email', async () => {
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
            (0, globals_1.expect)(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            (0, globals_1.expect)(body.success).toBe(false);
            (0, globals_1.expect)(body.message).toContain('already registered');
        });
        (0, globals_1.it)('should reject missing required fields', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/register',
                payload: {
                    email: 'incomplete@test.com',
                    password: 'SecurePass123!',
                    // Missing firstName, lastName, companyName
                },
            });
            (0, globals_1.expect)(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            (0, globals_1.expect)(body.success).toBe(false);
        });
    });
    (0, globals_1.describe)('POST /api/auth/verify-email', () => {
        (0, globals_1.beforeEach)(async () => {
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
        (0, globals_1.it)('should verify email with valid code', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/verify-email',
                payload: {
                    email: 'verify@test.com',
                    code: '123456',
                },
            });
            (0, globals_1.expect)(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            (0, globals_1.expect)(body.success).toBe(true);
            (0, globals_1.expect)(body.message).toContain('verified');
        });
        (0, globals_1.it)('should reject invalid code format', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/verify-email',
                payload: {
                    email: 'verify@test.com',
                    code: '12345', // Too short
                },
            });
            (0, globals_1.expect)(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            (0, globals_1.expect)(body.success).toBe(false);
        });
        (0, globals_1.it)('should reject invalid email format', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/verify-email',
                payload: {
                    email: 'invalid-email',
                    code: '123456',
                },
            });
            (0, globals_1.expect)(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            (0, globals_1.expect)(body.success).toBe(false);
        });
    });
    (0, globals_1.describe)('POST /api/auth/resend-verification', () => {
        (0, globals_1.beforeEach)(async () => {
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
        (0, globals_1.it)('should resend verification code', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/resend-verification',
                payload: {
                    email: 'resend@test.com',
                },
            });
            (0, globals_1.expect)(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            (0, globals_1.expect)(body.success).toBe(true);
        });
        (0, globals_1.it)('should reject invalid email', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/resend-verification',
                payload: {
                    email: 'invalid-email',
                },
            });
            (0, globals_1.expect)(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            (0, globals_1.expect)(body.success).toBe(false);
        });
    });
    (0, globals_1.describe)('POST /api/auth/login', () => {
        const userEmail = 'login@test.com';
        const userPassword = 'SecurePass123!';
        (0, globals_1.beforeEach)(async () => {
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
        (0, globals_1.it)('should login successfully with valid credentials', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: {
                    email: userEmail,
                    password: userPassword,
                },
            });
            (0, globals_1.expect)(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            (0, globals_1.expect)(body.success).toBe(true);
            (0, globals_1.expect)(body.data.token).toBeDefined();
            (0, globals_1.expect)(body.data.user).toBeDefined();
            (0, globals_1.expect)(body.data.user.email).toBe(userEmail);
            (0, globals_1.expect)(body.data.user.role).toBe('admin');
        });
        (0, globals_1.it)('should reject invalid password', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: {
                    email: userEmail,
                    password: 'WrongPassword123!',
                },
            });
            (0, globals_1.expect)(response.statusCode).toBe(401);
            const body = JSON.parse(response.body);
            (0, globals_1.expect)(body.success).toBe(false);
            (0, globals_1.expect)(body.message).toContain('Invalid credentials');
        });
        (0, globals_1.it)('should reject non-existent email', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: {
                    email: 'nonexistent@test.com',
                    password: userPassword,
                },
            });
            (0, globals_1.expect)(response.statusCode).toBe(401);
            const body = JSON.parse(response.body);
            (0, globals_1.expect)(body.success).toBe(false);
            (0, globals_1.expect)(body.message).toContain('Invalid credentials');
        });
        (0, globals_1.it)('should reject unverified email', async () => {
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
            (0, globals_1.expect)(response.statusCode).toBe(403);
            const body = JSON.parse(response.body);
            (0, globals_1.expect)(body.success).toBe(false);
            (0, globals_1.expect)(body.message).toContain('verify');
            (0, globals_1.expect)(body.requiresVerification).toBe(true);
        });
        (0, globals_1.it)('should update last login timestamp', async () => {
            await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: {
                    email: userEmail,
                    password: userPassword,
                },
            });
            const user = await db.findOne('users', { email: userEmail });
            (0, globals_1.expect)(user.last_login_at).toBeDefined();
        });
    });
    (0, globals_1.describe)('GET /api/auth/me', () => {
        let token;
        let userId;
        (0, globals_1.beforeEach)(async () => {
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
        (0, globals_1.it)('should get current user with valid token', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/auth/me',
                headers: {
                    authorization: `Bearer ${token}`,
                },
            });
            (0, globals_1.expect)(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            (0, globals_1.expect)(body.success).toBe(true);
            (0, globals_1.expect)(body.data.id).toBe(userId);
            (0, globals_1.expect)(body.data.email).toBe('me@test.com');
            (0, globals_1.expect)(body.data.firstName).toBe('Me');
            (0, globals_1.expect)(body.data.role).toBe('admin');
        });
        (0, globals_1.it)('should reject request without token', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/auth/me',
            });
            (0, globals_1.expect)(response.statusCode).toBe(401);
        });
        (0, globals_1.it)('should reject invalid token', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/auth/me',
                headers: {
                    authorization: 'Bearer invalid-token',
                },
            });
            (0, globals_1.expect)(response.statusCode).toBe(401);
        });
    });
    (0, globals_1.describe)('POST /api/auth/logout', () => {
        let token;
        (0, globals_1.beforeEach)(async () => {
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
        (0, globals_1.it)('should logout successfully', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/logout',
                headers: {
                    authorization: `Bearer ${token}`,
                },
            });
            (0, globals_1.expect)(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            (0, globals_1.expect)(body.success).toBe(true);
            (0, globals_1.expect)(body.message).toContain('Logged out');
        });
        (0, globals_1.it)('should require authentication', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/logout',
            });
            (0, globals_1.expect)(response.statusCode).toBe(401);
        });
    });
});
//# sourceMappingURL=auth.routes.test.js.map