import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { IDatabase } from '../infrastructure/database/IDatabase';
import { logger } from '../utils/logger';
import { emailService } from './EmailService';
import { randomUUID } from 'crypto';
import crypto from 'crypto';

export interface InviteEmployeeData {
  companyId: string;
  invitedBy: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'employee' | 'department_manager';
  position?: string;
  departmentId?: string;
}

export interface AcceptInvitationData {
  token: string;
  password: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  biometricData?: {
    faceData?: string;
    fingerprintData?: string;
    enrollmentMethod: 'face' | 'fingerprint' | 'both';
    deviceInfo: {
      userAgent: string;
      deviceType: string;
      biometricSupport: string[];
    };
  };
}

export class EmployeeInvitationService {
  private db: IDatabase;

  constructor() {
    this.db = DatabaseFactory.getPrimaryDatabase();
  }

  /**
   * Send employee invitation
   */
  async inviteEmployee(data: InviteEmployeeData): Promise<{ invitationId: string; token: string }> {
    const { companyId, invitedBy, email, firstName, lastName, role, position, departmentId } = data;

    try {
      // Check if user already exists in this company
      const existingUser = await this.db.findOne('users', { 
        email: email.toLowerCase(),
        company_id: companyId 
      });

      if (existingUser) {
        throw new Error('User with this email already exists in your company');
      }

      // Check for pending invitation
      const pendingInvitation = await this.db.findOne('employee_invitations', {
        email: email.toLowerCase(),
        company_id: companyId,
        status: 'pending'
      });

      if (pendingInvitation) {
        throw new Error('An invitation has already been sent to this email');
      }

      // Generate secure invitation token
      const token = crypto.randomBytes(32).toString('hex');
      const invitationId = randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      // Create invitation
      await this.db.insert('employee_invitations', {
        id: invitationId,
        company_id: companyId,
        invited_by: invitedBy,
        email: email.toLowerCase(),
        first_name: firstName || null,
        last_name: lastName || null,
        role,
        position: position || null,
        department_id: departmentId || null,
        invitation_token: token,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      });

      // Get company and inviter details for email
      const company = await this.db.findOne('companies', { id: companyId });
      const inviter = await this.db.findOne('users', { id: invitedBy });

      // Send invitation email
      const invitationLink = `${process.env.FRONTEND_URL || 'https://teemplot.com'}/accept-invitation?token=${token}`;
      
      await emailService.sendEmployeeInvitation(
        email,
        firstName || 'there',
        company?.name || 'Company',
        `${inviter?.first_name || ''} ${inviter?.last_name || ''}`.trim() || 'Your team',
        role,
        invitationLink
      );

      logger.info(`Employee invitation sent to ${email} by ${invitedBy} for company ${companyId}`);

      return { invitationId, token };
    } catch (error: any) {
      logger.error(`Failed to invite employee: ${error?.message}`);
      throw error;
    }
  }

  /**
   * Get invitation by token
   */
  async getInvitationByToken(token: string) {
    try {
      const invitation = await this.db.findOne('employee_invitations', {
        invitation_token: token
      });

      if (!invitation) {
        return { status: 'not_found', invitation: null };
      }

      // Check if expired
      if (new Date(invitation.expires_at) < new Date()) {
        await this.db.update('employee_invitations', 
          { status: 'expired' },
          { id: invitation.id }
        );
        return { status: 'expired', invitation: null };
      }

      // Check if already accepted
      if (invitation.status === 'accepted') {
        return { status: 'already_accepted', invitation: null };
      }

      // Check if cancelled
      if (invitation.status === 'cancelled') {
        return { status: 'cancelled', invitation: null };
      }

      // Only return invitation if it's pending
      if (invitation.status === 'pending') {
        return { status: 'pending', invitation };
      }

      return { status: 'invalid', invitation: null };
    } catch (error: any) {
      logger.error(`Failed to get invitation: ${error?.message}`);
      return { status: 'error', invitation: null };
    }
  }

  /**
   * Accept invitation and create user account
   */
  async acceptInvitation(data: AcceptInvitationData): Promise<{ userId: string; companyId: string }> {
    const { token, password, phoneNumber, dateOfBirth, biometricData } = data;

    try {
      // Get invitation
      const result = await this.getInvitationByToken(token);

      if (result.status !== 'pending' || !result.invitation) {
        if (result.status === 'already_accepted') {
          throw new Error('This invitation has already been accepted');
        } else if (result.status === 'expired') {
          throw new Error('This invitation has expired');
        } else if (result.status === 'cancelled') {
          throw new Error('This invitation has been cancelled');
        } else {
          throw new Error('Invalid or expired invitation');
        }
      }

      const invitation = result.invitation;

      // Check if user already exists (case-insensitive email check)
      const existingUserQuery = await this.db.query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND company_id = $2 AND deleted_at IS NULL',
        [invitation.email, invitation.company_id]
      );

      if (existingUserQuery.rows && existingUserQuery.rows.length > 0) {
        throw new Error('User account already exists for this email');
      }

      // Hash password
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user account
      const userId = randomUUID();
      const employeeId = `EMP${Date.now().toString().slice(-6)}`;

      await this.db.insert('users', {
        id: userId,
        company_id: invitation.company_id,
        email: invitation.email,
        password_hash: passwordHash,
        first_name: invitation.first_name || '',
        last_name: invitation.last_name || '',
        phone_number: phoneNumber || null,
        role: invitation.role,
        employee_id: employeeId,
        position: invitation.position || null,
        department_id: invitation.department_id || null,
        date_of_birth: dateOfBirth || null,
        hire_date: new Date().toISOString().split('T')[0],
        biometric_data: biometricData ? JSON.stringify(biometricData) : null,
        is_active: true,
        email_verified: true, // Auto-verify since they accepted invitation
        created_at: new Date().toISOString(),
      });

      // Mark invitation as accepted
      await this.db.update('employee_invitations',
        {
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        },
        { id: invitation.id }
      );

      logger.info(`Employee invitation accepted: ${invitation.email} joined company ${invitation.company_id}`);

      return { userId, companyId: invitation.company_id };
    } catch (error: any) {
      logger.error(`Failed to accept invitation: ${error?.message}`);
      throw error;
    }
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(invitationId: string, companyId: string): Promise<void> {
    try {
      const invitation = await this.db.findOne('employee_invitations', {
        id: invitationId,
        company_id: companyId
      });

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      if (invitation.status !== 'pending') {
        throw new Error('Can only cancel pending invitations');
      }

      await this.db.update('employee_invitations',
        { status: 'cancelled' },
        { id: invitationId }
      );

      logger.info(`Invitation ${invitationId} cancelled`);
    } catch (error: any) {
      logger.error(`Failed to cancel invitation: ${error?.message}`);
      throw error;
    }
  }

  /**
   * List company invitations
   */
  async listCompanyInvitations(companyId: string, status?: string) {
    try {
      const conditions: any = { company_id: companyId };
      if (status) {
        conditions.status = status;
      }

      const invitations = await this.db.find('employee_invitations', conditions);
      return invitations;
    } catch (error: any) {
      logger.error(`Failed to list invitations: ${error?.message}`);
      return [];
    }
  }
}

export const employeeInvitationService = new EmployeeInvitationService();
