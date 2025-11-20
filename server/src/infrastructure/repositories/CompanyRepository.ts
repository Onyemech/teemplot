import { ICompanyRepository, CompanyFilters } from '../../domain/repositories/ICompanyRepository';
import { Company } from '../../domain/entities/Company';
import { db } from '../../config/database';

export class CompanyRepository implements ICompanyRepository {
  private tableName = 'companies';

  async findById(id: string): Promise<Company | null> {
    const { data, error } = await db.getAdminClient()
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findBySlug(slug: string): Promise<Company | null> {
    const { data, error } = await db.getAdminClient()
      .from(this.tableName)
      .select('*')
      .eq('slug', slug)
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findAll(filters?: CompanyFilters): Promise<Company[]> {
    let query = db.getAdminClient()
      .from(this.tableName)
      .select('*')
      .is('deleted_at', null);

    if (filters?.subscriptionStatus) {
      query = query.eq('subscription_status', filters.subscriptionStatus);
    }
    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(this.mapToEntity);
  }

  async create(company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<Company> {
    const { data, error } = await db.getAdminClient()
      .from(this.tableName)
      .insert(this.mapToDb(company))
      .select()
      .single();

    if (error) throw new Error(`Failed to create company: ${error.message}`);
    return this.mapToEntity(data);
  }

  async update(id: string, companyData: Partial<Company>): Promise<Company> {
    const { data, error } = await db.getAdminClient()
      .from(this.tableName)
      .update(this.mapToDb(companyData))
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update company: ${error.message}`);
    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await db.getAdminClient()
      .from(this.tableName)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(`Failed to delete company: ${error.message}`);
  }

  async count(): Promise<number> {
    const { count, error } = await db.getAdminClient()
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    if (error) throw new Error(`Failed to count companies: ${error.message}`);
    return count || 0;
  }

  private mapToEntity(data: any): Company {
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      email: data.email,
      phoneNumber: data.phone_number,
      address: data.address,
      city: data.city,
      stateProvince: data.state_province,
      country: data.country,
      postalCode: data.postal_code,
      logoUrl: data.logo_url,
      industry: data.industry,
      companySize: data.company_size,
      employeeCount: data.employee_count || 1,
      timezone: data.timezone,
      subscriptionPlan: data.subscription_plan,
      subscriptionStatus: data.subscription_status,
      subscriptionStartDate: data.subscription_start_date ? new Date(data.subscription_start_date) : undefined,
      subscriptionEndDate: data.subscription_end_date ? new Date(data.subscription_end_date) : undefined,
      trialStartDate: data.trial_start_date ? new Date(data.trial_start_date) : undefined,
      trialEndDate: data.trial_end_date ? new Date(data.trial_end_date) : undefined,
      isActive: data.is_active,
      settings: data.settings,
      taxIdentificationNumber: data.tax_identification_number,
      website: data.website,
      cacDocumentUrl: data.cac_document_url,
      proofOfAddressUrl: data.proof_of_address_url,
      companyPolicyUrl: data.company_policy_url,
      onboardingCompleted: data.onboarding_completed || false,
      ownerFirstName: data.owner_first_name,
      ownerLastName: data.owner_last_name,
      ownerEmail: data.owner_email,
      ownerPhone: data.owner_phone,
      ownerDateOfBirth: data.owner_date_of_birth ? new Date(data.owner_date_of_birth) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      deletedAt: data.deleted_at ? new Date(data.deleted_at) : undefined,
    };
  }

  private mapToDb(data: Partial<Company>): any {
    const dbData: any = {};
    
    if (data.name) dbData.name = data.name;
    if (data.slug) dbData.slug = data.slug;
    if (data.email) dbData.email = data.email;
    if (data.phoneNumber !== undefined) dbData.phone_number = data.phoneNumber;
    if (data.address !== undefined) dbData.address = data.address;
    if (data.city !== undefined) dbData.city = data.city;
    if (data.stateProvince !== undefined) dbData.state_province = data.stateProvince;
    if (data.country !== undefined) dbData.country = data.country;
    if (data.postalCode !== undefined) dbData.postal_code = data.postalCode;
    if (data.logoUrl !== undefined) dbData.logo_url = data.logoUrl;
    if (data.industry !== undefined) dbData.industry = data.industry;
    if (data.companySize !== undefined) dbData.company_size = data.companySize;
    if (data.employeeCount !== undefined) dbData.employee_count = data.employeeCount;
    if (data.timezone) dbData.timezone = data.timezone;
    if (data.subscriptionPlan) dbData.subscription_plan = data.subscriptionPlan;
    if (data.subscriptionStatus) dbData.subscription_status = data.subscriptionStatus;
    if (data.subscriptionStartDate !== undefined) dbData.subscription_start_date = data.subscriptionStartDate;
    if (data.subscriptionEndDate !== undefined) dbData.subscription_end_date = data.subscriptionEndDate;
    if (data.trialStartDate !== undefined) dbData.trial_start_date = data.trialStartDate;
    if (data.trialEndDate !== undefined) dbData.trial_end_date = data.trialEndDate;
    if (data.isActive !== undefined) dbData.is_active = data.isActive;
    if (data.settings !== undefined) dbData.settings = data.settings;
    if (data.taxIdentificationNumber !== undefined) dbData.tax_identification_number = data.taxIdentificationNumber;
    if (data.website !== undefined) dbData.website = data.website;
    if (data.cacDocumentUrl !== undefined) dbData.cac_document_url = data.cacDocumentUrl;
    if (data.proofOfAddressUrl !== undefined) dbData.proof_of_address_url = data.proofOfAddressUrl;
    if (data.companyPolicyUrl !== undefined) dbData.company_policy_url = data.companyPolicyUrl;
    if (data.onboardingCompleted !== undefined) dbData.onboarding_completed = data.onboardingCompleted;
    if (data.ownerFirstName !== undefined) dbData.owner_first_name = data.ownerFirstName;
    if (data.ownerLastName !== undefined) dbData.owner_last_name = data.ownerLastName;
    if (data.ownerEmail !== undefined) dbData.owner_email = data.ownerEmail;
    if (data.ownerPhone !== undefined) dbData.owner_phone = data.ownerPhone;
    if (data.ownerDateOfBirth !== undefined) dbData.owner_date_of_birth = data.ownerDateOfBirth;
    
    return dbData;
  }
}
