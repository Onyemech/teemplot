import { randomUUID } from 'crypto';
import { DatabaseFactory } from '../../infrastructure/database/DatabaseFactory';
import { logger } from '../../utils/logger';
import { IPaymentProvider } from './IPaymentProvider';
import { PaystackProvider } from './PaystackProvider';
import { FlutterwaveProvider } from './FlutterwaveProvider';

type PaymentPurpose = 'subscription' | 'employee_limit_upgrade' | 'plan_upgrade';

interface InitiatePaymentData {
  companyId: string;
  userId: string;
  amount: number; // in kobo
  currency: string;
  purpose: PaymentPurpose;
  metadata: Record<string, any>;
}

export class PaymentService {
  private provider: IPaymentProvider;
  private db = DatabaseFactory.getPrimaryDatabase();

  constructor() {
    // Factory pattern - select provider based on environment variable
    const providerName = process.env.PAYMENT_PROVIDER || 'paystack';
    
    switch (providerName.toLowerCase()) {
      case 'paystack':
        this.provider = new PaystackProvider(process.env.PAYSTACK_SECRET_KEY || '');
        break;
      case 'flutterwave':
        this.provider = new FlutterwaveProvider(process.env.FLUTTERWAVE_SECRET_KEY || '');
        break;
      default:
        logger.warn({ provider: providerName }, 'Unknown payment provider, defaulting to Paystack');
        this.provider = new PaystackProvider(process.env.PAYSTACK_SECRET_KEY || '');
    }

    logger.info({ provider: this.provider.getProviderName() }, 'Payment service initialized');
  }

  /**
   * Initiate a payment transaction
   */
  async initiatePayment(data: InitiatePaymentData) {
    const { companyId, userId, amount, currency, purpose, metadata } = data;

    // Get user email
    const user = await this.db.findOne('users', { id: userId });
    if (!user) {
      throw new Error('User not found');
    }

    // Generate unique reference
    const reference = `${purpose}_${companyId}_${Date.now()}_${randomUUID().substring(0, 8)}`;

    const callbackUrl = `${process.env.FRONTEND_URL}/payment/callback?reference=${reference}`;

    // Initialize payment with provider FIRST (so we have authorization_url/access_code)
    const result = await this.provider.initializePayment({
      email: user.email,
      amount,
      currency,
      reference,
      metadata: {
        ...metadata,
        companyId,
        userId,
        purpose,
      },
      callbackUrl,
    });

    // Insert payment record with provider fields included to satisfy DB constraints
    const paymentId = randomUUID();
    await this.db.insert('payments', {
      id: paymentId,
      company_id: companyId,
      user_id: userId,
      reference,
      amount,
      currency,
      purpose,
      status: 'pending',
      provider: this.provider.getProviderName(),
      authorization_url: result.authorizationUrl,
      access_code: result.accessCode,
      metadata: JSON.stringify(metadata),
      created_at: new Date().toISOString(),
    });

    logger.info({ paymentId, reference, purpose }, 'Payment initiated');

    return {
      paymentId,
      reference,
      authorizationUrl: result.authorizationUrl,
      provider: this.provider.getProviderName(),
    };
  }

  /**
   * Verify a payment transaction
   */
  async verifyPayment(reference: string) {
    // Get payment record
    const payment = await this.db.findOne('payments', { reference });
    
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status === 'completed') {
      logger.info({ reference }, 'Payment already verified');
      return {
        success: true,
        payment,
        alreadyProcessed: true,
      };
    }

    // Verify with provider
    const verification = await this.provider.verifyPayment(reference);

    if (!verification.success) {
      await this.db.update('payments', {
        status: 'failed',
        verified_at: new Date().toISOString(),
      }, { reference });

      throw new Error('Payment verification failed');
    }

    // Update payment record
    await this.db.update('payments', {
      status: 'completed',
      verified_at: new Date().toISOString(),
      paid_at: verification.paidAt.toISOString(),
      channel: verification.channel,
    }, { reference });

    logger.info({ reference, purpose: payment.purpose }, 'Payment verified successfully');

    return {
      success: true,
      payment: {
        ...payment,
        status: 'completed',
        verified_at: new Date().toISOString(),
        paid_at: verification.paidAt.toISOString(),
      },
      alreadyProcessed: false,
    };
  }

  /**
   * Process payment fulfillment based on purpose
   */
  async fulfillPayment(reference: string) {
    const { payment, alreadyProcessed } = await this.verifyPayment(reference);

    if (alreadyProcessed) {
      return { success: true, message: 'Payment already processed' };
    }

    const metadata = typeof payment.metadata === 'string' 
      ? JSON.parse(payment.metadata) 
      : payment.metadata;

    switch (payment.purpose) {
      case 'employee_limit_upgrade':
        await this.fulfillEmployeeLimitUpgrade(payment.company_id, metadata);
        break;
      
      case 'subscription':
      case 'plan_upgrade':
        await this.fulfillSubscription(payment.company_id, metadata);
        break;
      
      default:
        logger.warn({ purpose: payment.purpose }, 'Unknown payment purpose');
    }

    logger.info({ reference, purpose: payment.purpose }, 'Payment fulfilled');

    return { success: true, message: 'Payment processed successfully' };
  }

  /**
   * Fulfill employee limit upgrade
   */
  private async fulfillEmployeeLimitUpgrade(companyId: string, metadata: any) {
    const { additionalEmployees } = metadata;

    const company = await this.db.findOne('companies', { id: companyId });
    if (!company) {
      throw new Error('Company not found');
    }

    const baseLimit = Number(company.employee_limit ?? 0) || Number(company.employee_count ?? 0) || 0;
    const newLimit = baseLimit + Number(additionalEmployees || 0);

    await this.db.update('companies', {
      employee_limit: newLimit,
    }, { id: companyId });

    logger.info({ companyId, oldLimit: baseLimit, newLimit }, 'Employee limit upgraded');
  }

  /**
   * Fulfill subscription payment
   */
  private async fulfillSubscription(companyId: string, metadata: any) {
    const { plan } = metadata;
    const now = new Date();

    // Determine extension duration from plan
    const isMonthly = String(plan).toLowerCase().includes('monthly');
    const isYearly = String(plan).toLowerCase().includes('yearly');

    // Fetch existing period end and trial end
    const company = await this.db.findOne('companies', { id: companyId });
    const currentEnd = company?.current_period_end ? new Date(company.current_period_end) : now;
    const trialEnd = company?.trial_end_date ? new Date(company.trial_end_date) : null;

    // Extend from max(current_end, trial_end, now)
    let base = currentEnd > now ? currentEnd : now;
    if (trialEnd && trialEnd > base) {
      base = trialEnd;
    }
    const extended = new Date(base);
    extended.setDate(extended.getDate() + (isYearly ? 365 : 30));

    await this.db.update('companies', {
      subscription_plan: plan,
      subscription_status: 'active',
      current_period_end: extended.toISOString(),
      last_billing_event: JSON.stringify({
        type: 'subscription',
        plan,
        extendedDays: isYearly ? 365 : 30,
        processedAt: now.toISOString(),
      }),
    }, { id: companyId });

    logger.info({ companyId, plan, current_period_end: extended.toISOString() }, 'Subscription activated and extended');
  }

  /**
   * Get payment by reference
   */
  async getPaymentByReference(reference: string) {
    return await this.db.findOne('payments', { reference });
  }

  /**
   * Get company payments
   */
  async getCompanyPayments(companyId: string) {
    return await this.db.find('payments', { company_id: companyId });
  }
}

export const paymentService = new PaymentService();
