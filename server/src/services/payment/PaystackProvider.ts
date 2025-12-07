import axios from 'axios';
import { logger } from '../../utils/logger';
import {
  IPaymentProvider,
  PaymentInitializationData,
  PaymentInitializationResponse,
  PaymentVerificationResponse,
} from './IPaymentProvider';

export class PaystackProvider implements IPaymentProvider {
  private secretKey: string;
  private baseUrl: string = 'https://api.paystack.co';

  constructor(secretKey: string) {
    if (!secretKey) {
      throw new Error('Paystack secret key is required');
    }
    this.secretKey = secretKey;
  }

  getProviderName(): string {
    return 'paystack';
  }

  async initializePayment(data: PaymentInitializationData): Promise<PaymentInitializationResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        {
          email: data.email,
          amount: data.amount, // Paystack expects amount in kobo
          currency: data.currency,
          reference: data.reference,
          callback_url: data.callbackUrl,
          metadata: data.metadata,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status) {
        logger.info({ reference: data.reference }, 'Paystack payment initialized');
        
        return {
          success: true,
          authorizationUrl: response.data.data.authorization_url,
          accessCode: response.data.data.access_code,
          reference: response.data.data.reference,
        };
      }

      throw new Error(response.data.message || 'Payment initialization failed');
    } catch (error: any) {
      logger.error({ err: error, reference: data.reference }, 'Paystack initialization failed');
      throw new Error(error.response?.data?.message || 'Failed to initialize payment');
    }
  }

  async verifyPayment(reference: string): Promise<PaymentVerificationResponse> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );

      if (response.data.status && response.data.data.status === 'success') {
        logger.info({ reference }, 'Paystack payment verified successfully');
        
        return {
          success: true,
          reference: response.data.data.reference,
          amount: response.data.data.amount,
          currency: response.data.data.currency,
          paidAt: new Date(response.data.data.paid_at),
          channel: response.data.data.channel,
          metadata: response.data.data.metadata,
        };
      }

      throw new Error('Payment verification failed or payment not successful');
    } catch (error: any) {
      logger.error({ err: error, reference }, 'Paystack verification failed');
      throw new Error(error.response?.data?.message || 'Failed to verify payment');
    }
  }
}
