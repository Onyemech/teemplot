export interface Company {
  id: string;
  name: string;
  slug: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  stateProvince?: string;
  country?: string;
  postalCode?: string;
  logoUrl?: string;
  industry?: string;
  companySize?: string;
  employeeCount: number;
  timezone: string;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  trialStartDate?: Date;
  trialEndDate?: Date;
  isActive: boolean;
  settings?: CompanySettings;
  taxIdentificationNumber?: string;
  website?: string;
  cacDocumentUrl?: string;
  proofOfAddressUrl?: string;
  companyPolicyUrl?: string;
  onboardingCompleted: boolean;
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  ownerDateOfBirth?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export enum SubscriptionPlan {
  TRIAL = 'trial',
  SILVER_MONTHLY = 'silver_monthly',
  SILVER_YEARLY = 'silver_yearly',
  GOLD_MONTHLY = 'gold_monthly',
  GOLD_YEARLY = 'gold_yearly',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export interface CompanySettings {
  workingHoursStart?: string;
  workingHoursEnd?: string;
  workingDays?: number[];
  allowedClockInRadius?: number;
  officeLocation?: {
    latitude: number;
    longitude: number;
  };
  requireBiometric?: boolean;
  [key: string]: any;
}
