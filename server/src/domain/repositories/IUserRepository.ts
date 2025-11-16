import { User, SuperAdmin } from '../entities/User';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string, companyId: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  findAllByCompany(companyId: string, filters?: UserFilters): Promise<User[]>;
  create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
  count(companyId: string): Promise<number>;
}

export interface ISuperAdminRepository {
  findById(id: string): Promise<SuperAdmin | null>;
  findByEmail(email: string): Promise<SuperAdmin | null>;
  create(admin: Omit<SuperAdmin, 'id' | 'createdAt' | 'updatedAt'>): Promise<SuperAdmin>;
  update(id: string, data: Partial<SuperAdmin>): Promise<SuperAdmin>;
}

export interface UserFilters {
  role?: string;
  departmentId?: string;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}
