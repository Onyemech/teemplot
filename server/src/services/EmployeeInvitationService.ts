import { pool, query, transaction } from '../config/database';
import { AppError } from '../utils/AppError';
import { emailService } from './EmailService';
import { auditService } from './AuditService';
import { generateInvitationToken } from '../utils/tokenGenerator';
import { addDays } from 'date-fns';
import { UserRole } from '../constants/roles';

interface Invitation {
  id: string;
  company_id: string;
  invited_by: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  position?: string;
  invitation_token: string;
  status: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
  transaction_id?: string;
  retry_count: number;
}

export interface InvitationResult {
  invitationId: string;
  token: string;
  currentCount: number;
  declaredLimit: number;
  remaining: number;
}

export interface PlanLimitResult {
  declaredLimit: number;
  currentCount: number;
  pendingInvitations: number;
  remaining: number;
  usagePercentage: number;
  canAddMore: boolean;
  currentPlan: 'trial' | 'silver' | 'gold';
  upgradeInfo?: {
    currentPlan: string;
    pricePerEmployee: number;
    currency: string;
  };
}

export class EmployeeInvitationService {
  async sendInvitation(
    companyId: string,
    invitedBy: string,
    invitationData: {
      email: string;
      firstName: string;
      lastName: string;
      role: UserRole;
      position?: string;
    }
  ): Promise<InvitationResult> {
    const transactionId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return await transaction(async (client) => {
      try {
        await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [companyId]);
        await client.query("SELECT set_config('app.current_user_id', $1, true)", [invitedBy]);

        await client.query('SELECT id FROM companies WHERE id = $1 FOR UPDATE', [companyId]);

        // Check if user already exists
        const userCheck = await client.query(
          'SELECT id FROM users WHERE email = $1',
          [invitationData.email.toLowerCase()]
        );

        if (userCheck.rows.length > 0) {
          throw new AppError(
            'DUPLICATE_EMAIL',
            'A user with this email already exists.',
            400,
            { email: invitationData.email }
          );
        }

        // Check for pending invitation
        const pendingCheck = await client.query(
          `SELECT id FROM employee_invitations 
           WHERE email = $1 AND status = 'pending' AND expires_at > NOW()`,
          [invitationData.email.toLowerCase()]
        );

        if (pendingCheck.rows.length > 0) {
          throw new AppError(
            'DUPLICATE_INVITATION',
            'An active invitation already exists for this email.',
            400,
            { email: invitationData.email }
          );
        }

        const limits = await this.verifyPlanLimits(companyId, client);
        if (!limits.canAddMore) {
          // Log attempt and notify admins when limit is reached
          // Note: We use a separate connection for logging so it persists even if the main transaction rolls back
          // or we just log before throwing. But since we are inside a transaction that will rollback on error,
          // the audit log inside this transaction would also rollback. 
          // However, auditService might use its own pool/query. 
          // Let's assume for now we want to throw immediately.

          throw new AppError(
            'EMPLOYEE_LIMIT_REACHED',
            `You have reached your employee limit of ${limits.declaredLimit} employees.`,
            400,
            {
              currentCount: limits.currentCount,
              limit: limits.declaredLimit,
              upgradeInfo: limits.upgradeInfo
            }
          );
        }

        // Step 2: Create invitation within transaction
        const invitation = await this.createInvitation(companyId, invitedBy, invitationData, transactionId, client);

        // Step 4: Send invitation email (queued, non-blocking)
        await this.queueInvitationEmail(invitation);

        // Step 5: Audit log the successful invitation
        if (auditService.logInvitationSentWithClient) {
          await auditService.logInvitationSentWithClient(invitedBy, companyId, invitation.id, client);
        } else {
          await auditService.logInvitationSent(invitedBy, companyId, invitation.id);
        }

        // Step 6: Get updated counters for response
        const updatedLimits = await this.verifyPlanLimits(companyId, client);

        return {
          invitationId: invitation.id,
          token: invitation.invitation_token,
          currentCount: updatedLimits.currentCount,
          declaredLimit: updatedLimits.declaredLimit,
          remaining: updatedLimits.remaining
        };

      } catch (error) {
        // No manual rollback needed, transaction wrapper handles it.
        // But we might want to log the failure outside the transaction (swallowed rollback).
        // Since we rethrow, the controller will catch it.

        // We can't use the transaction client for logging failure if it's rolling back.
        // We should log failure in the catch block of the caller or use a separate "logInvitationFailed" that uses the pool directly.
        if (auditService && auditService.logInvitationFailed) {
          // This uses global query/pool, so it persists even if transaction rolls back
          await auditService.logInvitationFailed(invitedBy, companyId, transactionId, error);
        }
        throw error;
      }
    });
  }

  /**
   * Verify subscription plan limits with comprehensive checks
   */
  async verifyPlanLimits(companyId: string, client?: any): Promise<PlanLimitResult> {
    // If client is provided, use it (assuming context is already set by caller)
    if (client) {
      return this.verifyPlanLimitsInternal(companyId, client);
    }

    // If no client provided, use transaction to ensure RLS context is set
    return await transaction(async (txClient) => {
      await txClient.query("SELECT set_config('app.current_tenant_id', $1, true)", [companyId]);
      return this.verifyPlanLimitsInternal(companyId, txClient);
    });
  }

  /**
   * Internal implementation of limit verification
   */
  private async verifyPlanLimitsInternal(companyId: string, queryExecutor: any): Promise<PlanLimitResult> {
    try {
      // Get company subscription details
      const companyResult = await queryExecutor.query(
        `SELECT plan as subscription_plan, subscription_status, employee_limit 
         FROM companies WHERE id = $1`,
        [companyId]
      );

      if (companyResult.rows.length === 0) {
        throw new AppError(
          'PLAN_VERIFICATION_FAILED',
          'Unable to verify your subscription plan.',
          500
        );
      }

      const company = companyResult.rows[0];

      // Fix: Use robust plan-based limits
      // If employee_limit is explicitly set (e.g. from a custom subscription), use it.
      // Otherwise, use defaults based on subscription status/plan.
      let totalLimit = Number(company.employee_limit ?? 0);

      if (totalLimit <= 0) {
        // Fallback to defaults if no explicit limit is set
        if (company.subscription_status === 'trial') {
          totalLimit = 50; // Trial limit
        } else if (company.subscription_plan?.includes('gold')) {
          totalLimit = 500; // Gold limit (example)
        } else {
          totalLimit = 5; // Default Silver/Free limit
        }
      }

      const countsResult = await queryExecutor.query(
        `SELECT
          (SELECT COUNT(*)
           FROM users
           WHERE company_id = $1
             AND deleted_at IS NULL
          ) AS current_count,
          (SELECT COUNT(*)
           FROM employee_invitations
           WHERE company_id = $1
             AND status = 'pending'
             AND expires_at > NOW()
          ) AS pending_invitations`,
        [companyId]
      );

      const currentCount = Number(countsResult.rows[0]?.current_count ?? 0);
      const pendingInvitations = Number(countsResult.rows[0]?.pending_invitations ?? 0);
      // totalLimit is already calculated above
      const currentUsage = currentCount + pendingInvitations;
      const remaining = Math.max(0, totalLimit - currentUsage);

      return {
        declaredLimit: totalLimit,
        currentCount,
        pendingInvitations,
        remaining,
        usagePercentage: totalLimit > 0 ? (currentUsage / totalLimit) * 100 : 0,
        canAddMore: currentUsage < totalLimit,
        currentPlan: this.determineCurrentPlan(company),
        upgradeInfo: this.getUpgradeInfo(company)
      };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        'PLAN_VERIFICATION_FAILED',
        'Unable to verify your subscription plan. Please try again or contact support.',
        500,
        {
          troubleshooting: 'Check your internet connection and ensure your subscription is active. If the problem persists, contact support with error code PLAN_VERIFICATION_FAILED.',
          originalError: (error as Error).message
        }
      );
    }
  }

  /**
   * Create invitation with transaction safety
   */
  private async createInvitation(
    companyId: string,
    invitedBy: string,
    data: {
      email: string;
      firstName: string;
      lastName: string;
      role: UserRole;
      position?: string;
    },
    transactionId: string,
    client?: any
  ): Promise<any> {
    const invitationToken = generateInvitationToken();
    const expiresAt = addDays(new Date(), 7); // 7-day expiration
    const queryExecutor = client || { query };

    const result = await queryExecutor.query(
      `INSERT INTO employee_invitations (
        company_id, invited_by, email, first_name, last_name, role, position, 
        invitation_token, status, expires_at, transaction_id, retry_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        companyId,
        invitedBy,
        data.email.toLowerCase(),
        data.firstName.trim(),
        data.lastName.trim(),
        data.role,
        data.position || 'Software Engineer',
        invitationToken,
        'pending',
        expiresAt.toISOString(),
        transactionId,
        0
      ]
    );

    if (result.rows.length === 0) {
      throw new AppError(
        'INVITATION_CREATION_FAILED',
        'Failed to create invitation. Please try again.',
        500
      );
    }

    return result.rows[0];
  }

  /**
   * Update company counters atomically
   */
  private async updateCompanyCounters(companyId: string, delta: number, client?: any): Promise<void> {
    const queryExecutor = client || { query };

    // We update the employee_count if it exists, otherwise this is a no-op 
    // as the count is often derived dynamically.
    // However, for performance caching, we might want to maintain it.
    // Given the schema analysis showed 'employee_count' exists on 'companies'.

    await queryExecutor.query(
      `UPDATE companies 
       SET employee_count = COALESCE(employee_count, 0) + $1 
       WHERE id = $2`,
      [delta, companyId]
    );
  }

  /**
   * Queue invitation email for background processing
   */
  private async queueInvitationEmail(invitation: any): Promise<void> {
    try {
      // Fetch company details to get the name
      const companyResult = await query(
        'SELECT name FROM companies WHERE id = $1',
        [invitation.company_id]
      );

      const companyName = companyResult.rows[0]?.name || 'Teemplot';

      // Fetch inviter details to get the name
      const inviterResult = await query(
        'SELECT first_name, last_name FROM users WHERE id = $1',
        [invitation.invited_by]
      );

      const inviter = inviterResult.rows[0];
      const inviterName = inviter ? `${inviter.first_name} ${inviter.last_name}` : 'A Team Member';

      // Use existing email service with retry mechanism
      await emailService.sendEmployeeInvitation(
        invitation.email,
        invitation.first_name,
        companyName, // Pass the fetched company name
        inviterName, // Pass the fetched inviter name
        invitation.role,
        `${process.env.FRONTEND_URL}/accept-invitation?token=${invitation.invitation_token}`
      );
    } catch (error) {
      // Log email failure but don't fail the invitation
      console.error('Failed to queue invitation email:', error);
      // Email will be retried by background job service
    }
  }

  /**
   * Rollback counters on transaction failure
   */
  private async rollbackCounters(companyId: string, transactionId: string): Promise<void> {
    try {
      // Check if this transaction actually updated counters
      const result = await query(
        `SELECT id FROM employee_invitations 
         WHERE company_id = $1 AND transaction_id = $2 
         LIMIT 1`,
        [companyId, transactionId]
      );

      if (result.rows.length > 0) {
        // Only rollback if the invitation was actually created
        await this.updateCompanyCounters(companyId, -1);
      }
    } catch (error) {
      console.error('Failed to rollback counters:', error);
      // Log the failure but don't throw - this is cleanup code
    }
  }

  /**
   * Determine current subscription plan
   */
  private determineCurrentPlan(company: any): 'trial' | 'silver' | 'gold' {
    if (company.subscription_status === 'trial') return 'trial';
    if (company.subscription_plan?.includes('gold')) return 'gold';
    return 'silver';
  }

  /**
   * Get upgrade information for the current plan
   */
  private getUpgradeInfo(company: any): {
    currentPlan: string;
    pricePerEmployee: number;
    currency: string;
  } | undefined {
    const currentPlan = this.determineCurrentPlan(company);

    // Define upgrade pricing based on current plan
    const upgradePricing = {
      trial: { pricePerEmployee: 1200, currency: 'NGN' },
      silver: { pricePerEmployee: 1200, currency: 'NGN' },
      gold: { pricePerEmployee: 1000, currency: 'NGN' }
    };

    return {
      currentPlan,
      ...upgradePricing[currentPlan]
    };
  }

  /**
   * Get list of pending invitations for a company
   */
  async getPendingInvitations(companyId: string): Promise<any[]> {
    const result = await query(
      `SELECT * FROM employee_invitations 
       WHERE company_id = $1 
         AND status = 'pending' 
         AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [companyId]
    );

    return result.rows || [];
  }

  /**
   * Get invitation by token (for public access)
   */
  async getInvitationByToken(token: string): Promise<any | null> {
    const result = await query(
      `SELECT i.*, c.name as company_name, c.logo_url as company_logo, c.biometrics_required 
       FROM employee_invitations i
       JOIN companies c ON i.company_id = c.id
       WHERE i.invitation_token = $1 
         AND i.status = 'pending' 
         AND i.expires_at > NOW()
       LIMIT 1`,
      [token]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Accept invitation and create user account
   */
  async acceptInvitation(data: {
    token: string;
    password: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    biometric?: {
      type: 'webauthn';
      credentialId: string;
      attestationObject?: string;
      clientDataJSON?: string;
      signCount?: number;
    };
  }): Promise<{ success: boolean; userId: string; message: string }> {
    return await transaction(async (client) => {
      // 1. Get and validate invitation
      const result = await client.query(
        `SELECT * FROM employee_invitations 
         WHERE invitation_token = $1 
           AND status = 'pending' 
           AND expires_at > NOW()
         FOR UPDATE`,
        [data.token]
      );

      if (result.rows.length === 0) {
        throw new AppError('INVALID_INVITATION', 'Invalid or expired invitation token', 400);
      }

      const invitation = result.rows[0];

      // Check company settings for biometrics requirement
      const companySettingsRes = await client.query(
        'SELECT biometrics_required FROM companies WHERE id = $1',
        [invitation.company_id]
      );
      const biometricsEnabled = Boolean(companySettingsRes.rows[0]?.biometrics_required);
      const biometricsMandatory = biometricsEnabled; // If enabled in settings, treat as mandatory

      if (biometricsEnabled && biometricsMandatory && !data.biometric) {
        throw new AppError('BIOMETRICS_REQUIRED', 'Biometrics are required by your company settings', 400);
      }

      // 2. Check if user already exists
      const userCheck = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [invitation.email]
      );

      if (userCheck.rows.length > 0) {
        throw new AppError('DUPLICATE_EMAIL', 'A user with this email already exists', 400);
      }

      // 3. Hash password
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // 4. Create user account
      const userResult = await client.query(
        `INSERT INTO users (
          company_id, email, password_hash, first_name, last_name, 
          role, position, phone_number, date_of_birth, status, email_verified, biometric_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id`,
        [
          invitation.company_id,
          invitation.email,
          hashedPassword,
          invitation.first_name,
          invitation.last_name,
          invitation.role,
          invitation.position,
          data.phoneNumber,
          data.dateOfBirth || null, // Handle empty string by converting to null
          true, // 'status' column is boolean (manually added by user), set to true for active
          true,
          (() => {
            if (!biometricsEnabled || !data.biometric) return null;
            const { createHash } = require('crypto');
            const pepper = process.env.BIOMETRIC_PEPPER || '';
            const credentialIdHash = createHash('sha256')
              .update((data.biometric.credentialId || '') + pepper)
              .digest('hex');
            return JSON.stringify({
              type: 'webauthn',
              credentialIdHash,
              signCount: data.biometric.signCount || 0,
              capturedAt: new Date().toISOString(),
              metadata: {
                hasAttestation: Boolean(data.biometric.attestationObject),
                hasClientData: Boolean(data.biometric.clientDataJSON),
              }
            });
          })()
        ]
      );

      const userId = userResult.rows[0].id;

      // 5. Update invitation status
      await client.query(
        `UPDATE employee_invitations 
         SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [invitation.id]
      );

      // 5.5 Update company employee_count cache
      await client.query(
        `UPDATE companies 
         SET employee_count = (SELECT COUNT(*) FROM users WHERE company_id = $1 AND deleted_at IS NULL)
         WHERE id = $1`,
        [invitation.company_id]
      );

      // 6. Audit log
      await auditService.logAction({
        companyId: invitation.company_id,
        userId: userId,
        action: 'accept_invitation',
        entityType: 'user',
        entityId: userId,
        newValue: { email: invitation.email, role: invitation.role, biometric: biometricsEnabled }
      });

      return {
        success: true,
        userId,
        message: 'Invitation accepted successfully. You can now log in.'
      };
    });
  }

  /**
   * List company invitations with optional status filter
   */
  async listCompanyInvitations(companyId: string, status?: string): Promise<any[]> {
    let sql = `SELECT * FROM employee_invitations WHERE company_id = $1`;
    const params: any[] = [companyId];

    if (status) {
      sql += ` AND status = $2`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC`;

    const result = await query(sql, params);

    return result.rows || [];
  }

  /**
   * Cancel a pending invitation
   */
  async cancelInvitation(invitationId: string, companyId: string, cancelledBy: string): Promise<void> {
    try {
      // Verify the invitation belongs to the company
      const fetchResult = await query(
        `SELECT * FROM employee_invitations 
         WHERE id = $1 AND company_id = $2 AND status = 'pending'`,
        [invitationId, companyId]
      );

      if (fetchResult.rows.length === 0) {
        throw new AppError(
          'INVITATION_NOT_FOUND',
          'Invitation not found or already processed.',
          404
        );
      }

      const invitation = fetchResult.rows[0];

      // Update invitation status
      const updateResult = await query(
        `UPDATE employee_invitations 
         SET status = 'cancelled', updated_at = NOW()
         WHERE id = $1`,
        [invitationId]
      );

      if (updateResult.rowCount === 0) {
        throw new AppError(
          'INVITATION_CANCEL_FAILED',
          'Failed to cancel invitation.',
          500
        );
      }

      // Update company counters
      await this.updateCompanyCounters(companyId, -1);

      // Audit log the cancellation
      if (auditService && auditService.logInvitationCancelled) {
        await auditService.logInvitationCancelled(cancelledBy, companyId, invitationId);
      }

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        'INVITATION_CANCEL_FAILED',
        'Failed to cancel invitation. Please try again.',
        500
      );
    }
  }
}

export const employeeInvitationService = new EmployeeInvitationService();
