import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { IDatabase } from '../infrastructure/database/IDatabase';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface DocumentUploadData {
  companyId: string;
  documentType: 'cac' | 'proof_of_address' | 'company_policy';
  url: string;
}

export interface PlanSelectionData {
  companyId: string;
  plan: 'silver_monthly' | 'silver_yearly' | 'gold_monthly' | 'gold_yearly';
  companySize: number;
}

export interface CompleteOnboardingData {
  companyId: string;
  taxId: string;
  website?: string;
  officeLatitude: number;
  officeLongitude: number;
  logoUrl?: string;
  ownerDetails?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
  };
}

export class OnboardingService {
  private db: IDatabase;

  constructor() {
    this.db = DatabaseFactory.getPrimaryDatabase();
  }

  async uploadDocument(data: DocumentUploadData): Promise<void> {
    const { companyId, documentType, url } = data;

    const updateData: any = {};
    
    if (documentType === 'cac') {
      updateData.cac_document_url = url;
    } else if (documentType === 'proof_of_address') {
      updateData.proof_of_address_url = url;
    } else if (documentType === 'company_policy') {
      updateData.company_policy_url = url;
    }

    await this.db.update('companies', updateData, { id: companyId });
    
    logger.info(`Document uploaded for company ${companyId}: ${documentType}`);
  }

  async selectPlan(data: PlanSelectionData): Promise<{
    totalPrice: number;
    trialEndDate?: Date;
  }> {
    const { companyId, plan, companySize } = data;

    const prices = {
      silver_monthly: parseInt(process.env.SILVER_MONTHLY_PLAN || '1200'),
      silver_yearly: parseInt(process.env.SILVER_YEARLY_PLAN || '12000'),
      gold_monthly: parseInt(process.env.GOLD_MONTHLY_PLAN || '2500'),
      gold_yearly: parseInt(process.env.GOLD_YEARLY_PLAN || '25000'),
    };

    const pricePerEmployee = prices[plan];
    const totalPrice = pricePerEmployee * companySize;

    const updateData: any = {
      subscription_plan: plan,
      company_size: companySize.toString(),
    };

    // Gold plans get 30-day trial for new companies
    if (plan.startsWith('gold')) {
      const trialStart = new Date();
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 30);

      updateData.trial_start_date = trialStart;
      updateData.trial_end_date = trialEnd;
      updateData.subscription_status = 'trial';

      await this.db.update('companies', updateData, { id: companyId });

      logger.info(`Gold trial started for company ${companyId}`);

      return { totalPrice, trialEndDate: trialEnd };
    }

    // Silver plans require immediate payment
    updateData.subscription_status = 'pending_payment';
    await this.db.update('companies', updateData, { id: companyId });

    logger.info(`Plan selected for company ${companyId}: ${plan}`);

    return { totalPrice };
  }

  async completeOnboarding(data: CompleteOnboardingData): Promise<void> {
    const { companyId, taxId, website, officeLatitude, officeLongitude, logoUrl, ownerDetails } = data;

    const updateData: any = {
      tax_identification_number: taxId,
      website,
      office_latitude: officeLatitude,
      office_longitude: officeLongitude,
      logo_url: logoUrl,
      onboarding_completed: true,
    };

    if (ownerDetails) {
      updateData.owner_first_name = ownerDetails.firstName;
      updateData.owner_last_name = ownerDetails.lastName;
      updateData.owner_email = ownerDetails.email;
      updateData.owner_phone = ownerDetails.phone;
      updateData.owner_date_of_birth = ownerDetails.dateOfBirth;
    }

    await this.db.update('companies', updateData, { id: companyId });

    logger.info(`Onboarding completed for company ${companyId}`);
  }

  async getOnboardingStatus(companyId: string): Promise<{
    completed: boolean;
    hasDocuments: boolean;
    hasPlan: boolean;
  }> {
    const company = await this.db.findOne('companies', { id: companyId });

    if (!company) {
      throw new Error('Company not found');
    }

    return {
      completed: company.onboarding_completed || false,
      hasDocuments: !!(company.cac_document_url && company.proof_of_address_url && company.company_policy_url),
      hasPlan: !!company.subscription_plan && company.subscription_plan !== 'trial',
    };
  }
}

export const onboardingService = new OnboardingService();
