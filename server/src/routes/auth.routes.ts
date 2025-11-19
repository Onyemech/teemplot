import { FastifyInstance } from 'fastify';
import { registrationService } from '../services/RegistrationService';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';

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

  // Register new company and admin
  fastify.post('/register', async (request, reply) => {
    try {
      const data = RegisterSchema.parse(request.body);

      const result = await registrationService.register(data);

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

      return reply.code(200).send({
        success: true,
        message: 'Email verified successfully',
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
  fastify.post('/login', async (request, reply) => {
    try {
      const { email, password } = LoginSchema.parse(request.body);

      // Find user
      const user = await db.findOne('users', { email });

      if (!user) {
        return reply.code(401).send({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password_hash);

      if (!validPassword) {
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

      // Generate JWT token
      const token = fastify.jwt.sign({
        userId: user.id,
        companyId: user.company_id,
        role: user.role,
        email: user.email,
      });

      // Update last login
      await db.update('users', { last_login_at: new Date() }, { id: user.id });

      return reply.code(200).send({
        success: true,
        data: {
          token,
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
      return reply.code(400).send({
        success: false,
        message: error.message || 'Login failed',
      });
    }
  });

  // Get current user
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

      return reply.code(200).send({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          companyId: user.company_id,
          emailVerified: user.email_verified,
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
  fastify.post('/logout', {
    preHandler: [fastify.authenticate],
  }, async (_request, reply) => {
    // TODO: Invalidate token (add to blacklist)
    return reply.code(200).send({
      success: true,
      message: 'Logged out successfully',
    });
  });
}
