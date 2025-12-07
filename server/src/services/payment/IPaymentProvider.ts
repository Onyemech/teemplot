// Payment Provider Interface - Strategy Pattern for loose coupling
// Easily swap between Paystack, Flutterwave, Stripe, etc.

export interface PaymentInitializationData {
  email: string;
  amount: number; // in kobo/cents
  currency: string;
  reference: string;
  metadata?: Record<string, any>;
  callbackUrl?: string;
}

export interface PaymentInitializationResponse {
  success: boolean;
  authorizationUrl: string;
  accessCode?: string;
  reference: string;
}

export interface PaymentVerificationResponse {
  success: boolean;
  reference: string;
  amount: number;
  currency: string;
  paidAt: Date;
  channel: string;
  metadata?: Record<string, any>;
}

export interface IPaymentProvider {
  /**
   * Initialize a payment transaction
   */
  initializePayment(data: PaymentInitializationData): Promise<PaymentInitializationResponse>;

  /**
   * Verify a payment transaction
   */
  verifyPayment(reference: string): Promise<PaymentVerificationResponse>;

  /**
   * Get provider name
   */
  getProviderName(): string;
}
