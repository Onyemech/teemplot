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
 
  initializePayment(data: PaymentInitializationData): Promise<PaymentInitializationResponse>;


  verifyPayment(reference: string): Promise<PaymentVerificationResponse>;

 
  getProviderName(): string;
}
