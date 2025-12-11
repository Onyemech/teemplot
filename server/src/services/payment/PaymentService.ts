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
  userEmail: string; // Add email to avoid database query
  amount: number; 
  currency: string;
  purpose: PaymentPurpose;
  metadata: Record<string, any>;
}

export class PaymentService {
  private provider: IPaymentProvider;
  private db = DatabaseFactory.getPrimaryDatabase();

  constructor() {
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

  async initiatePayment(data: InitiatePaymentData) {
    const { companyId, userId, userEmail, amount, currency, purpose, metadata } = data;

    // No need to query database - we have email from auth middleware

    const reference = `${purpose}_${companyId}_${Date.now()}_${randomUUID().substring(0, 8)}`;

    const paymentId = randomUUID();
    
    // Prepare payment data with required fields
    const paymentData: any = {
      id: paymentId,
      company_id: companyId,
      user_id: userId,
      reference,
      amount,
      currency,
      purpose,
      status: 'pending',
      provider: this.provider.getProviderName(),
      metadata: JSON.stringify(metadata),
      created_at: new Date().toISOString(),
    };

    // Add subscription-specific fields if this is a subscription payment
    if (purpose === 'subscription' && metadata.plan) {
      paymentData.subscription_plan = metadata.plan;
      
      // Extract billing cycle from plan name (e.g., 'silver_monthly' -> 'monthly')
      let billingCycle = 'monthly'; // default
      if (metadata.plan.includes('yearly')) {
        billingCycle = 'yearly';
      } else if (metadata.plan.includes('monthly')) {
        billingCycle = 'monthly';
      }
      paymentData.billing_cycle = billingCycle;
      
      // Calculate period dates for subscription
      const now = new Date();
      paymentData.period_start = now.toISOString();
      
      const periodEnd = new Date(now);
      if (billingCycle === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else if (billingCycle === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }
      paymentData.period_end = periodEnd.toISOString();
    }

    await this.db.insert('payments', paymentData);

    const callbackUrl = `${process.env.FRONTEND_URL}/payment/callback?reference=${reference}`;
    
    // Validate amount is in kobo (should be >= 100 for minimum 1 Naira)
    if (amount < 100) {
      logger.error({ amount, purpose, companyId }, 'Invalid payment amount - too small (should be in kobo)');
      throw new Error('Invalid payment amount. Amount should be in kobo (minimum 100 kobo = 1 Naira)');
    }

    // Log payment details for debugging
    logger.info({ 
      paymentId, 
      reference, 
      purpose, 
      amount, 
      amountInNaira: (amount / 100).toFixed(2),
      currency,
      companyId,
      userId 
    }, 'Initiating payment with provider');

    const result = await this.provider.initializePayment({
      email: userEmail,
      amount,
      currency,
      reference,
      metadata: {
        ...metadata,
        companyId,
        userId,
        purpose,
        amountInNaira: (amount / 100).toFixed(2), // For debugging
      },
      callbackUrl,
    });

    await this.db.update('payments', {
      authorization_url: result.authorizationUrl,
      access_code: result.accessCode,
    }, { id: paymentId });

    logger.info({ 
      paymentId, 
      reference, 
      purpose, 
      amount, 
      amountInNaira: (amount / 100).toFixed(2) 
    }, 'Payment initiated successfully');

    return {
      paymentId,
      reference,
      authorizationUrl: result.authorizationUrl,
      provider: this.provider.getProviderName(),
    };
  }

  async verifyPayment(reference: string) {
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

    const verification = await this.provider.verifyPayment(reference);

    if (!verification.success) {
      await this.db.update('payments', {
        status: 'failed',
        verified_at: new Date().toISOString(),
      }, { reference });

      throw new Error('Payment verification failed');
    }

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


  private async fulfillEmployeeLimitUpgrade(companyId: string, metadata: any) {
    const { additionalEmployees } = metadata;

    const company = await this.db.findOne('companies', { id: companyId });
    if (!company) {
      throw new Error('Company not found');
    }

    const currentLimit = parseInt(company.employee_count) || 1;
    const newLimit = currentLimit + additionalEmployees;

    await this.db.update('companies', {
      employee_count: newLimit.toString(),
    }, { id: companyId });

    logger.info({ companyId, oldLimit: currentLimit, newLimit }, 'Employee limit upgraded');
  }

  private async fulfillSubscription(companyId: string, metadata: any) {
    const { plan, companySize } = metadata;

    const updateData: any = {
      subscription_plan: plan,
      subscription_status: 'active',
    };

    if (companySize) {
      updateData.employee_count = companySize;
    }

    const now = new Date();
    updateData.subscription_start_date = now.toISOString();

    const endDate = new Date(now);
    if (plan.includes('yearly')) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }
    updateData.subscription_end_date = endDate.toISOString();

    await this.db.update('companies', updateData, { id: companyId });

    logger.info({ companyId, plan, employeeLimit: companySize }, 'Subscription activated with employee limit');
  }

 
  async getPaymentByReference(reference: string) {
    return await this.db.findOne('payments', { reference });
  }

  async getCompanyPayments(companyId: string) {
    return await this.db.find('payments', { company_id: companyId });
  }
}

export const paymentService = new PaymentService();
