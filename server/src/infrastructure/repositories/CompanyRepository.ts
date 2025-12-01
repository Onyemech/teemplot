import { ICompanyRepository, CompanyFilters } from '../../domain/repositories/ICompanyRepository';
import { Company } from '../../domain/entities/Company';
import { DatabaseFactory } from '../database/DatabaseFactory';
import { IDatabase } from '../database/IDatabase';

export class CompanyRepository implements ICompanyRepository {
  private tableName = 'companies';
  private db: IDatabase;

  constructor() {
    this.db = DatabaseFactory.getPrimaryDatabase();
  }

  async findById(id: string): Promise<Company | null> {
    return await this.db.findOne(this.tableName, { id, deleted_at: null });
  }

  async findBySlug(slug: string): Promise<Company | null> {
    return await this.db.findOne(this.tableName, { slug, deleted_at: null });
  }

  async findAll(filters?: CompanyFilters): Promise<Company[]> {
    const where: any = { deleted_at: null };
    return await this.db.find(this.tableName, where);
  }

  async create(company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<Company> {
    return await this.db.insert(this.tableName, company as any);
  }

  async update(id: string, companyData: Partial<Company>): Promise<Company> {
    const results = await this.db.update(this.tableName, companyData as any, { id });
    if (results.length === 0) throw new Error('Company not found');
    return results[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.update(this.tableName, { deleted_at: new Date().toISOString() } as any, { id });
  }

  async count(): Promise<number> {
    return await this.db.count(this.tableName, { deleted_at: null });
  }
}
