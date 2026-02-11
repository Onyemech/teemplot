import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { paymentService } from '../services/payment/PaymentService';
import { logger } from '../utils/logger';
import { z } from 'zod';

const UpgradeEmployeeLimitSchema = z.object({
  additionalEmployees: z.number().int().min(1).max(100),
});

const VerifyPaymentSchema = z.object({
  reference: z.string(),
});

export async function subscriptionRoutes(fastify: FastifyInstance) {
  /**
   * Initiate employee limit upgrade payment
   */
  fastify.post('/upgrade-employee-limit', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId, userId, role } = request.user as any;

      // Only owners and admins can upgrade
      if (role !== 'owner' && role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can upgrade employee limits',
        });
      }

      const { additionalEmployees } = UpgradeEmployeeLimitSchema.parse(request.body);

      // Get company and calculate cost
      const { DatabaseFactory } = await import('../infrastructure/database/DatabaseFactory');
      const db = DatabaseFactory.getPrimaryDatabase();
      const company = await db.findOne('companies', { id: companyId });

      if (!company) {
        return reply.code(404).send({
          success: false,
          message: 'Company not found',
        });
      }

      // Get plan pricing
      const planPrices: Record<string, number> = {
        silver_monthly: parseInt(process.env.SILVER_MONTHLY_PLAN || '1200'),
        silver_yearly: parseInt(process.env.SILVER_YEARLY_PLAN || '12000'),
        gold_monthly: parseInt(process.env.GOLD_MONTHLY_PLAN || '2500'),
        gold_yearly: parseInt(process.env.GOLD_YEARLY_PLAN || '25000'),
      };

      const currentPlan = company.subscription_plan || 'silver_monthly';
      const pricePerEmployee = planPrices[currentPlan] || 1200; // NGN
      // Proration based on remaining days in current period
      const periodEnd = company.current_period_end ? new Date(company.current_period_end) : null;
      const now = new Date();
      const periodDays = currentPlan.includes('yearly') ? 365 : 30;
      let remainingRatio = 1;
      if (periodEnd && periodEnd > now) {
        const msLeft = periodEnd.getTime() - now.getTime();
        const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
        remainingRatio = Math.max(0, Math.min(1, daysLeft / periodDays));
      }
      const totalAmount = Math.round(additionalEmployees * pricePerEmployee * remainingRatio * 100); // kobo

      // Initiate payment
      const payment = await paymentService.initiatePayment({
        companyId,
        userId,
        amount: totalAmount,
        currency: 'NGN',
        purpose: 'employee_limit_upgrade',
        metadata: {
          additionalEmployees,
          currentPlan,
          pricePerEmployee,
          currentLimit: parseInt(company.employee_count) || 1,
        },
      });

      logger.info({ companyId, additionalEmployees, totalAmount }, 'Employee limit upgrade initiated');

      return reply.send({
        success: true,
        data: {
          paymentId: payment.paymentId,
          reference: payment.reference,
          authorizationUrl: payment.authorizationUrl,
          provider: payment.provider,
          amount: totalAmount,
          currency: 'NGN',
          additionalEmployees,
        },
        message: 'Payment initiated. Redirect user to authorization URL.',
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to initiate employee limit upgrade');
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to initiate upgrade',
      });
    }
  });

  /**
   * Initiate subscription payment (for Silver plans during onboarding)
   */
  fastify.post('/initiate-subscription', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId, userId } = request.user as any;
      const { plan } = request.body as { plan: string; companySize?: number };

      if (!plan) {
        return reply.code(400).send({
          success: false,
          message: 'Plan is required',
        });
      }

      // Get plan pricing
      const planPrices: Record<string, number> = {
        silver_monthly: parseInt(process.env.SILVER_MONTHLY_PLAN || '1200'),
        silver_yearly: parseInt(process.env.SILVER_YEARLY_PLAN || '12000'),
        gold_monthly: parseInt(process.env.GOLD_MONTHLY_PLAN || '2500'),
        gold_yearly: parseInt(process.env.GOLD_YEARLY_PLAN || '25000'),
      };
      const { DatabaseFactory } = await import('../infrastructure/database/DatabaseFactory');
      const db = DatabaseFactory.getPrimaryDatabase();
      const company = await db.findOne('companies', { id: companyId });
      const currentPlan = company?.subscription_plan || 'silver_monthly';
      if (String(currentPlan).startsWith('gold') && String(plan).startsWith('silver')) {
        return reply.code(400).send({
          success: false,
          message: 'Downgrade not allowed during an active Gold period. Select a Gold plan or wait until the current period ends.'
        });
      }

      const pricePerEmployee = planPrices[plan];
      if (!pricePerEmployee) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid plan selected',
        });
      }

      // Seat-based on total employees (users + pending invitations)
      // Only count active users (suspended users don't take up a seat)
      const countsRes = await db.query(
        `SELECT 
           (SELECT COUNT(*) FROM users WHERE company_id = $1 AND deleted_at IS NULL AND is_active = true) AS active_count,
           (SELECT COUNT(*) FROM employee_invitations WHERE company_id = $1 AND status = 'pending' AND expires_at > NOW()) AS pending_count`,
        [companyId]
      );
      const totalSeats = parseInt(countsRes.rows[0]?.active_count || '0') + parseInt(countsRes.rows[0]?.pending_count || '0');
      const seats = Math.max(1, totalSeats);
      const totalAmount = seats * pricePerEmployee * 100; // kobo

      // Initiate payment
      const payment = await paymentService.initiatePayment({
        companyId,
        userId,
        amount: totalAmount,
        currency: 'NGN',
        purpose: 'subscription',
        metadata: {
          plan,
          seats,
          pricePerEmployee,
        },
      });

      logger.info({ companyId, plan, totalAmount }, 'Subscription payment initiated');

      return reply.send({
        success: true,
        data: {
          paymentId: payment.paymentId,
          reference: payment.reference,
          authorizationUrl: payment.authorizationUrl,
          provider: payment.provider,
          amount: totalAmount,
          currency: 'NGN',
        },
        message: 'Payment initiated. Redirect user to authorization URL.',
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to initiate subscription payment');
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to initiate payment',
      });
    }
  });

  fastify.get('/prices', {
    preHandler: [fastify.authenticate],
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const prices = {
        silver_monthly: parseInt(process.env.SILVER_MONTHLY_PLAN || '1200'),
        silver_yearly: parseInt(process.env.SILVER_YEARLY_PLAN || '12000'),
        gold_monthly: parseInt(process.env.GOLD_MONTHLY_PLAN || '2500'),
        gold_yearly: parseInt(process.env.GOLD_YEARLY_PLAN || '25000'),
        currency: 'NGN'
      }
      return reply.send({ success: true, data: prices })
    } catch (error: any) {
      return reply.code(500).send({ success: false, message: 'Failed to load prices' })
    }
  })

  /**
   * Verify and fulfill payment
   */
  fastify.post('/verify-payment', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { reference } = VerifyPaymentSchema.parse(request.body);
      const { companyId } = request.user as any;

      // Get payment and verify it belongs to this company
      const payment = await paymentService.getPaymentByReference(reference);
      
      if (!payment) {
        return reply.code(404).send({
          success: false,
          message: 'Payment not found',
        });
      }

      if (payment.company_id !== companyId) {
        return reply.code(403).send({
          success: false,
          message: 'Unauthorized access to payment',
        });
      }

      // Verify and fulfill payment
      const result = await paymentService.fulfillPayment(reference);

      logger.info({ reference, companyId }, 'Payment verified and fulfilled');

      return reply.send({
        success: true,
        data: {
          reference,
          status: 'completed',
          purpose: payment.purpose,
        },
        message: result.message,
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to verify payment');
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to verify payment',
      });
    }
  });

  /**
   * Webhook endpoint for payment providers (public - no auth)
   */
  fastify.post('/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Verify webhook signature based on provider
      const provider = process.env.PAYMENT_PROVIDER || 'paystack';
      
      if (provider === 'paystack') {
        const hash = request.headers['x-paystack-signature'];
        const secret = process.env.PAYSTACK_SECRET_KEY || '';
        
        // Verify signature
        const crypto = await import('crypto');
        const expectedHash = crypto
          .createHmac('sha512', secret)
          .update(JSON.stringify(request.body))
          .digest('hex');

        if (hash !== expectedHash) {
          logger.warn('Invalid webhook signature');
          return reply.code(400).send({ success: false, message: 'Invalid signature' });
        }
      }

      const event = request.body as any;
      
      // Handle successful payment
      if (event.event === 'charge.success' || event.data?.status === 'success') {
        const reference = event.data.reference;
        
        // Fulfill payment in background
        paymentService.fulfillPayment(reference).catch(error => {
          logger.error({ err: error, reference }, 'Failed to fulfill payment from webhook');
        });
      }

      return reply.send({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, 'Webhook processing failed');
      return reply.code(500).send({ success: false });
    }
  });

  /**
   * Get payment history
   */
  fastify.get('/payments', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user as any;
      
      const payments = await paymentService.getCompanyPayments(companyId);

      return reply.send({
        success: true,
        data: payments,
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to fetch payments');
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch payment history',
      });
    }
  });
}
