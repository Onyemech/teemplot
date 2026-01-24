import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { webAuthnService } from '../services/WebAuthnService';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { logger } from '../utils/logger';

const db = DatabaseFactory.getPrimaryDatabase();

// Validation schemas
const RegisterBiometricSchema = z.object({
  deviceName: z.string().min(1, 'Device name is required').max(100),
  deviceType: z.enum(['fingerprint', 'face', 'voice', 'iris']).optional().default('fingerprint'),
});

const VerifyBiometricSchema = z.object({
  credentialId: z.string().min(1, 'Credential ID is required'),
  response: z.object({}).passthrough(), // WebAuthn response object
  challengeId: z.string().min(1, 'Challenge ID is required'),
});

const AuthenticateBiometricSchema = z.object({
  deviceType: z.enum(['fingerprint', 'face', 'voice', 'iris']).optional().default('fingerprint'),
});

export async function webAuthnRoutes(fastify: FastifyInstance) {
  // Generate registration options for biometric setup
  fastify.post('/register/options', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const companyId = (request.user as any).companyId;
      
      // Check if company allows biometrics
      const company = await db.findOne('companies', { id: companyId });
      if (!company?.biometrics_required) {
        return reply.code(403).send({
          success: false,
          message: 'Biometric authentication is not enabled for this company',
        });
      }

      // Check if user already has maximum allowed credentials (5 per user)
      const existingCredentials = await db.find('webauthn_credentials', { 
        user_id: userId, 
        company_id: companyId,
        is_active: true 
      });

      if (existingCredentials.length >= 5) {
        return reply.code(400).send({
          success: false,
          message: 'Maximum number of biometric credentials reached (5)',
        });
      }

      const result = await webAuthnService.generateRegistrationOptions({
        userId,
        companyId,
      });

      return reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error({ error, userId: (request.user as any).userId }, 'Failed to generate registration options');
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to generate registration options',
      });
    }
  });

  // Verify biometric registration
  fastify.post('/register/verify', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const companyId = (request.user as any).companyId;
      const body = VerifyBiometricSchema.parse(request.body);

      const result = await webAuthnService.verifyRegistration({
        userId,
        companyId,
        credentialId: body.credentialId,
        response: body.response,
        challenge: body.challengeId,
      });

      return reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error({ error, userId: (request.user as any).userId }, 'Failed to verify registration');
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to verify registration',
      });
    }
  });

  // Generate authentication options for biometric login
  fastify.post('/authenticate/options', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email, deviceType } = request.body as { email: string; deviceType?: string };
      
      if (!email) {
        return reply.code(400).send({
          success: false,
          message: 'Email is required',
        });
      }

      // Find user by email
      const user = await db.findOne('users', { email });
      if (!user) {
        return reply.code(404).send({
          success: false,
          message: 'User not found',
        });
      }

      // Check if company allows biometrics
      const company = await db.findOne('companies', { id: user.company_id });
      if (!company?.biometrics_required) {
        return reply.code(403).send({
          success: false,
          message: 'Biometric authentication is not enabled for this company',
        });
      }

      // Check if user has biometric credentials
      const hasBiometrics = await webAuthnService.hasBiometricAuth(user.id, user.company_id);
      if (!hasBiometrics) {
        return reply.code(404).send({
          success: false,
          message: 'No biometric credentials found for user',
        });
      }

      const result = await webAuthnService.generateAuthenticationOptions({
        userId: user.id,
        companyId: user.company_id,
        deviceType: deviceType as any,
      });

      return reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to generate authentication options');
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to generate authentication options',
      });
    }
  });

  // Verify biometric authentication
  fastify.post('/authenticate/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = VerifyBiometricSchema.parse(request.body);
      const { email } = request.body as { email: string };
      
      if (!email) {
        return reply.code(400).send({
          success: false,
          message: 'Email is required',
        });
      }

      // Find user by email
      const user = await db.findOne('users', { email });
      if (!user) {
        return reply.code(404).send({
          success: false,
          message: 'User not found',
        });
      }

      const result = await webAuthnService.verifyAuthentication({
        userId: user.id,
        companyId: user.company_id,
        credentialId: body.credentialId,
        response: body.response,
        challenge: body.challengeId,
      });

      // Generate JWT tokens for successful biometric authentication
      const { createAccessTokenPayload, createRefreshTokenPayload } = await import('../utils/jwt');
      const accessTokenPayload = createAccessTokenPayload({
        id: user.id,
        companyId: user.company_id,
        email: user.email,
        role: user.role,
      });
      const accessToken = fastify.jwt.sign(accessTokenPayload, { expiresIn: '15m' });
      const refreshToken = fastify.jwt.sign(createRefreshTokenPayload(user.id), { expiresIn: '7d' });

      // Set httpOnly cookies
      const { setAuthCookies } = await import('../utils/jwt');
      const isProduction = process.env.NODE_ENV === 'production';
      setAuthCookies(reply, accessToken, refreshToken, isProduction);

      // Log successful biometric authentication
      logger.info({
        userId: user.id,
        companyId: user.company_id,
        email: user.email,
        method: 'biometric',
      }, 'User authenticated via biometric authentication');

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
            companyName: (await db.findOne('companies', { id: user.company_id }))?.name,
            onboardingCompleted: (await db.findOne('companies', { id: user.company_id }))?.onboarding_completed || false,
          },
        },
        message: 'Biometric authentication successful',
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to verify biometric authentication');
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to verify biometric authentication',
      });
    }
  });

  // Get user's biometric credentials
  fastify.get('/credentials', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const companyId = (request.user as any).companyId;

      const credentials = await webAuthnService.getUserCredentials(userId, companyId);

      return reply.code(200).send({
        success: true,
        data: credentials,
      });
    } catch (error: any) {
      logger.error({ error, userId: (request.user as any).userId }, 'Failed to get user credentials');
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to get user credentials',
      });
    }
  });

  // Remove a biometric credential
  fastify.delete('/credentials/:credentialId', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const companyId = (request.user as any).companyId;
      const { credentialId } = request.params as { credentialId: string };

      const result = await webAuthnService.removeCredential(credentialId, userId, companyId);

      return reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error({ error, userId: (request.user as any).userId, credentialId: (request.params as any).credentialId }, 'Failed to remove credential');
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to remove credential',
      });
    }
  });

  // Check if user has biometric authentication enabled
  fastify.get('/status/:email', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email } = request.params as { email: string };

      if (!email) {
        return reply.code(400).send({
          success: false,
          message: 'Email is required',
        });
      }

      const user = await db.findOne('users', { email });
      if (!user) {
        return reply.code(404).send({
          success: false,
          message: 'User not found',
        });
      }

      // Check if company allows biometrics
      const company = await db.findOne('companies', { id: user.company_id });
      if (!company?.biometrics_required) {
        return reply.code(200).send({
          success: true,
          data: {
            hasBiometrics: false,
            companyEnabled: false,
            userEnabled: false,
          },
        });
      }

      const hasBiometrics = await webAuthnService.hasBiometricAuth(user.id, user.company_id);

      return reply.code(200).send({
        success: true,
        data: {
          hasBiometrics,
          companyEnabled: true,
          userEnabled: user.biometric_enabled || false,
        },
      });
    } catch (error: any) {
      logger.error({ error, email: (request.params as any).email }, 'Failed to check biometric status');
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to check biometric status',
      });
    }
  });
}