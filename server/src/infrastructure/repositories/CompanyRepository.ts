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
      logoUrl: data.logo_url,
      industry: data.industry,
      companySize: data.company_size,
      timezone: data.timezone,
      subscriptionPlan: data.subscription_plan,
      subscriptionStatus: data.subscription_status,
      subscriptionStartDate: data.subscription_start_date ? new Date(data.subscription_start_date) : undefined,
      subscriptionEndDate: data.subscription_end_date ? new Date(data.subscription_end_date) : undefined,
      isActive: data.is_active,
      settings: data.settings,
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
    if (data.logoUrl !== undefined) dbData.logo_url = data.logoUrl;
    if (data.industry !== undefined) dbData.industry = data.industry;
    if (data.companySize !== undefined) dbData.company_size = data.companySize;
    if (data.timezone) dbData.timezone = data.timezone;
    if (data.subscriptionPlan) dbData.subscription_plan = data.subscriptionPlan;
    if (data.subscriptionStatus) dbData.subscription_status = data.subscriptionStatus;
    if (data.subscriptionStartDate !== undefined) dbData.subscription_start_date = data.subscriptionStartDate;
    if (data.subscriptionEndDate !== undefined) dbData.subscription_end_date = data.subscriptionEndDate;
    if (data.isActive !== undefined) dbData.is_active = data.isActive;
    if (data.settings !== undefined) dbData.settings = data.settings;
    
    return dbData;
  }
}
