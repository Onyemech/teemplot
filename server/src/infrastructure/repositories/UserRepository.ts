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

  private toEntity(row: any): User {
    if (!row) return null as any;
    return {
      id: row.id,
      companyId: row.company_id,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      phoneNumber: row.phone_number,
      avatarUrl: row.avatar_url,
      role: row.role,
      employeeId: row.employee_id,
      departmentId: row.department_id,
      position: row.position,
      dateOfBirth: row.date_of_birth,
      hireDate: row.hire_date,
      biometricData: row.biometric_data,
      isActive: row.is_active,
      emailVerified: row.email_verified,
      googleId: row.google_id,
      lastLoginAt: row.last_login_at,
      settings: row.settings,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }

  private toDatabase(user: Partial<User>): any {
    const dbUser: any = {};
    if (user.id !== undefined) dbUser.id = user.id;
    if (user.companyId !== undefined) dbUser.company_id = user.companyId;
    if (user.email !== undefined) dbUser.email = user.email;
    if (user.passwordHash !== undefined) dbUser.password_hash = user.passwordHash;
    if (user.firstName !== undefined) dbUser.first_name = user.firstName;
    if (user.lastName !== undefined) dbUser.last_name = user.lastName;
    if (user.phoneNumber !== undefined) dbUser.phone_number = user.phoneNumber;
    if (user.avatarUrl !== undefined) dbUser.avatar_url = user.avatarUrl;
    if (user.role !== undefined) dbUser.role = user.role;
    if (user.employeeId !== undefined) dbUser.employee_id = user.employeeId;
    if (user.departmentId !== undefined) dbUser.department_id = user.departmentId;
    if (user.position !== undefined) dbUser.position = user.position;
    if (user.dateOfBirth !== undefined) dbUser.date_of_birth = user.dateOfBirth;
    if (user.hireDate !== undefined) dbUser.hire_date = user.hireDate;
    if (user.biometricData !== undefined) dbUser.biometric_data = user.biometricData;
    if (user.isActive !== undefined) dbUser.is_active = user.isActive;
    if (user.emailVerified !== undefined) dbUser.email_verified = user.emailVerified;
    if (user.googleId !== undefined) dbUser.google_id = user.googleId;
    if (user.lastLoginAt !== undefined) dbUser.last_login_at = user.lastLoginAt;
    if (user.settings !== undefined) dbUser.settings = user.settings;
    if (user.createdAt !== undefined) dbUser.created_at = user.createdAt;
    if (user.updatedAt !== undefined) dbUser.updated_at = user.updatedAt;
    if (user.deletedAt !== undefined) dbUser.deleted_at = user.deletedAt;
    return dbUser;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.db.findOne(this.tableName, { id, deleted_at: null });
    return row ? this.toEntity(row) : null;
  }

  async findByEmail(email: string, companyId?: string): Promise<User | null> {
    const where: any = { email, deleted_at: null };
    if (companyId) where.company_id = companyId;
    const row = await this.db.findOne(this.tableName, where);
    return row ? this.toEntity(row) : null;
  }

  async findByCompany(companyId: string, filters?: UserFilters): Promise<User[]> {
    const where: any = { company_id: companyId, deleted_at: null };
    const rows = await this.db.find(this.tableName, where);
    return rows.map(row => this.toEntity(row));
  }


  async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const dbData = this.toDatabase(user);
    const row = await this.db.insert(this.tableName, dbData);
    return this.toEntity(row);
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    const dbData = this.toDatabase(userData);
    const results = await this.db.update(this.tableName, dbData, { id });
    if (results.length === 0) throw new Error('User not found');
    return this.toEntity(results[0]);
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

    const rows = await this.db.find(
      this.tableName,
      where,
      {
        limit,
        offset,
        orderBy,
        orderDir
      }
    );
    return rows.map(row => this.toEntity(row));
  }


  async findByGoogleId(googleId: string): Promise<User | null> {
    const row = await this.db.findOne(this.tableName, { google_id: googleId, deleted_at: null });
    return row ? this.toEntity(row) : null;
  }

  // Email verification methods
  async createVerificationCode(data: { email: string; code: string; expiresAt: Date }): Promise<any> {
    const { randomUUID } = await import('crypto');
    return await this.db.insert('email_verification_codes', {
      id: randomUUID(),
      email: data.email,
      code: data.code,
      expires_at: data.expiresAt.toISOString(),
      created_at: new Date().toISOString()
    });
  }

  async findVerificationCode(email: string, code: string): Promise<any> {
    const results = await this.db.find('email_verification_codes', { email, code });
    return results.length > 0 ? results[0] : null;
  }

  async markVerificationCodeAsUsed(id: string): Promise<void> {
    await this.db.update(
      'email_verification_codes',
      { verified_at: new Date().toISOString() },
      { id }
    );
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
