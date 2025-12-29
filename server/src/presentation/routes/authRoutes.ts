import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../../application/services/AuthService';
import { UserRepository, SuperAdminRepository } from '../../infrastructure/repositories/UserRepository';
import { CompanyRepository } from '../../infrastructure/repositories/CompanyRepository';
import { config_env } from '../../config/environment';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().optional(),
  companyName: z.string().min(1),
  companySlug: z.string().min(1).regex(/^[a-z0-9-]+$/),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  companySlug: z.string().optional(),
});

const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const sendCodeSchema = z.object({
  email: z.string().email(),
});

export async function authRoutes(server: FastifyInstance) {
  const userRepo = new UserRepository();
  const superAdminRepo = new SuperAdminRepository();
  const companyRepo = new CompanyRepository();
  const authService = new AuthService(userRepo, superAdminRepo, companyRepo);

  server.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = registerSchema.parse(request.body);

    const { user, company } = await authService.registerAdmin(body);

    const code = await authService.sendVerificationCode(user.email);

    const accessToken = server.jwt.sign({
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
    });

    return reply.code(201).send({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
      },
      accessToken,
      message: 'Registration successful. Please verify your email.',
    });
  });

  server.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = loginSchema.parse(request.body);

    const user = await authService.loginUser(body);

    const accessToken = server.jwt.sign({
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
    });

    const refreshToken = server.jwt.sign(
      { userId: user.id },
      { expiresIn: config_env.jwt.refreshExpiresIn }
    );

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config_env.isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        emailVerified: user.emailVerified,
        companyId: user.companyId,
      },
      accessToken,
    });
  });

  server.post('/superadmin/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = loginSchema.parse(request.body);

    const admin = await authService.loginSuperAdmin(body);

    const accessToken = server.jwt.sign({
      superAdminId: admin.id,
      role: 'superadmin',
    });

    return reply.send({
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
      },
      accessToken,
    });
  });

  server.post('/send-verification-code', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = sendCodeSchema.parse(request.body);

    await authService.sendVerificationCode(body.email);

    return reply.send({
      message: 'Verification code sent successfully',
    });
  });

  server.post('/verify-email', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = verifyEmailSchema.parse(request.body);

    const isValid = await authService.verifyCode(body.email, body.code);

    if (!isValid) {
      return reply.code(400).send({
        error: 'Invalid or expired verification code',
      });
    }

    return reply.send({
      message: 'Email verified successfully',
    });
  });

  server.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.clearCookie('refreshToken');

    return reply.send({
      message: 'Logged out successfully',
    });
  });

  server.get('/me', {
    onRequest: [server.authenticate as any],
  }, async (request: any, reply: FastifyReply) => {
    try {
      const { userId, superAdminId } = request.user;

      if (userId) {
        const user = await userRepo.findById(userId);
        if (!user) {
          return reply.code(404).send({ 
            success: false,
            message: 'User not found'
          });
        }

        return reply.send({
          success: true,
          data: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            companyId: user.companyId,
            emailVerified: user.emailVerified,
          },
        });
      }

      if (superAdminId) {
        const admin = await superAdminRepo.findById(superAdminId);
        if (!admin) {
          return reply.code(404).send({ 
            success: false,
            message: 'Admin not found'
          });
        }

        return reply.send({
          success: true,
          data: {
            id: admin.id,
            email: admin.email,
            firstName: admin.firstName,
            lastName: admin.lastName,
            role: 'superadmin',
          },
        });
      }

      return reply.code(401).send({ 
        success: false,
        message: 'Unauthorized'
      });
    } catch (error) {
      console.error('Error in /me endpoint:', error);
      return reply.code(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  });
}
