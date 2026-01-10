import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { IDatabase } from '../infrastructure/database/IDatabase';
import { logger } from '../utils/logger';
import { emailService } from './EmailService';
import { superAdminNotificationService } from './SuperAdminNotificationService';
import { randomUUID } from 'crypto';
import { onboardingProgressService } from './OnboardingProgressService';

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

export interface CompanySetupData {
  userId: string;
  companyId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dateOfBirth: string;
  isOwner: boolean;
}

export interface OwnerDetailsData {
  companyId: string;
  registrantUserId: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerDateOfBirth: string;
}

export interface BusinessInfoData {
  companyId: string;
  companyName: string;
  taxId: string;
  industry?: string;
  employeeCount: number;
  website?: string;
  // Legacy address field
  address: string;
  // Detailed address components from Google Places
  formattedAddress?: string;
  streetNumber?: string;
  streetName?: string;
  city?: string;
  stateProvince?: string;
  country?: string;
  postalCode?: string;
  // Required geocoding coordinates
  officeLatitude: number;
  officeLongitude: number;
  // Google Places metadata
  placeId?: string;
  geocodingAccuracy?: string;
}

export interface CompleteOnboardingData {
  companyId: string;
  userId: string;
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

    // Check if all documents are uploaded, then notify superadmin
    const company = await this.db.findOne('companies', { id: companyId });
    if (company && company.cac_document_url && company.proof_of_address_url && company.company_policy_url) {
      superAdminNotificationService.notifyDocumentReview(companyId, company.name).catch(error => {
        logger.error(`Failed to notify superadmin: ${error?.message}`);
      });
    }
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

  /**
   * Stage 3: Company Setup - Save personal details and determine role
   */
  async saveCompanySetup(data: CompanySetupData): Promise<void> {
    const { userId, companyId, firstName, lastName, phoneNumber, dateOfBirth, isOwner } = data;

    // Update user with personal details
    await this.db.update('users', {
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber,
      date_of_birth: dateOfBirth,
      role: isOwner ? 'owner' : 'admin',
    }, { id: userId });

    // Update employee count
    await this.db.update('companies', {
      employee_count: 1,
    }, { id: companyId });

    logger.info(`Company setup saved for user ${userId}, role: ${isOwner ? 'owner' : 'admin'}`);
  }

  /**
   * Stage 4: Owner Details - Save separate owner information
   */
  async saveOwnerDetails(data: OwnerDetailsData): Promise<void> {
    const { companyId, registrantUserId, ownerFirstName, ownerLastName, ownerEmail, ownerPhone, ownerDateOfBirth } = data;

    // Check if owner email is different from registrant
    const registrant = await this.db.findOne('users', { id: registrantUserId });
    
    if (!registrant) {
      throw new Error('Registrant not found');
    }

    // Save owner details to company
    await this.db.update('companies', {
      owner_first_name: ownerFirstName,
      owner_last_name: ownerLastName,
      owner_email: ownerEmail,
      owner_phone: ownerPhone,
      owner_date_of_birth: ownerDateOfBirth,
    }, { id: companyId });

    // If owner email is different, create owner user and send invitation
    if (ownerEmail !== registrant.email) {
      // Change registrant role to admin
      await this.db.update('users', {
        role: 'admin',
      }, { id: registrantUserId });

      // Create owner user (pending verification)
      const ownerId = randomUUID();
      await this.db.insert('users', {
        id: ownerId,
        company_id: companyId,
        email: ownerEmail,
        first_name: ownerFirstName,
        last_name: ownerLastName,
        phone_number: ownerPhone,
        date_of_birth: ownerDateOfBirth,
        role: 'owner',
        is_active: false,
        email_verified: false,
      });

      // Update employee count to 2
      await this.db.update('companies', {
        employee_count: 2,
      }, { id: companyId });

      // Send invitation email (non-blocking) - TODO: Implement owner invitation email
      const company = await this.db.findOne('companies', { id: companyId });
      logger.info({ ownerEmail, companyName: company?.name }, 'Owner invitation email queued');

      logger.info(`Owner user created and invitation sent to ${ownerEmail}`);
    }

    logger.info(`Owner details saved for company ${companyId}`);
  }

  /**
   * Stage 5: Business Information - Save company details with geocoding
   */
  async saveBusinessInfo(data: BusinessInfoData): Promise<void> {
    const { 
      companyId, 
      companyName, 
      taxId, 
      industry, 
      employeeCount, 
      website, 
      address, 
      city, 
      stateProvince, 
      country, 
      postalCode, 
      officeLatitude, 
      officeLongitude,
      formattedAddress,
      streetNumber,
      streetName,
      placeId,
      geocodingAccuracy
    } = data;

    // Validate coordinates
    if (!officeLatitude || !officeLongitude) {
      throw new Error('Office coordinates are required. Please use the address autocomplete to select a valid location.');
    }

    const { GeocodingService } = await import('./GeocodingService');
    if (!GeocodingService.validateCoordinates(officeLatitude, officeLongitude)) {
      throw new Error('Invalid coordinates provided.');
    }

    // Check if place_id is changing to avoid unique constraint violation
    const existingCompany = await this.db.findOne('companies', { id: companyId });
    const updateData: any = {
      name: companyName,
      tax_identification_number: taxId,
      industry,
      employee_count: employeeCount,
      website,
      // Legacy address field (for backward compatibility)
      address: formattedAddress || address,
      // Detailed address components
      formatted_address: formattedAddress,
      street_number: streetNumber,
      street_name: streetName,
      city: city || null,
      state_province: stateProvince || null,
      country: country || null,
      postal_code: postalCode || null,
      // Geocoding data for geofencing
      office_latitude: officeLatitude,
      office_longitude: officeLongitude,
      geocoding_accuracy: geocodingAccuracy,
      geocoding_source: 'google_places',
      geocoded_at: new Date().toISOString(),
    };

    // Only update place_id if it's different from existing (to avoid unique constraint violation)
    if (placeId && placeId !== existingCompany?.place_id) {
      updateData.place_id = placeId;
    }

    await this.db.update('companies', updateData, { id: companyId });

    logger.info(`Business info saved for company ${companyId} with geocoding (${officeLatitude}, ${officeLongitude})`);
  }

  /**
   * Upload company logo
   */
  async uploadLogo(companyId: string, logoUrl: string): Promise<void> {
    await this.db.update('companies', {
      logo_url: logoUrl,
    }, { id: companyId });

    logger.info(`Logo uploaded for company ${companyId}`);
  }

  /**
   * Complete onboarding - Mark as complete and send welcome email
   */
  async completeOnboarding(data: CompleteOnboardingData): Promise<void> {
    const { companyId, userId } = data;

    // Mark onboarding as complete by deleting temporary progress
    // Note: We skip markStepCompleted because the entire record is deleted immediately after
    await onboardingProgressService.deleteProgress(userId);

    // Update company status
    await this.db.update('companies', { onboarding_completed: true }, { id: companyId });

    // Get user and company details for welcome email
    const user = await this.db.findOne('users', { id: userId });
    const company = await this.db.findOne('companies', { id: companyId });

    if (user && company) {
      // Send welcome email (non-blocking)
      emailService.sendWelcomeEmail(
        user.email,
        user.first_name,
        company.name
      ).catch(error => {
        logger.error(`Failed to send welcome email: ${error?.message}`);
      });
    }

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

    const users = await this.db.find('users', { company_id: companyId, role: 'admin' });
    const user = users[0];
    let completed = false;
    if (user) {
      const progress = await onboardingProgressService.getProgress(user.id);
      const requiredSteps = [1,2,3,4,5,6];
      completed = progress ? requiredSteps.every(s => progress.completedSteps.includes(s)) : false;
    }
    return {
      completed,
      hasDocuments: !!(company.cac_document_url && company.proof_of_address_url && company.company_policy_url),
      hasPlan: !!company.subscription_plan && company.subscription_plan !== 'trial',
    };
  }
}

export const onboardingService = new OnboardingService();
