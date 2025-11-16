import { Company } from '../entities/Company';

export interface ICompanyRepository {
  findById(id: string): Promise<Company | null>;
  findBySlug(slug: string): Promise<Company | null>;
  findAll(filters?: CompanyFilters): Promise<Company[]>;
  create(company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<Company>;
  update(id: string, data: Partial<Company>): Promise<Company>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
}

export interface CompanyFilters {
  subscriptionStatus?: string;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}
