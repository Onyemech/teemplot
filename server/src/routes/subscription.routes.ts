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

      // Get plan pricing (ENV values are in Naira, convert to kobo)
      const planPrices: Record<string, number> = {
        silver_monthly: parseInt(process.env.SILVER_MONTHLY_PLAN || '1200') * 100, // Convert to kobo
        silver_yearly: parseInt(process.env.SILVER_YEARLY_PLAN || '12000') * 100,
        gold_monthly: parseInt(process.env.GOLD_MONTHLY_PLAN || '2500') * 100,
        gold_yearly: parseInt(process.env.GOLD_YEARLY_PLAN || '25000') * 100,
      };

      const currentPlan = company.subscription_plan || 'silver_monthly';
      const pricePerEmployee = planPrices[currentPlan] || 120000; // 1200 Naira in kobo
      const totalAmount = Math.round(additionalEmployees * pricePerEmployee); // Ensure integer kobo

      // Initiate payment
      const payment = await paymentService.initiatePayment({
        companyId,
        userId,
        userEmail: (request.user as any).email, // Pass email from auth middleware
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
      const { plan, companySize } = request.body as { plan: string; companySize: number };

      if (!plan || !companySize) {
        return reply.code(400).send({
          success: false,
          message: 'Plan and company size are required',
        });
      }

      // Get plan pricing (ENV values are in Naira, convert to kobo)
      const planPrices: Record<string, number> = {
        silver_monthly: parseInt(process.env.SILVER_MONTHLY_PLAN || '1200') * 100, // Convert to kobo
        silver_yearly: parseInt(process.env.SILVER_YEARLY_PLAN || '12000') * 100,
        gold_monthly: parseInt(process.env.GOLD_MONTHLY_PLAN || '2500') * 100,
        gold_yearly: parseInt(process.env.GOLD_YEARLY_PLAN || '25000') * 100,
      };

      const pricePerEmployee = planPrices[plan];
      if (!pricePerEmployee) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid plan selected',
        });
      }

      const totalAmount = Math.round(pricePerEmployee * companySize); // Ensure integer kobo

      // Initiate payment
      const payment = await paymentService.initiatePayment({
        companyId,
        userId,
        userEmail: (request.user as any).email, // Pass email from auth middleware
        amount: totalAmount,
        currency: 'NGN',
        purpose: 'subscription',
        metadata: {
          plan,
          companySize,
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

 
  fastify.post('/verify-payment', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { reference } = VerifyPaymentSchema.parse(request.body);
      const { companyId } = request.user as any;

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
      
      // Log webhook event for debugging
      logger.info({ 
        event: event.event, 
        reference: event.data?.reference,
        amount: event.data?.amount,
        currency: event.data?.currency,
        plan: event.data?.metadata?.plan,
        companySize: event.data?.metadata?.companySize,
        purpose: event.data?.metadata?.purpose
      }, 'Webhook received');
      
      // Handle successful payment
      if (event.event === 'charge.success' || event.data?.status === 'success') {
        const reference = event.data.reference;
        
        logger.info({ 
          reference, 
          plan: event.data?.metadata?.plan,
          amount: event.data?.amount,
          amountInNaira: (event.data?.amount / 100).toFixed(2)
        }, 'Processing successful payment from webhook');
        
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
   * Get pricing information
   */
  fastify.get('/pricing', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get plan pricing from ENV (in Naira)
      const pricing = {
        silver_monthly: parseInt(process.env.SILVER_MONTHLY_PLAN || '1200'),
        silver_yearly: parseInt(process.env.SILVER_YEARLY_PLAN || '12000'),
        gold_monthly: parseInt(process.env.GOLD_MONTHLY_PLAN || '2500'),
        gold_yearly: parseInt(process.env.GOLD_YEARLY_PLAN || '25000'),
      };

      return reply.send({
        success: true,
        data: {
          pricing,
          currency: 'NGN',
          note: 'Prices are per user per billing period in Naira',
        },
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to fetch pricing');
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch pricing information',
      });
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
