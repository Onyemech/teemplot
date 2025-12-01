import { IUserRepository, ISuperAdminRepository, UserFilters } from '../../domain/repositories/IUserRepository';
import { User, SuperAdmin } from '../../domain/entities/User';
import { DatabaseFactory } from '../database/DatabaseFactory';
import { IDatabase } from '../database/IDatabase';

export class UserRepository implements IUserRepository {
  private tableName = 'users';
  private db: IDatabase;

  constructor() {
    this.db = DatabaseFactory.getPrimaryDatabase();
  }

  async findById(id: string): Promise<User | null> {
    return await this.db.findOne(this.tableName, { id, deleted_at: null });
  }

  async findByEmail(email: string, companyId?: string): Promise<User | null> {
    const where: any = { email, deleted_at: null };
    if (companyId) where.company_id = companyId;
    return await this.db.findOne(this.tableName, where);
  }

  async findByCompany(companyId: string, filters?: UserFilters): Promise<User[]> {
    const where: any = { company_id: companyId, deleted_at: null };
    return await this.db.find(this.tableName, where);
  }


  async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    return await this.db.insert(this.tableName, user as any);
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    const results = await this.db.update(this.tableName, userData as any, { id });
    if (results.length === 0) throw new Error('User not found');
    return results[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.update(this.tableName, { deleted_at: new Date().toISOString() } as any, { id });
  }

  async count(companyId: string): Promise<number> {
    return await this.db.count(this.tableName, { company_id: companyId, deleted_at: null });
  }

async findAllByCompany(companyId: string, filters?: UserFilters): Promise<User[]> {
  const where: any = {
    company_id: companyId,
    deleted_at: null
  };

  // SAFE: Filters
  if (filters?.search) {
    where.name = { $like: `%${filters.search}%` };
  }

  if (filters?.email) {
    where.email = { $like: `%${filters.email}%` };
  }

  if (filters?.role) {
    where.role = filters.role;
  }

  // SAFE: Allowed sorting only
  const allowedSortColumns = ['created_at', 'name', 'email', 'role'];
  const allowedSortDir = ['asc', 'desc'];

  const orderBy = allowedSortColumns.includes(filters?.orderBy ?? '')
    ? filters!.orderBy
    : 'created_at';

  const orderDir = allowedSortDir.includes(filters?.orderDir ?? '')
    ? filters!.orderDir
    : 'desc';

  const limit = typeof filters?.limit === 'number' ? filters!.limit : 50;
  const offset = typeof filters?.offset === 'number' ? filters!.offset : 0;

  return await this.db.find(
    this.tableName,
    where,
    {
      limit,
      offset,
      orderBy,
      orderDir
    }
  );
}


  async findByGoogleId(googleId: string): Promise<User | null> {
    return await this.db.findOne(this.tableName, { google_id: googleId, deleted_at: null });
  }
}

export class SuperAdminRepository implements ISuperAdminRepository {
  private tableName = 'super_admins';
  private db: IDatabase;

  constructor() {
    this.db = DatabaseFactory.getPrimaryDatabase();
  }

  async findById(id: string): Promise<SuperAdmin | null> {
    return await this.db.findOne(this.tableName, { id, deleted_at: null });
  }

  async findByEmail(email: string): Promise<SuperAdmin | null> {
    return await this.db.findOne(this.tableName, { email, deleted_at: null });
  }

  async create(admin: Omit<SuperAdmin, 'id' | 'createdAt' | 'updatedAt'>): Promise<SuperAdmin> {
    return await this.db.insert(this.tableName, admin as any);
  }

  async update(id: string, adminData: Partial<SuperAdmin>): Promise<SuperAdmin> {
    const results = await this.db.update(this.tableName, adminData as any, { id });
    if (results.length === 0) throw new Error('Super admin not found');
    return results[0];
  }

  async findByGoogleId(googleId: string): Promise<SuperAdmin | null> {
    return await this.db.findOne(this.tableName, { google_id: googleId, deleted_at: null });
  }
}
