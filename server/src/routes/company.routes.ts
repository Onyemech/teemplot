import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';

const db = DatabaseFactory.getPrimaryDatabase();

export async function companyRoutes(fastify: FastifyInstance) {
  // Get company info
  fastify.get('/info', {
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;

      if (!userId) {
        return reply.code(401).send({ success: false, message: 'Unauthorized' });
      }

      // Get user's company
      const userQuery = await db.query(
        'SELECT company_id FROM users WHERE id = $1',
        [userId]
      );

      if (!userQuery.rows[0]) {
        return reply.code(404).send({ success: false, message: 'User not found' });
      }

      const user = userQuery.rows[0];

      // Get company details
      const companyQuery = await db.query(
        `SELECT id, name, logo_url, subscription_plan, subscription_status, 
         subscription_end_date, employee_count 
         FROM companies WHERE id = $1`,
        [user.company_id]
      );

      if (!companyQuery.rows[0]) {
        return reply.code(404).send({ success: false, message: 'Company not found' });
      }

      const company = companyQuery.rows[0];

      // Get actual current employee count
      const currentCountQuery = await db.query(
        'SELECT COUNT(*) as count FROM users WHERE company_id = $1 AND deleted_at IS NULL',
        [company.id]
      );

      const currentCount = parseInt(currentCountQuery.rows[0].count);

      return reply.send({
        success: true,
        ...company,
        current_employee_count: currentCount,
        employee_count: company.employee_count
      });
    } catch (error: any) {
      fastify.log.error('Failed to fetch company info:', error);
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Get subscription status
  fastify.get('/subscription-status', {
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;

      if (!userId) {
        return reply.code(401).send({ success: false, message: 'Unauthorized' });
      }

      // Get user's company
      const userQuery = await db.query(
        'SELECT company_id FROM users WHERE id = $1',
        [userId]
      );

      if (!userQuery.rows[0]) {
        return reply.code(404).send({ success: false, message: 'User not found' });
      }

      const user = userQuery.rows[0];

      // Get subscription details
      const companyQuery = await db.query(
        `SELECT subscription_plan, subscription_status, subscription_end_date, 
         subscription_start_date, trial_start_date, trial_end_date 
         FROM companies WHERE id = $1`,
        [user.company_id]
      );

      if (!companyQuery.rows[0]) {
        return reply.code(404).send({ success: false, message: 'Company not found' });
      }

      const company = companyQuery.rows[0];

      return reply.send({
        success: true,
        subscriptionPlan: company.subscription_plan,
        subscriptionStatus: company.subscription_status,
        subscriptionEndDate: company.subscription_end_date,
        subscriptionStartDate: company.subscription_start_date,
        trialStartDate: company.trial_start_date,
        trialEndDate: company.trial_end_date
      });
    } catch (error: any) {
      fastify.log.error('Failed to fetch subscription status:', error);
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });
}
