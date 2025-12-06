import { FastifyInstance } from 'fastify';
import { employeeInvitationService } from '../services/EmployeeInvitationService';
import { z } from 'zod';

const InviteEmployeeSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['admin', 'staff']),
  position: z.string().optional(),
  departmentId: z.string().uuid().optional(),
});

const AcceptInvitationSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

export async function employeeInvitationRoutes(fastify: FastifyInstance) {
  // Send employee invitation (Owner/Admin only)
  fastify.post('/invite', {
    preHandler: [fastify.authenticate],
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

      const result = await employeeInvitationService.inviteEmployee({
        companyId,
        invitedBy: userId,
        ...data,
      });

      return reply.code(200).send({
        success: true,
        data: result,
        message: 'Invitation sent successfully',
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to send invitation',
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
    preHandler: [fastify.authenticate],
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
    preHandler: [fastify.authenticate],
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

      await employeeInvitationService.cancelInvitation(invitationId, companyId);

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
