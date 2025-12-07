import axios from 'axios';
import { logger } from '../../utils/logger';
import {
  IPaymentProvider,
  PaymentInitializationData,
  PaymentInitializationResponse,
  PaymentVerificationResponse,
} from './IPaymentProvider';

export class FlutterwaveProvider implements IPaymentProvider {
  private secretKey: string;
  private baseUrl: string = 'https://api.flutterwave.com/v3';

  constructor(secretKey: string) {
    if (!secretKey) {
      throw new Error('Flutterwave secret key is required');
    }
    this.secretKey = secretKey;
  }

  getProviderName(): string {
    return 'flutterwave';
  }

  async initializePayment(data: PaymentInitializationData): Promise<PaymentInitializationResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/payments`,
        {
          tx_ref: data.reference,
          amount: data.amount / 100, // Flutterwave expects amount in naira, not kobo
          currency: data.currency,
          redirect_url: data.callbackUrl,
          customer: {
            email: data.email,
          },
          customizations: {
            title: 'Teemplot Subscription',
            description: 'Payment for subscription upgrade',
          },
          meta: data.metadata,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status === 'success') {
        logger.info({ reference: data.reference }, 'Flutterwave payment initialized');
        
        return {
          success: true,
          authorizationUrl: response.data.data.link,
          reference: data.reference,
        };
      }

      throw new Error(response.data.message || 'Payment initialization failed');
    } catch (error: any) {
      logger.error({ err: error, reference: data.reference }, 'Flutterwave initialization failed');
      throw new Error(error.response?.data?.message || 'Failed to initialize payment');
    }
  }

  async verifyPayment(reference: string): Promise<PaymentVerificationResponse> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/transactions/verify_by_reference?tx_ref=${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );

      if (response.data.status === 'success' && response.data.data.status === 'successful') {
        logger.info({ reference }, 'Flutterwave payment verified successfully');
        
        return {
          success: true,
          reference: response.data.data.tx_ref,
          amount: response.data.data.amount * 100, // Convert back to kobo
          currency: response.data.data.currency,
          paidAt: new Date(response.data.data.created_at),
          channel: response.data.data.payment_type,
          metadata: response.data.data.meta,
        };
      }

      throw new Error('Payment verification failed or payment not successful');
    } catch (error: any) {
      logger.error({ err: error, reference }, 'Flutterwave verification failed');
      throw new Error(error.response?.data?.message || 'Failed to verify payment');
    }
  }
}
