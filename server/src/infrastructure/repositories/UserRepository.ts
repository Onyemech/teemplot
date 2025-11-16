import { IUserRepository, UserFilters, ISuperAdminRepository } from '../../domain/repositories/IUserRepository';
import { User, SuperAdmin } from '../../domain/entities/User';
import { db } from '../../config/database';

export class UserRepository implements IUserRepository {
  private tableName = 'users';

  async findById(id: string): Promise<User | null> {
    const { data, error } = await db.getAdminClient()
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findByEmail(email: string, companyId: string): Promise<User | null> {
    const { data, error } = await db.getAdminClient()
      .from(this.tableName)
      .select('*')
      .eq('email', email)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const { data, error } = await db.getAdminClient()
      .from(this.tableName)
      .select('*')
      .eq('google_id', googleId)
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findAllByCompany(companyId: string, filters?: UserFilters): Promise<User[]> {
    let query = db.getAdminClient()
      .from(this.tableName)
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (filters?.role) {
      query = query.eq('role', filters.role);
    }
    if (filters?.departmentId) {
      query = query.eq('department_id', filters.departmentId);
    }
    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }
    if (filters?.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(this.mapToEntity);
  }

  async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const { data, error } = await db.getAdminClient()
      .from(this.tableName)
      .insert(this.mapToDb(user))
      .select()
      .single();

    if (error) throw new Error(`Failed to create user: ${error.message}`);
    return this.mapToEntity(data);
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    const { data, error } = await db.getAdminClient()
      .from(this.tableName)
      .update(this.mapToDb(userData))
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update user: ${error.message}`);
    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await db.getAdminClient()
      .from(this.tableName)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(`Failed to delete user: ${error.message}`);
  }

  async count(companyId: string): Promise<number> {
    const { count, error } = await db.getAdminClient()
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (error) throw new Error(`Failed to count users: ${error.message}`);
    return count || 0;
  }

  private mapToEntity(data: any): User {
    return {
      id: data.id,
      companyId: data.company_id,
      email: data.email,
      passwordHash: data.password_hash,
      firstName: data.first_name,
      lastName: data.last_name,
      phoneNumber: data.phone_number,
      avatarUrl: data.avatar_url,
      role: data.role,
      employeeId: data.employee_id,
      departmentId: data.department_id,
      position: data.position,
      dateOfBirth: data.date_of_birth ? new Date(data.date_of_birth) : undefined,
      hireDate: data.hire_date ? new Date(data.hire_date) : undefined,
      biometricData: data.biometric_data,
      isActive: data.is_active,
      emailVerified: data.email_verified,
      googleId: data.google_id,
      lastLoginAt: data.last_login_at ? new Date(data.last_login_at) : undefined,
      settings: data.settings,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      deletedAt: data.deleted_at ? new Date(data.deleted_at) : undefined,
    };
  }

  private mapToDb(data: Partial<User>): any {
    const dbData: any = {};
    
    if (data.companyId) dbData.company_id = data.companyId;
    if (data.email) dbData.email = data.email;
    if (data.passwordHash !== undefined) dbData.password_hash = data.passwordHash;
    if (data.firstName) dbData.first_name = data.firstName;
    if (data.lastName) dbData.last_name = data.lastName;
    if (data.phoneNumber !== undefined) dbData.phone_number = data.phoneNumber;
    if (data.avatarUrl !== undefined) dbData.avatar_url = data.avatarUrl;
    if (data.role) dbData.role = data.role;
    if (data.employeeId !== undefined) dbData.employee_id = data.employeeId;
    if (data.departmentId !== undefined) dbData.department_id = data.departmentId;
    if (data.position !== undefined) dbData.position = data.position;
    if (data.dateOfBirth !== undefined) dbData.date_of_birth = data.dateOfBirth;
    if (data.hireDate !== undefined) dbData.hire_date = data.hireDate;
    if (data.biometricData !== undefined) dbData.biometric_data = data.biometricData;
    if (data.isActive !== undefined) dbData.is_active = data.isActive;
    if (data.emailVerified !== undefined) dbData.email_verified = data.emailVerified;
    if (data.googleId !== undefined) dbData.google_id = data.googleId;
    if (data.lastLoginAt !== undefined) dbData.last_login_at = data.lastLoginAt;
    if (data.settings !== undefined) dbData.settings = data.settings;
    
    return dbData;
  }
}

export class SuperAdminRepository implements ISuperAdminRepository {
  private tableName = 'super_admins';

  async findById(id: string): Promise<SuperAdmin | null> {
    const { data, error } = await db.getAdminClient()
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findByEmail(email: string): Promise<SuperAdmin | null> {
    const { data, error } = await db.getAdminClient()
      .from(this.tableName)
      .select('*')
      .eq('email', email)
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async create(admin: Omit<SuperAdmin, 'id' | 'createdAt' | 'updatedAt'>): Promise<SuperAdmin> {
    const { data, error } = await db.getAdminClient()
      .from(this.tableName)
      .insert(this.mapToDb(admin))
      .select()
      .single();

    if (error) throw new Error(`Failed to create super admin: ${error.message}`);
    return this.mapToEntity(data);
  }

  async update(id: string, adminData: Partial<SuperAdmin>): Promise<SuperAdmin> {
    const { data, error } = await db.getAdminClient()
      .from(this.tableName)
      .update(this.mapToDb(adminData))
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update super admin: ${error.message}`);
    return this.mapToEntity(data);
  }

  private mapToEntity(data: any): SuperAdmin {
    return {
      id: data.id,
      email: data.email,
      passwordHash: data.password_hash,
      firstName: data.first_name,
      lastName: data.last_name,
      phoneNumber: data.phone_number,
      avatarUrl: data.avatar_url,
      isActive: data.is_active,
      emailVerified: data.email_verified,
      googleId: data.google_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      deletedAt: data.deleted_at ? new Date(data.deleted_at) : undefined,
    };
  }

  private mapToDb(data: Partial<SuperAdmin>): any {
    const dbData: any = {};
    
    if (data.email) dbData.email = data.email;
    if (data.passwordHash !== undefined) dbData.password_hash = data.passwordHash;
    if (data.firstName) dbData.first_name = data.firstName;
    if (data.lastName) dbData.last_name = data.lastName;
    if (data.phoneNumber !== undefined) dbData.phone_number = data.phoneNumber;
    if (data.avatarUrl !== undefined) dbData.avatar_url = data.avatarUrl;
    if (data.isActive !== undefined) dbData.is_active = data.isActive;
    if (data.emailVerified !== undefined) dbData.email_verified = data.emailVerified;
    if (data.googleId !== undefined) dbData.google_id = data.googleId;
    
    return dbData;
  }
}
