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

      const countsQuery = await this.db.query(
        `SELECT 
          (SELECT COUNT(*) FROM users WHERE company_id = $1 AND deleted_at IS NULL) as active_count,
          (SELECT COUNT(*) FROM employee_invitations WHERE company_id = $1 AND status = 'pending' AND expires_at > NOW()) as pending_count`,
        [company.id]
      );

      const currentCount = parseInt(countsQuery.rows[0].active_count);
      const pendingCount = parseInt(countsQuery.rows[0].pending_count);

      return {
        ...company,
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
        `SELECT subscription_plan, subscription_status, subscription_end_date, 
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
        subscriptionEndDate: company.subscription_end_date,
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
