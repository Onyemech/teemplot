import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import crypto from 'crypto';

const db = DatabaseFactory.getPrimaryDatabase();

export async function employeesRoutes(fastify: FastifyInstance) {
  fastify.post('/invite', {
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { email, firstName, lastName, role, position } = request.body as any;

      if (!userId) {
        return reply.code(401).send({ success: false, message: 'Unauthorized' });
      }

      if (!email || !firstName || !lastName || !role) {
        return reply.code(400).send({ success: false, message: 'Missing required fields' });
      }

      // Get user's company and role
      const userQuery = await db.query(
        'SELECT company_id, role FROM users WHERE id = $1',
        [userId]
      );

      if (!userQuery.rows[0]) {
        return reply.code(404).send({ success: false, message: 'User not found' });
      }

      const user = userQuery.rows[0];

      if (user.role !== 'owner' && user.role !== 'admin') {
        return reply.code(403).send({ success: false, message: 'Only owners and admins can invite employees' });
      }

      // Get company details
      const companyQuery = await db.query(
        'SELECT id, name, employee_count FROM companies WHERE id = $1',
        [user.company_id]
      );

      if (!companyQuery.rows[0]) {
        return reply.code(404).send({ success: false, message: 'Company not found' });
      }

      const company = companyQuery.rows[0];

      // Check against declared employee limit
      const currentCountQuery = await db.query(
        'SELECT COUNT(*) as count FROM users WHERE company_id = $1 AND deleted_at IS NULL',
        [company.id]
      );

      const currentCount = parseInt(currentCountQuery.rows[0].count);
      const declaredLimit = company.employee_count;

      if (currentCount >= declaredLimit) {
        return reply.code(403).send({
          success: false,
          message: `You've reached your declared employee limit of ${declaredLimit} employees. Contact support to increase your limit.`,
          code: 'EMPLOYEE_LIMIT_REACHED',
          currentCount,
          declaredLimit
        });
      }

      // Check if email already exists
      const existingUserQuery = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUserQuery.rows[0]) {
        return reply.code(400).send({ success: false, message: 'User with this email already exists' });
      }

      // Check if invitation already exists
      const existingInvitationQuery = await db.query(
        'SELECT id FROM employee_invitations WHERE email = $1 AND company_id = $2 AND status = $3',
        [email, company.id, 'pending']
      );

      if (existingInvitationQuery.rows[0]) {
        return reply.code(400).send({ success: false, message: 'Invitation already sent to this email' });
      }

      // Generate invitation token
      const invitationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create invitation
      const insertQuery = await db.query(
        `INSERT INTO employee_invitations 
        (company_id, invited_by, email, first_name, last_name, role, position, invitation_token, status, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, email, first_name, last_name, role`,
        [company.id, userId, email, firstName, lastName, role, position, invitationToken, 'pending', expiresAt]
      );

      const invitation = insertQuery.rows[0];

      // Send invitation email
      const invitationLink = `${process.env.FRONTEND_URL}/accept-invitation?token=${invitationToken}`;
      
      try {
        const { emailService } = await import('../services/EmailService');
        const inviterQuery = await db.query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
        const inviterName = inviterQuery.rows[0] 
          ? `${inviterQuery.rows[0].first_name} ${inviterQuery.rows[0].last_name}`
          : 'Your team';
        
        await emailService.sendEmployeeInvitation(
          email,
          firstName,
          company.name,
          inviterName,
          role,
          invitationLink
        );
      } catch (emailError: any) {
        fastify.log.error({ error: emailError }, 'Failed to send invitation email');
        // Don't fail the request if email fails
      }

      return reply.code(201).send({
        success: true,
        message: 'Invitation sent successfully',
        invitation: {
          id: invitation.id,
          email: invitation.email,
          firstName: invitation.first_name,
          lastName: invitation.last_name,
          role: invitation.role
        }
      });
    } catch (error: any) {
      fastify.log.error('Failed to invite employee:', error);
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Get all invitations
  fastify.get('/invitations', {
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;

      if (!userId) {
        return reply.code(401).send({ success: false, message: 'Unauthorized' });
      }

      // Get user's company and role
      const userQuery = await db.query(
        'SELECT company_id, role FROM users WHERE id = $1',
        [userId]
      );

      if (!userQuery.rows[0]) {
        return reply.code(404).send({ success: false, message: 'User not found' });
      }

      const user = userQuery.rows[0];

      if (user.role !== 'owner' && user.role !== 'admin') {
        return reply.code(403).send({ success: false, message: 'Only owners and admins can view invitations' });
      }

      // Get all invitations
      const invitationsQuery = await db.query(
        'SELECT * FROM employee_invitations WHERE company_id = $1 ORDER BY created_at DESC',
        [user.company_id]
      );

      return reply.send({ success: true, data: invitationsQuery.rows });
    } catch (error: any) {
      fastify.log.error('Failed to fetch invitations:', error);
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });
}
