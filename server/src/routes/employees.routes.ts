import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { IDatabase } from '../infrastructure/database/IDatabase';
import { logger } from '../utils/logger';
import { emailService } from '../services/EmailService';
import { sanitizeInput } from '../middleware/security.middleware';
import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';

const InviteEmployeeSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  role: z.enum(['admin', 'staff']).default('staff'),
  departmentId: z.string().uuid().optional(),
  position: z.string().optional(),
});

const AcceptInvitationSchema = z.object({
  token: z.string().min(32),
  password: z.string().min(8),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
});

export async function employeesRoutes(fastify: FastifyInstance) {
  const db: IDatabase = DatabaseFactory.getPrimaryDatabase();

  // Invite Employee
  fastify.post('/invite', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = request.user.userId;
      const companyId = request.user.companyId;
      const role = request.user.role;

      // Only owners and admins can invite
      if (role !== 'owner' && role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can invite employees',
        });
      }

      const rawData = InviteEmployeeSchema.parse(request.body);
      const data = sanitizeInput(rawData);

      // Check if email already exists in company
      const existingUser = await db.findOne('users', {
        email: data.email,
        company_id: companyId,
      });

      if (existingUser) {
        return reply.code(400).send({
          success: false,
          message: 'User with this email already exists in your company',
        });
      }

      // Check if active invitation exists
      const existingInvitation = await db.findOne('employee_invitations', {
        email: data.email,
        company_id: companyId,
        status: 'pending',
      });

      if (existingInvitation) {
        return reply.code(400).send({
          success: false,
          message: 'An invitation has already been sent to this email',
        });
      }

      // Check if company has reached their declared employee count limit
      const company = await db.findOne('companies', { id: companyId });
      const declaredEmployeeCount = parseInt(company.company_size) || 1;
      
      const pendingCount = await db.count('employee_invitations', {
        company_id: companyId,
        status: 'pending',
      });

      if ((company.employee_count + pendingCount) >= declaredEmployeeCount) {
        return reply.code(400).send({
          success: false,
          message: `You have reached your declared employee limit of ${declaredEmployeeCount}. Please update your company size in settings to invite more employees.`,
        });
      }

      // Generate unique invitation token
      const invitationToken = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

      // Create invitation
      await db.insert('employee_invitations', {
        company_id: companyId,
        invited_by: userId,
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        role: data.role,
        department_id: data.departmentId,
        position: data.position,
        invitation_token: invitationToken,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      });

      // Get the created invitation
      const invitation = await db.findOne('employee_invitations', {
        invitation_token: invitationToken,
      });

      // Send invitation email (non-blocking)
      const inviter = await db.findOne('users', { id: userId });
      const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invitation?token=${invitationToken}`;

      setImmediate(async () => {
        try {
          await emailService.sendEmployeeInvitation(
            data.email,
            data.firstName || 'there',
            company.name,
            inviter.first_name + ' ' + inviter.last_name,
            data.role,
            invitationLink
          );
          logger.info({ email: data.email, companyId }, 'Invitation email sent');
        } catch (error: any) {
          logger.error({ err: error, email: data.email }, 'Failed to send invitation email');
        }
      });

      return reply.code(201).send({
        success: true,
        data: {
          invitationId: invitation?.id,
          email: data.email,
          expiresAt: expiresAt.toISOString(),
          invitationLink,
        },
        message: 'Invitation sent successfully',
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to invite employee');
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to send invitation',
      });
    }
  });

  // Get Invitation Details (public - no auth required)
  fastify.get('/invitation/:token', async (request, reply) => {
    try {
      const { token } = request.params as { token: string };

      const invitation = await db.findOne('employee_invitations', {
        invitation_token: token,
      });

      if (!invitation) {
        return reply.code(404).send({
          success: false,
          message: 'Invitation not found',
        });
      }

      // Check if expired
      if (new Date(invitation.expires_at) < new Date()) {
        await db.update('employee_invitations', { status: 'expired' }, { id: invitation.id });
        return reply.code(400).send({
          success: false,
          message: 'This invitation has expired',
        });
      }

      // Check if already accepted
      if (invitation.status !== 'pending') {
        return reply.code(400).send({
          success: false,
          message: `This invitation has been ${invitation.status}`,
        });
      }

      // Get company details
      const company = await db.findOne('companies', { id: invitation.company_id });

      return reply.code(200).send({
        success: true,
        data: {
          email: invitation.email,
          firstName: invitation.first_name,
          lastName: invitation.last_name,
          role: invitation.role,
          position: invitation.position,
          companyName: company.name,
          companyLogo: company.logo_url,
        },
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to get invitation details');
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve invitation',
      });
    }
  });

  // Accept Invitation (public - no auth required)
  fastify.post('/accept-invitation', async (request, reply) => {
    try {
      const rawData = AcceptInvitationSchema.parse(request.body);
      const data = sanitizeInput(rawData);

      const invitation = await db.findOne('employee_invitations', {
        invitation_token: data.token,
      });

      if (!invitation) {
        return reply.code(404).send({
          success: false,
          message: 'Invalid invitation token',
        });
      }

      // Check if expired
      if (new Date(invitation.expires_at) < new Date()) {
        await db.update('employee_invitations', { status: 'expired' }, { id: invitation.id });
        return reply.code(400).send({
          success: false,
          message: 'This invitation has expired',
        });
      }

      // Check if already accepted
      if (invitation.status !== 'pending') {
        return reply.code(400).send({
          success: false,
          message: `This invitation has already been ${invitation.status}`,
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 10);

      // Create user account
      await db.insert('users', {
        company_id: invitation.company_id,
        email: invitation.email,
        password_hash: passwordHash,
        first_name: data.firstName,
        last_name: data.lastName,
        role: invitation.role,
        department_id: invitation.department_id,
        position: invitation.position,
        email_verified: true, // Auto-verify since invited by admin
        is_active: true,
        hire_date: new Date().toISOString().split('T')[0],
      });

      // Get the created user
      const user = await db.findOne('users', { email: invitation.email });

      if (!user) {
        throw new Error('Failed to create user account');
      }

      // Mark invitation as accepted
      await db.update('employee_invitations', {
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      }, { id: invitation.id });

      // Employee count will auto-increment via trigger

      // Generate JWT token for auto-login
      const token = fastify.jwt.sign({
        userId: user.id,
        companyId: invitation.company_id,
        role: invitation.role,
        email: invitation.email,
      });

      // Get company details
      const company = await db.findOne('companies', { id: invitation.company_id });

      // Send welcome email (non-blocking)
      setImmediate(async () => {
        try {
          await emailService.sendWelcomeEmail(
            invitation.email,
            data.firstName,
            company.name
          );
          logger.info({ email: invitation.email }, 'Welcome email sent');
        } catch (error: any) {
          logger.error({ err: error }, 'Failed to send welcome email');
        }
      });

      return reply.code(201).send({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            companyId: invitation.company_id,
          },
        },
        message: 'Account created successfully! Welcome to the team.',
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to accept invitation');
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to accept invitation',
      });
    }
  });

  // List Invitations
  fastify.get('/invitations', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const companyId = request.user.companyId;
      const role = request.user.role;

      // Only owners and admins can view invitations
      if (role !== 'owner' && role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can view invitations',
        });
      }

      const { status } = request.query as { status?: string };

      const where: any = { company_id: companyId };
      if (status) {
        where.status = status;
      }

      const invitations = await db.find('employee_invitations', where);

      return reply.code(200).send({
        success: true,
        data: invitations,
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to list invitations');
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve invitations',
      });
    }
  });

  // Cancel Invitation
  fastify.delete('/invitation/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const companyId = request.user.companyId;
      const role = request.user.role;

      // Only owners and admins can cancel invitations
      if (role !== 'owner' && role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can cancel invitations',
        });
      }

      const invitation = await db.findOne('employee_invitations', {
        id,
        company_id: companyId,
      });

      if (!invitation) {
        return reply.code(404).send({
          success: false,
          message: 'Invitation not found',
        });
      }

      await db.update('employee_invitations', {
        status: 'cancelled',
      }, { id });

      return reply.code(200).send({
        success: true,
        message: 'Invitation cancelled successfully',
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to cancel invitation');
      return reply.code(500).send({
        success: false,
        message: 'Failed to cancel invitation',
      });
    }
  });
}
