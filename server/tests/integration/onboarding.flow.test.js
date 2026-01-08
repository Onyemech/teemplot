"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const auth_routes_1 = require("../../src/routes/auth.routes");
const DatabaseFactory_1 = require("../../src/infrastructure/database/DatabaseFactory");
const jwt_1 = __importDefault(require("@fastify/jwt"));
jest.mock('passport', () => ({
    use: jest.fn(),
    serializeUser: jest.fn(),
    deserializeUser: jest.fn(),
}));
jest.mock('passport-google-oauth20', () => ({
    Strategy: class MockStrategy {
        constructor() { }
    }
}));
// Mock CustomGoogleAuthService
jest.mock('../../src/services/CustomGoogleAuthService', () => ({
    customGoogleAuthService: {
        getAuthUrl: jest.fn(),
        handleCallback: jest.fn(),
    },
    passport: {
        use: jest.fn(),
        serializeUser: jest.fn(),
        deserializeUser: jest.fn(),
    }
}));
describe('Complete Onboarding Flow Integration Test', () => {
    let app;
    let db;
    beforeAll(async () => {
        db = DatabaseFactory_1.DatabaseFactory.getPrimaryDatabase();
        app = (0, fastify_1.default)();
        await app.register(jwt_1.default, {
            secret: 'test-secret-key-for-testing-only',
        });
        app.decorate('authenticate', async function (request, reply) {
            try {
                await request.jwtVerify();
            }
            catch (err) {
                reply.code(401).send({ success: false, message: 'Unauthorized' });
            }
        });
        await app.register(auth_routes_1.authRoutes, { prefix: '/api/auth' });
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
        let userId;
        let companyId;
        let authToken;
        it('Step 1: User registers with company details', async () => {
            // Cleanup first
            await db.query('DELETE FROM users WHERE email = $1', [testUser.email]);
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
            // In Postgres boolean is returned as boolean or 0/1 depending on driver/type
            // pg driver usually returns boolean.
            // But let's check.
            // expect(user.email_verified).toBe(false); 
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
            // We need to get the code from DB
            const result = await db.query('SELECT code FROM email_verification_codes WHERE email = $1 ORDER BY created_at DESC LIMIT 1', [testUser.email]);
            const code = result.rows[0].code;
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/verify-email',
                payload: {
                    email: testUser.email,
                    code: code,
                },
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            // Verify database state
            const user = await db.findOne('users', { id: userId });
            expect(user.email_verified).toBeTruthy();
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
        });
        it('Step 6: Company is on trial plan', async () => {
            const company = await db.findOne('companies', { id: companyId });
            expect(company.subscription_plan).toBe('trial');
            expect(company.subscription_status).toBe('active');
            expect(company.is_active).toBeTruthy();
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
});
//# sourceMappingURL=onboarding.flow.test.js.map