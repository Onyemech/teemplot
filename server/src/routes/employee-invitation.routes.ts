import { FastifyInstance } from 'fastify';
import { employeeInvitationService } from '../services/EmployeeInvitationService';
import { z } from 'zod';
import { requireOnboarding } from '../middleware/onboarding.middleware';
import { query } from '../config/database';

const InviteEmployeeSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['admin', 'manager', 'department_head', 'employee']),
  position: z.string().optional(),
});

const AcceptInvitationSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  biometric: z
    .object({
      type: z.literal('webauthn'),
      credentialId: z.string(),
      attestationObject: z.string().optional(),
      clientDataJSON: z.string().optional(),
      signCount: z.number().optional(),
    })
    .optional(),
});

export async function employeeInvitationRoutes(fastify: FastifyInstance) {
  // Helper function to get CORS headers
  const getCorsHeaders = (origin: string | undefined): Record<string, string> => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://teemplot.com',
      'https://www.teemplot.com',
      'https://teemplot.vercel.app'
    ];

    const corsHeaders: Record<string, string> = {};
    if (origin && (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development')) {
      corsHeaders['Access-Control-Allow-Origin'] = origin;
      corsHeaders['Access-Control-Allow-Credentials'] = 'true';
      corsHeaders['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
      corsHeaders['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Cache-Control, Pragma, Expires, X-Requested-With';
      corsHeaders['Access-Control-Max-Age'] = '86400'; // 24 hours
    }
    return corsHeaders;
  };

  // OPTIONS handler for CORS preflight on counter-updates
  fastify.options('/counter-updates', async (request, reply) => {
    const origin = request.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    reply.code(204).headers(corsHeaders).send();
  });

  // Real-time counter updates via Server-Sent Events
  fastify.get('/counter-updates', {
    preHandler: [fastify.authenticate, requireOnboarding],
  }, async (request, reply) => {
    try {
      const { companyId } = request.user;

      // Get CORS headers for hijacked response
      const origin = request.headers.origin;
      const corsHeaders = getCorsHeaders(origin);

      // Send initial counter data
      const limits = await employeeInvitationService.verifyPlanLimits(companyId);
      const initialData = {
        currentCount: limits.currentCount,
        declaredLimit: limits.declaredLimit,
        remaining: limits.remaining,
        planType: limits.currentPlan,
        pendingInvitations: limits.pendingInvitations
      };

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        ...corsHeaders,
      });

      reply.hijack();

      (reply.raw as any).flushHeaders?.();

      reply.raw.write('retry: 5000\n\n');
      reply.raw.write(`data: ${JSON.stringify(initialData)}\n\n`);

      const heartbeat = setInterval(() => {
        if (reply.raw.writableEnded || reply.raw.destroyed) return;
        reply.raw.write(': keep-alive\n\n');
      }, 25000);

      // Set up periodic updates (every 5 seconds)
      const interval = setInterval(async () => {
        try {
          if (reply.raw.writableEnded || reply.raw.destroyed) return;
          const updatedLimits = await employeeInvitationService.verifyPlanLimits(companyId);
          const updateData = {
            currentCount: updatedLimits.currentCount,
            declaredLimit: updatedLimits.declaredLimit,
            remaining: updatedLimits.remaining,
            planType: updatedLimits.currentPlan,
            pendingInvitations: updatedLimits.pendingInvitations
          };

          reply.raw.write(`data: ${JSON.stringify(updateData)}\n\n`);
        } catch (error) {
          console.error('Error fetching counter updates:', error);
          // Send error notification
          if (!reply.raw.writableEnded && !reply.raw.destroyed) {
            reply.raw.write(`event: error\ndata: ${JSON.stringify({ error: 'Failed to fetch updates' })}\n\n`);
          }
        }
      }, 5000);

      // Clean up on client disconnect
      const cleanup = () => {
        clearInterval(interval);
        clearInterval(heartbeat);
      };

      request.raw.once('close', cleanup);
      request.raw.once('aborted', cleanup);
      reply.raw.once('close', cleanup);

      return;

    } catch (error: any) {
      console.error('SSE setup error:', error);
      reply.code(500).send({
        success: false,
        message: 'Failed to establish real-time connection'
      });
    }
  });

  // Send employee invitation (Owner/Admin only)
  fastify.post('/invite', {
    preHandler: [
      fastify.authenticate,
      requireOnboarding,
      async (request, reply) => {
        // Import middleware dynamically to avoid circular dependencies
        const { checkEmployeeLimit } = await import('../middleware/subscription.middleware');
        await checkEmployeeLimit(request, reply);
      }
    ],
  }, async (request, reply) => {
    try {
      // Check role
      if (request.user.role !== 'owner' && request.user.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can invite employees',
        });
      }

      const data = InviteEmployeeSchema.parse(request.body);
      const { companyId, userId } = request.user;

      const result = await employeeInvitationService.sendInvitation(
        companyId,
        userId,
        data
      );

      return reply.code(200).send({
        success: true,
        data: result,
        message: 'Invitation sent successfully',
      });
    } catch (error: any) {
      console.error('Invitation error:', error);

      // Handle specific error codes with proper HTTP status codes
      if (error.code === 'EMPLOYEE_LIMIT_REACHED') {
        return reply.code(400).send({
          success: false,
          code: 'EMPLOYEE_LIMIT_REACHED',
          message: error.message,
          limit: error.details?.limit,
          upgradeInfo: error.details?.upgradeInfo,
        });
      } else if (error.code === 'PLAN_VERIFICATION_FAILED') {
        return reply.code(400).send({
          success: false,
          code: 'PLAN_VERIFICATION_FAILED',
          message: error.message,
          details: error.details,
          troubleshooting: error.details?.troubleshooting,
        });
      } else if (error.code === 'TRANSACTION_ROLLBACK') {
        return reply.code(500).send({
          success: false,
          code: 'TRANSACTION_ROLLBACK',
          message: error.message,
          details: error.details,
          troubleshooting: error.details?.troubleshooting,
        });
      } else if (error.code === 'DUPLICATE_EMAIL') {
        return reply.code(400).send({
          success: false,
          code: 'DUPLICATE_EMAIL',
          message: error.message,
          details: error.details,
          troubleshooting: error.details?.troubleshooting,
        });
      } else if (error.code === 'DUPLICATE_INVITATION') {
        return reply.code(400).send({
          success: false,
          code: 'DUPLICATE_INVITATION',
          message: error.message,
          details: error.details,
          troubleshooting: error.details?.troubleshooting,
        });
      }

      // Generic error response
      return reply.code(error.statusCode || 400).send({
        success: false,
        code: error.code || 'INVITATION_FAILED',
        message: error.message || 'Failed to send invitation',
        details: error.details,
      });
    }
  });

  // Get invitation details (public - no auth required)
  fastify.get('/invitation/:token', async (request, reply) => {
    try {
      const { token } = request.params as { token: string };

      const invitation = await employeeInvitationService.getInvitationByToken(token);

      if (!invitation) {
        return reply.code(404).send({
          success: false,
          message: 'Invalid or expired invitation',
        });
      }

      // Biometrics requirements are now returned by the service
      const biometricsEnabled = Boolean(invitation.biometrics_required);
      const biometricsMandatory = biometricsEnabled;

      // Return safe invitation details (no sensitive data)
      return reply.code(200).send({
        success: true,
        data: {
          email: invitation.email,
          firstName: invitation.first_name,
          lastName: invitation.last_name,
          role: invitation.role,
          position: invitation.position,
          companyId: invitation.company_id,
          companyName: invitation.company_name, // Added
          companyLogo: invitation.company_logo, // Added
          biometricsEnabled,
          biometricsMandatory,
        },
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to get invitation',
      });
    }
  });

  // Accept invitation (public - no auth required)
  fastify.post('/accept', async (request, reply) => {
    try {
      const data = AcceptInvitationSchema.parse(request.body);

      const result = await employeeInvitationService.acceptInvitation(data);

      return reply.code(200).send({
        success: true,
        data: result,
        message: 'Invitation accepted successfully. You can now log in.',
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to accept invitation',
      });
    }
  });

  // List company invitations (Owner/Admin only)
  fastify.get('/list', {
    preHandler: [fastify.authenticate, requireOnboarding],
  }, async (request, reply) => {
    try {
      // Check role
      if (request.user.role !== 'owner' && request.user.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can view invitations',
        });
      }

      const { companyId } = request.user;
      const { status } = request.query as { status?: string };

      const invitations = await employeeInvitationService.listCompanyInvitations(
        companyId,
        status
      );

      return reply.code(200).send({
        success: true,
        data: invitations,
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to list invitations',
      });
    }
  });

  // Cancel invitation (Owner/Admin only)
  fastify.delete('/:invitationId', {
    preHandler: [fastify.authenticate, requireOnboarding],
  }, async (request, reply) => {
    try {
      // Check role
      if (request.user.role !== 'owner' && request.user.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can cancel invitations',
        });
      }

      const { invitationId } = request.params as { invitationId: string };
      const { companyId } = request.user;

      await employeeInvitationService.cancelInvitation(invitationId, companyId, request.user.userId);

      return reply.code(200).send({
        success: true,
        message: 'Invitation cancelled successfully',
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to cancel invitation',
      });
    }
  });
}
