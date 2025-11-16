export interface Company {
  id: string;
  name: string;
  slug: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  logoUrl?: string;
  industry?: string;
  companySize?: string;
  timezone: string;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  isActive: boolean;
  settings?: CompanySettings;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export enum SubscriptionPlan {
  TRIAL = 'trial',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
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
