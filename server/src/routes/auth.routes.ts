import { FastifyInstance } from 'fastify';
import { registrationService } from '../services/RegistrationService';
import { passwordResetService } from '../services/PasswordResetService';
import { googleAuthService } from '../services/GoogleAuthService';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
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

      const accessTokenPayload = createAccessTokenPayload({
        id: result.userId,
        companyId: result.companyId,
        email: result.email,
        role: 'owner', // Default role for new registrations
      });
      const accessToken = fastify.jwt.sign(accessTokenPayload, { expiresIn: '2h' });
      const refreshToken = fastify.jwt.sign(createRefreshTokenPayload(result.userId), { expiresIn: '30d' });

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
      const accessToken = fastify.jwt.sign(accessTokenPayload, { expiresIn: '2h' });
      const refreshToken = fastify.jwt.sign(createRefreshTokenPayload(user.id), { expiresIn: '30d' });

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

  // Login
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
      const { email, password } = sanitizeInput(rawData);

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
      const accessToken = fastify.jwt.sign(accessTokenPayload, { expiresIn: '2h' });
      const refreshToken = fastify.jwt.sign(createRefreshTokenPayload(user.id), { expiresIn: '30d' });

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

  // Owner Setup - Complete account setup from invitation
  fastify.post('/owner-setup', async (request, reply) => {
    try {
      const { token, password } = request.body as { token: string; password: string };

      if (!token || !password) {
        return reply.code(400).send({
          success: false,
          message: 'Token and password are required',
        });
      }

      // Validate password strength
      if (password.length < 8) {
        return reply.code(400).send({
          success: false,
          message: 'Password must be at least 8 characters',
        });
      }

      // Find invitation by token
      const invitation = await db.findOne('employee_invitations', { invitation_token: token });

      if (!invitation) {
        return reply.code(404).send({
          success: false,
          message: 'Invalid or expired invitation token',
        });
      }

      // Check if token is expired
      const expiry = new Date(invitation.expires_at);
      if (expiry < new Date()) {
        return reply.code(400).send({
          success: false,
          message: 'Invitation token has expired. Please contact your administrator.',
        });
      }

      // Check if already accepted
      if (invitation.status === 'accepted') {
        return reply.code(400).send({
          success: false,
          message: 'Invitation already accepted. Please login.',
        });
      }

      // Find the user account
      const user = await db.findOne('users', { 
        email: invitation.email,
        company_id: invitation.company_id 
      });

      if (!user) {
        return reply.code(404).send({
          success: false,
          message: 'User account not found',
        });
      }

      // Check if already activated
      if (user.is_active) {
        return reply.code(400).send({
          success: false,
          message: 'Account already activated. Please login.',
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Activate account
      await db.update('users', {
        password_hash: hashedPassword,
        is_active: true,
        email_verified: true,
      }, { id: user.id });

      // Mark invitation as accepted
      await db.update('employee_invitations', {
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      }, { id: invitation.id });

      logger.info({ userId: user.id, email: user.email, role: user.role }, 'Owner account activated');

      // Generate tokens
      const accessTokenPayload = createAccessTokenPayload({
        id: user.id,
        companyId: user.company_id,
        email: user.email,
        role: user.role,
      });
      const accessToken = fastify.jwt.sign(accessTokenPayload, { expiresIn: '2h' });
      const refreshToken = fastify.jwt.sign(createRefreshTokenPayload(user.id), { expiresIn: '30d' });

      // Set httpOnly cookies
      const isProduction = process.env.NODE_ENV === 'production';
      setAuthCookies(reply, accessToken, refreshToken, isProduction);

      return reply.code(200).send({
        success: true,
        message: 'Account activated successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            companyId: user.company_id,
          },
        },
      });
    } catch (error: any) {
      logger.error({ error }, 'Owner setup failed');
      return reply.code(500).send({
        success: false,
        message: 'Failed to activate account',
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
      const newAccessToken = fastify.jwt.sign(accessTokenPayload, { expiresIn: '2h' });
      const newRefreshToken = fastify.jwt.sign(createRefreshTokenPayload(user.id), { expiresIn: '30d' });

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
      const { email } = sanitizeInput(rawData);

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
      const { email, code } = VerifyEmailSchema.parse(request.body);

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
      const { email, code, password } = z.object({
        email: z.string().email(),
        code: z.string().length(6),
        password: z.string().min(8, 'Password must be at least 8 characters'),
      }).parse(request.body);

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
        const accessToken = fastify.jwt.sign(accessTokenPayload, { expiresIn: '2h' });
        const refreshToken = fastify.jwt.sign(createRefreshTokenPayload(user.id), { expiresIn: '30d' });

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
    const authUrl = customGoogleAuthService.getAuthUrl();
    return reply.redirect(authUrl);
  });

  // Google OAuth callback
  fastify.get('/google/callback', async (request, reply) => {
    try {
      const { code } = z.object({
        code: z.string(),
      }).parse(request.query);

      // Handle OAuth callback
      const result = await customGoogleAuthService.handleCallback(code);

      // Generate JWT tokens
      const accessTokenPayload = createAccessTokenPayload({
        id: result.user.id,
        companyId: result.user.company_id,
        email: result.user.email,
        role: result.user.role,
      });
      const accessToken = fastify.jwt.sign(accessTokenPayload, { expiresIn: '2h' });
      const refreshToken = fastify.jwt.sign(createRefreshTokenPayload(result.user.id), { expiresIn: '30d' });

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

      // Redirect to frontend (cookies work with subdomain)
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      // New users or users who haven't completed onboarding should go to onboarding
      // Only redirect to dashboard if onboarding is completed
      const redirectUrl = result.requiresOnboarding
        ? `${frontendUrl}/onboarding/company-setup?isNewUser=${result.isNewUser}`
        : `${frontendUrl}/dashboard`;

      return reply.redirect(redirectUrl);
    } catch (error: any) {
      logger.error({ err: error }, 'Google OAuth callback failed');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      // Handle specific error cases
      if (error.message === 'MANUAL_REGISTRATION_EXISTS') {
        return reply.redirect(`${frontendUrl}/login?error=google_auth_failed`);
      }
      
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
      const accessToken = fastify.jwt.sign(accessTokenPayload, { expiresIn: '2h' });
      const refreshToken = fastify.jwt.sign(createRefreshTokenPayload(result.user.id), { expiresIn: '30d' });

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

      return reply.code(200).send({
        success: true,
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.first_name,
            lastName: result.user.last_name,
            role: result.user.role,
            companyId: result.user.company_id,
            avatarUrl: result.user.avatar_url,
          },
          isNewUser: result.isNewUser,
          requiresOnboarding: result.requiresOnboarding,
        },
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Google OAuth verification failed');
      
      // Handle specific error cases
      if (error.message === 'MANUAL_REGISTRATION_EXISTS') {
        return reply.code(400).send({
          success: false,
          message: 'This account was registered with email and password. Please sign in using your credentials instead of Google.',
          errorCode: 'MANUAL_REGISTRATION_EXISTS',
        });
      }
      
      return reply.code(500).send({
        success: false,
        message: error.message || 'Google authentication failed',
      });
    }
  });

  // ============================================
  // BIOMETRIC AUTHENTICATION ROUTES
  // ============================================

  // Check if user has biometric enrolled
  fastify.post('/biometric/check', async (request, reply) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(request.body);

      const user = await db.query(
        'SELECT biometric_data IS NOT NULL as enrolled, biometric_enrolled_at FROM users WHERE email = $1',
        [email]
      );

      if (!user.rows[0]) {
        return reply.code(404).send({
          success: false,
          message: 'User not found'
        });
      }

      return reply.send({
        success: true,
        enrolled: user.rows[0].enrolled,
        enrolledAt: user.rows[0].biometric_enrolled_at
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to check biometric status'
      });
    }
  });

  // Generate biometric authentication challenge
  fastify.post('/biometric/challenge', async (request, reply) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(request.body);

      const user = await db.query(
        'SELECT id, biometric_data FROM users WHERE email = $1 AND biometric_data IS NOT NULL',
        [email]
      );

      if (!user.rows[0]) {
        return reply.code(404).send({
          success: false,
          message: 'User not found or biometric not enrolled'
        });
      }

      // Generate challenge
      const challenge = Array.from(crypto.getRandomValues(new Uint8Array(32)));
      
      // In a real implementation, you would store this challenge temporarily
      // and associate it with the user session
      
      // Mock credential IDs (in real implementation, get from biometric_data)
      const allowCredentials = [
        { id: Array.from(new TextEncoder().encode('mock-credential-id')) }
      ];

      return reply.send({
        success: true,
        challenge,
        allowCredentials
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to generate challenge'
      });
    }
  });

  // Verify biometric authentication
  fastify.post('/biometric/verify', async (request, reply) => {
    try {
      const { email, credentialId } = z.object({
        email: z.string().email(),
        credentialId: z.string(),
        // In real implementation, verify these fields
        authenticatorData: z.array(z.number()).optional(),
        signature: z.array(z.number()).optional(),
        clientDataJSON: z.array(z.number()).optional()
      }).parse(request.body);

      const user = await db.query(
        'SELECT * FROM users WHERE email = $1 AND biometric_data IS NOT NULL',
        [email]
      );

      if (!user.rows[0]) {
        return reply.code(404).send({
          success: false,
          message: 'User not found or biometric not enrolled'
        });
      }

      const userData = user.rows[0];

      // In real implementation, verify the WebAuthn signature
      // For now, we'll do a simple credential ID check
      const biometricData = JSON.parse(userData.biometric_data || '{}');
      
      // Mock verification (in production, use proper WebAuthn verification)
      const isValid = credentialId && credentialId.length > 0;

      if (!isValid) {
        // Log failed attempt
        await db.query(
          `INSERT INTO biometric_audit_log 
           (user_id, company_id, action, method, success, error_message, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            userData.id,
            userData.company_id,
            'authentication',
            'fingerprint',
            false,
            'Invalid credential',
            request.ip,
            request.headers['user-agent'] || null
          ]
        );

        return reply.code(401).send({
          success: false,
          message: 'Biometric authentication failed'
        });
      }

      // Update last used timestamp
      await db.query(
        'UPDATE users SET biometric_last_used = NOW() WHERE id = $1',
        [userData.id]
      );

      // Log successful authentication
      await db.query(
        `INSERT INTO biometric_audit_log 
         (user_id, company_id, action, method, success, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userData.id,
          userData.company_id,
          'authentication',
          biometricData.enrollmentMethod || 'fingerprint',
          true,
          request.ip,
          request.headers['user-agent'] || null
        ]
      );

      // Generate JWT tokens
      const accessTokenPayload = createAccessTokenPayload({
        id: userData.id,
        companyId: userData.company_id,
        email: userData.email,
        role: userData.role,
      });
      const accessToken = fastify.jwt.sign(accessTokenPayload, { expiresIn: '2h' });
      const refreshToken = fastify.jwt.sign(createRefreshTokenPayload(userData.id), { expiresIn: '30d' });

      // Set httpOnly cookies
      const isProduction = process.env.NODE_ENV === 'production';
      setAuthCookies(reply, accessToken, refreshToken, isProduction);

      return reply.send({
        success: true,
        token: accessToken,
        user: {
          id: userData.id,
          email: userData.email,
          firstName: userData.first_name,
          lastName: userData.last_name,
          role: userData.role,
          companyId: userData.company_id
        }
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Biometric verification failed'
      });
    }
  });

  // Log biometric attempt (for audit purposes)
  fastify.post('/biometric/log', async (request, reply) => {
    try {
      const { email, action, success, errorMessage, deviceInfo } = z.object({
        email: z.string().email(),
        action: z.string(),
        success: z.boolean(),
        errorMessage: z.string().optional(),
        deviceInfo: z.object({
          userAgent: z.string(),
          timestamp: z.string()
        }).optional()
      }).parse(request.body);

      const user = await db.query('SELECT id, company_id FROM users WHERE email = $1', [email]);
      
      if (user.rows[0]) {
        await db.query(
          `INSERT INTO biometric_audit_log 
           (user_id, company_id, action, method, success, error_message, device_info, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            user.rows[0].id,
            user.rows[0].company_id,
            action,
            'unknown',
            success,
            errorMessage || null,
            JSON.stringify(deviceInfo || {}),
            request.ip,
            request.headers['user-agent'] || null
          ]
        );
      }

      return reply.send({ success: true });
    } catch (error: any) {
      // Don't fail the request if logging fails
      return reply.send({ success: true });
    }
  });
}
