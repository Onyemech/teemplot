import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { logger } from '../utils/logger';

export class CompanyService {
  private db;

  constructor() {
    this.db = DatabaseFactory.getPrimaryDatabase();
  }

  async getCompanyInfo(userId: string, companyId: string): Promise<any> {
    try {
      const userQuery = await this.db.query('SELECT id FROM users WHERE id = $1 AND company_id = $2', [
        userId,
        companyId,
      ]);

      if (!userQuery.rows[0]) {
        throw new Error('User not found');
      }

      const companyQuery = await this.db.query(
        `SELECT id, name, logo_url, subscription_plan, subscription_status, 
         subscription_end_date, employee_count, employee_limit 
         FROM companies WHERE id = $1`,
        [companyId]
      );

      if (!companyQuery.rows[0]) {
        throw new Error('Company not found');
      }

      const company = companyQuery.rows[0];

      // Determine the effective employee limit
      // Priority: 
      // 1. employee_limit (Schema v2)
      // 2. employee_count (User input from Onboarding)
      // 3. Defaults (50 for trial, 5 otherwise)
      
      let effectiveLimit = Number(company.employee_limit ?? 0);
      
      if (effectiveLimit === 0) {
        // Try user's input from onboarding
        const userDeclaredSize = parseInt(company.employee_count ?? 0);
        if (userDeclaredSize > 0) {
          effectiveLimit = userDeclaredSize;
        } else {
          // Fallback if no input found
          effectiveLimit = company.subscription_status === 'trial' ? 50 : 5;
        }
        
        // Self-healing: Update the DB
        this.db.query('UPDATE companies SET employee_limit = $1 WHERE id = $2', [effectiveLimit, companyId])
          .catch(err => logger.warn({ err, companyId }, 'Failed to self-heal employee_limit'));
      }

      const countsQuery = await this.db.query(
        `SELECT 
          (SELECT COUNT(*) FROM users WHERE company_id = $1 AND deleted_at IS NULL AND is_active = true) as active_count,
          (SELECT COUNT(*) FROM employee_invitations WHERE company_id = $1 AND status = 'pending' AND expires_at > NOW()) as pending_count`,
        [company.id]
      );

      const currentCount = parseInt(countsQuery.rows[0].active_count);
      const pendingCount = parseInt(countsQuery.rows[0].pending_count);

      return {
        ...company,
        employee_limit: effectiveLimit, // Return the effective limit
        current_employee_count: currentCount,
        pending_invitations_count: pendingCount
      };
    } catch (error: any) {
      logger.error({ error, userId, companyId }, 'Failed to get company info');
      throw error;
    }
  }

  async getSubscriptionStatus(userId: string, companyId: string): Promise<any> {
    try {
      const userQuery = await this.db.query('SELECT id FROM users WHERE id = $1 AND company_id = $2', [
        userId,
        companyId,
      ]);

      if (!userQuery.rows[0]) {
        throw new Error('User not found');
      }

      const companyQuery = await this.db.query(
        `SELECT subscription_plan, subscription_status, current_period_end, 
         subscription_start_date, trial_start_date, trial_end_date 
         FROM companies WHERE id = $1`,
        [companyId]
      );

      if (!companyQuery.rows[0]) {
        throw new Error('Company not found');
      }

      const company = companyQuery.rows[0];

      return {
        subscriptionPlan: company.subscription_plan,
        subscriptionStatus: company.subscription_status,
        currentPeriodEnd: company.current_period_end,
        subscriptionStartDate: company.subscription_start_date,
        trialStartDate: company.trial_start_date,
        trialEndDate: company.trial_end_date
      };
    } catch (error: any) {
      logger.error({ error, userId, companyId }, 'Failed to get subscription status');
      throw error;
    }
  }
}

export const companyService = new CompanyService();
