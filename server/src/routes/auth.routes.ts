import { FastifyInstance } from 'fastify';
import { registrationService } from '../services/RegistrationService';
import { passwordResetService } from '../services/PasswordResetService';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { logger } from '../utils/logger';
import {
  sanitizeInput,
  validatePasswordStrength,
  validateEmail,
  logSecurityEvent,
  detectSuspiciousActivity,
} from '../middleware/security.middleware';
import { setAuthCookies, clearAuthCookies, createAccessTokenPayload, createRefreshTokenPayload } from '../utils/jwt';

const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  companyName: z.string().min(1, 'Company name is required'),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  timezone: z.string().default('UTC'),
});

const VerifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, 'Code must be 6 digits'),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(fastify: FastifyInstance) {
  const db = DatabaseFactory.getPrimaryDatabase();

  // Test email endpoint (development only)
  fastify.post('/test-email', async (request, reply) => {
    if (process.env.NODE_ENV === 'production') {
      return reply.code(403).send({ success: false, message: 'Not available in production' });
    }

    try {
      const { email } = z.object({ email: z.string().email() }).parse(request.body);

      const { emailService } = await import('../services/EmailService');
      const code = await emailService.generateVerificationCode(email);
      const sent = await emailService.sendVerificationEmail(email, 'Test User', code);

      return reply.code(200).send({
        success: sent,
        message: sent ? `Test email sent to ${email} with code: ${code}` : 'Failed to send email',
        code: sent ? code : undefined,
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to send test email',
        error: error.toString(),
      });
    }
  });

  // Register new company and admin
  fastify.post('/register', {
    config: {
      rateLimit: {
        max: 3,
        timeWindow: '1 hour'
      }
    }
  }, async (request, reply) => {
    try {
      const rawData = RegisterSchema.parse(request.body);

      // Sanitize inputs
      const data = sanitizeInput(rawData);
      
      // Normalize email
      data.email = data.email.toLowerCase();

      // Validate password strength
      const passwordCheck = validatePasswordStrength(data.password);
      if (!passwordCheck.valid) {
        return reply.code(400).send({
          success: false,
          errors: passwordCheck.errors
        });
      }

      // Validate email
      const emailCheck = validateEmail(data.email);
      if (!emailCheck.valid) {
        return reply.code(400).send({
          success: false,
          message: emailCheck.error
        });
      }

      const result = await registrationService.register(data);

      // Generate JWT tokens and set cookies immediately after registration
      const accessTokenPayload = createAccessTokenPayload({
        id: result.userId,
        companyId: result.companyId,
        email: result.email,
        role: 'admin', // New registrations are admin users
      });
      const accessToken = fastify.jwt.sign(accessTokenPayload, { expiresIn: '15m' });
      const refreshToken = fastify.jwt.sign(createRefreshTokenPayload(result.userId), { expiresIn: '7d' });

      // Set httpOnly cookies
      const isProduction = process.env.NODE_ENV === 'production';
      setAuthCookies(reply, accessToken, refreshToken, isProduction);

      return reply.code(201).send({
        success: true,
        data: result,
        message: 'Registration successful. Please verify your email.',
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Registration failed',
      });
    }
  });

  // Verify email
  fastify.post('/verify-email', async (request, reply) => {
    try {
      const { email, code } = VerifyEmailSchema.parse(request.body);

      const verified = await registrationService.verifyEmail(email, code);

      if (!verified) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid verification code',
        });
      }

      // Get user data to generate token
      const user = await db.findOne('users', { email });
      
      if (!user) {
        return reply.code(404).send({
          success: false,
          message: 'User not found',
        });
      }

      // Generate JWT tokens
      const accessTokenPayload = createAccessTokenPayload({
        id: user.id,
        companyId: user.company_id,
        email: user.email,
        role: user.role,
      });
      const accessToken = fastify.jwt.sign(accessTokenPayload, { expiresIn: '15m' });
      const refreshToken = fastify.jwt.sign(createRefreshTokenPayload(user.id), { expiresIn: '7d' });

      // Set httpOnly cookies
      const isProduction = process.env.NODE_ENV === 'production';
      setAuthCookies(reply, accessToken, refreshToken, isProduction);

      // Get company onboarding status
      const company = await db.findOne('companies', { id: user.company_id });
      const onboardingCompleted = company?.onboarding_completed || false;

      return reply.code(200).send({
        success: true,
        message: 'Email verified successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            avatarUrl: user.avatar_url || null,
            companyId: user.company_id,
            onboardingCompleted,
          },
        },
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Verification failed',
      });
    }
  });

  // Resend verification code
  fastify.post('/resend-verification', async (request, reply) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(request.body);

      await registrationService.resendVerificationCode(email);

      return reply.code(200).send({
        success: true,
        message: 'Verification code sent',
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to resend code',
      });
    }
  });

  // Login endpoint with rate limit
  fastify.post('/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '15 minutes'
      }
    }
  }, async (request, reply) => {
    try {
      const rawData = LoginSchema.parse(request.body);
      const sanitizedData = sanitizeInput(rawData);
      
      // Normalize email to lowercase for case-insensitive login
      const email = sanitizedData.email.toLowerCase();
      const password = sanitizedData.password;

      // Find user
      const user = await db.findOne('users', { email });

      if (!user) {
        // Log failed login
        await logSecurityEvent({
          type: 'failed_login',
          ip: request.ip,
          userAgent: request.headers['user-agent'] || '',
          details: { email, reason: 'user_not_found' }
        });

        return reply.code(401).send({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Verify password
      if (!user.password_hash) {
        // User might have signed up with Google and has no password
        return reply.code(401).send({
          success: false,
          message: 'Invalid credentials. Did you sign up with Google?',
        });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);

      if (!validPassword) {
        // Log failed login
        await logSecurityEvent({
          type: 'failed_login',
          userId: user.id,
          ip: request.ip,
          userAgent: request.headers['user-agent'] || '',
          details: { email, reason: 'invalid_password' }
        });

        return reply.code(401).send({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Check if email is verified
      if (!user.email_verified) {
        return reply.code(403).send({
          success: false,
          message: 'Please verify your email first',
          requiresVerification: true,
        });
      }

      // Log successful login
      await logSecurityEvent({
        type: 'login',
        userId: user.id,
        ip: request.ip,
        userAgent: request.headers['user-agent'] || '',
        details: { email }
      });

      // Generate JWT tokens
      const accessTokenPayload = createAccessTokenPayload({
        id: user.id,
        companyId: user.company_id,
        email: user.email,
        role: user.role,
      });
      const accessToken = fastify.jwt.sign(accessTokenPayload, { expiresIn: '15m' });
      const refreshToken = fastify.jwt.sign(createRefreshTokenPayload(user.id), { expiresIn: '7d' });

      // Set httpOnly cookies
      const isProduction = process.env.NODE_ENV === 'production';
      setAuthCookies(reply, accessToken, refreshToken, isProduction);

      // Update last login
      await db.update('users', { last_login_at: new Date().toISOString() }, { id: user.id });

      // Get company onboarding status
      const company = await db.findOne('companies', { id: user.company_id });
      const onboardingCompleted = company?.onboarding_completed || false;

      return reply.code(200).send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            companyId: user.company_id,
            companyName: company?.name,
            onboardingCompleted,
          },
        },
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Login failed',
      });
    }
  });

  // Get current user with company info
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = request.user.userId;

      const user = await db.findOne('users', { id: userId });

      if (!user) {
        return reply.code(404).send({
          success: false,
          message: 'User not found',
        });
      }

      // Get company info
      const company = await db.findOne('companies', { id: user.company_id });

      return reply.code(200).send({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          avatarUrl: user.avatar_url || null,
          companyId: user.company_id,
          companyName: company?.name,
          companyLogo: company?.logo_url || null,
          subscriptionPlan: company?.subscription_plan,
          emailVerified: user.email_verified,
          onboardingCompleted: company?.onboarding_completed || false,
        },
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to get user',
      });
    }
  });

  // Logout
  fastify.post('/logout', async (_request, reply) => {
    // Clear httpOnly cookies
    clearAuthCookies(reply);
    
    return reply.code(200).send({
      success: true,
      message: 'Logged out successfully',
    });
  });

  // Refresh token endpoint
  fastify.post('/refresh', async (request, reply) => {
    try {
      const refreshToken = request.cookies.refreshToken;
      
      if (!refreshToken) {
        return reply.code(401).send({
          success: false,
          message: 'No refresh token provided',
        });
      }

      // Verify refresh token
      const decoded = fastify.jwt.verify(refreshToken) as { userId: string };
      
      // Get user data
      const user = await db.findOne('users', { id: decoded.userId });
      
      if (!user) {
        return reply.code(401).send({
          success: false,
          message: 'User not found',
        });
      }

      // Generate new tokens
      const accessTokenPayload = createAccessTokenPayload({
        id: user.id,
        companyId: user.company_id,
        email: user.email,
        role: user.role,
      });
      const newAccessToken = fastify.jwt.sign(accessTokenPayload, { expiresIn: '15m' });
      const newRefreshToken = fastify.jwt.sign(createRefreshTokenPayload(user.id), { expiresIn: '7d' });

      // Set new httpOnly cookies
      const isProduction = process.env.NODE_ENV === 'production';
      setAuthCookies(reply, newAccessToken, newRefreshToken, isProduction);

      return reply.code(200).send({
        success: true,
        message: 'Token refreshed successfully',
      });
    } catch (error: any) {
      // Invalid or expired refresh token
      clearAuthCookies(reply);
      return reply.code(401).send({
        success: false,
        message: 'Invalid refresh token',
      });
    }
  });

  // Forgot password - Send verification code
  fastify.post('/forgot-password', {
    config: {
      rateLimit: {
        max: 3,
        timeWindow: '15 minutes'
      }
    }
  }, async (request, reply) => {
    try {
      const rawData = z.object({ email: z.string().email() }).parse(request.body);
      const sanitizedData = sanitizeInput(rawData);
      const email = sanitizedData.email.toLowerCase();

      await passwordResetService.sendResetCode(email);

      // Log password reset request
      await logSecurityEvent({
        type: 'password_reset',
        ip: request.ip,
        userAgent: request.headers['user-agent'] || '',
        details: { email }
      });

      return reply.code(200).send({
        success: true,
        message: 'If an account exists with this email, a verification code has been sent.',
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to send verification code',
      });
    }
  });

  // Verify reset code
  fastify.post('/verify-reset-code', async (request, reply) => {
    try {
      const rawData = VerifyEmailSchema.parse(request.body);
      const sanitizedData = sanitizeInput(rawData);
      const email = sanitizedData.email.toLowerCase();
      const code = sanitizedData.code;

      const isValid = await passwordResetService.verifyResetCode(email, code);

      if (!isValid) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid or expired verification code',
        });
      }

      return reply.code(200).send({
        success: true,
        message: 'Code verified successfully',
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Verification failed',
      });
    }
  });

  // Reset password
  fastify.post('/reset-password', async (request, reply) => {
    try {
      const rawData = z.object({
        email: z.string().email(),
        code: z.string().length(6),
        password: z.string().min(8, 'Password must be at least 8 characters'),
      }).parse(request.body);

      // Sanitize input to ensure consistency with registration/login
      // This trims whitespace and removes potentially dangerous characters
      const sanitizedData = sanitizeInput(rawData);
      
      const email = sanitizedData.email.toLowerCase();
      const code = sanitizedData.code;
      const password = sanitizedData.password;

      // Validate password strength again after sanitization
      const passwordCheck = validatePasswordStrength(password);
      if (!passwordCheck.valid) {
        return reply.code(400).send({
          success: false,
          errors: passwordCheck.errors
        });
      }

      await passwordResetService.resetPassword(email, code, password);

      // Get user and set cookies after successful password reset
      const user = await db.findOne('users', { email });
      
      if (user) {
        // Generate JWT tokens
        const accessTokenPayload = createAccessTokenPayload({
          id: user.id,
          companyId: user.company_id,
          email: user.email,
          role: user.role,
        });
        const accessToken = fastify.jwt.sign(accessTokenPayload, { expiresIn: '15m' });
        const refreshToken = fastify.jwt.sign(createRefreshTokenPayload(user.id), { expiresIn: '7d' });

        // Set httpOnly cookies
        const isProduction = process.env.NODE_ENV === 'production';
        setAuthCookies(reply, accessToken, refreshToken, isProduction);
      }

      return reply.code(200).send({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Password reset failed',
      });
    }
  });

  // ============================================
  // CUSTOM GOOGLE OAUTH ROUTES
  // ============================================

  // Import custom Google auth service
  const { customGoogleAuthService } = await import('../services/CustomGoogleAuthService');

  // Initiate Google OAuth
  fastify.get('/google', async (_request, reply) => {
    try {
      const authUrl = customGoogleAuthService.getAuthUrl();
      logger.info({ authUrl }, 'Generated Google OAuth URL');
      return reply.redirect(authUrl);
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to generate Google OAuth URL');
      return reply.code(500).send({ success: false, message: 'Failed to initiate Google OAuth' });
    }
  });

  // Google OAuth callback
  fastify.get('/google/callback', async (request, reply) => {
    try {
      logger.info({ query: request.query }, 'Google OAuth callback received');
      
      const { code } = z.object({
        code: z.string(),
      }).parse(request.query);

      logger.info({ code }, 'Processing Google OAuth code');
      
      // Handle OAuth callback
      const result = await customGoogleAuthService.handleCallback(code);

      // Generate JWT tokens
      const accessTokenPayload = createAccessTokenPayload({
        id: result.user.id,
        companyId: result.user.company_id,
        email: result.user.email,
        role: result.user.role,
      });
      const accessToken = fastify.jwt.sign(accessTokenPayload, { expiresIn: '15m' });
      const refreshToken = fastify.jwt.sign(createRefreshTokenPayload(result.user.id), { expiresIn: '7d' });

      // Set httpOnly cookies
      const isProduction = process.env.NODE_ENV === 'production';
      setAuthCookies(reply, accessToken, refreshToken, isProduction);

      // Log successful login
      await logSecurityEvent({
        type: 'login',
        userId: result.user.id,
        ip: request.ip,
        userAgent: request.headers['user-agent'] || '',
        details: {
          email: result.user.email,
          provider: 'google',
          isNewUser: result.isNewUser
        }
      });

      // Redirect to frontend Google callback page
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      // Redirect to Google callback page which will handle the token and navigation
      const redirectUrl = `${frontendUrl}/auth/callback?token=${accessToken}&isNewUser=${result.isNewUser}&requiresOnboarding=${result.requiresOnboarding}`;
      
      logger.info({ redirectUrl, userId: result.user.id }, 'Redirecting to Google callback page');
      return reply.redirect(redirectUrl);
    } catch (error: any) {
      logger.error({ err: error, query: request.query }, 'Google OAuth callback failed');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return reply.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }
  });

  // Get Google auth status (for frontend)
  fastify.post('/google/verify', async (request, reply) => {
    try {
      const { code } = z.object({
        code: z.string(),
      }).parse(request.body);

      // Handle OAuth callback
      const result = await customGoogleAuthService.handleCallback(code);

      // Generate JWT tokens
      const accessTokenPayload = createAccessTokenPayload({
        id: result.user.id,
        companyId: result.user.company_id,
        email: result.user.email,
        role: result.user.role,
      });
      const accessToken = fastify.jwt.sign(accessTokenPayload, { expiresIn: '15m' });
      const refreshToken = fastify.jwt.sign(createRefreshTokenPayload(result.user.id), { expiresIn: '7d' });

      // Set httpOnly cookies
      const isProduction = process.env.NODE_ENV === 'production';
      setAuthCookies(reply, accessToken, refreshToken, isProduction);

      return reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Google OAuth verification failed');
      return reply.code(400).send({
        success: false,
        message: error.message || 'Google authentication failed',
      });
    }
  });
}