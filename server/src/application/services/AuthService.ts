import bcrypt from 'bcrypt';
import { IUserRepository, ISuperAdminRepository } from '../../domain/repositories/IUserRepository';
import { ICompanyRepository } from '../../domain/repositories/ICompanyRepository';
import { User, UserRole, SuperAdmin } from '../../domain/entities/User';
import { Company, SubscriptionPlan, SubscriptionStatus } from '../../domain/entities/Company';

const SALT_ROUNDS = 12;

export interface RegisterUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  companyName: string;
  companySlug: string;
}

export interface RegisterStaffDto {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  companyId: string;
  departmentId?: string;
  position?: string;
  role: UserRole;
}

export interface LoginDto {
  email: string;
  password: string;
  companySlug?: string;
}

export interface GoogleAuthDto {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  companySlug?: string;
}

export class AuthService {
  constructor(
    private userRepository: IUserRepository,
    private superAdminRepository: ISuperAdminRepository,
    private companyRepository: ICompanyRepository
  ) {}

  async registerAdmin(dto: RegisterUserDto): Promise<{ user: User; company: Company }> {
    const existingCompany = await this.companyRepository.findBySlug(dto.companySlug);
    if (existingCompany) {
      throw new Error('Company slug already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const company = await this.companyRepository.create({
      name: dto.companyName,
      slug: dto.companySlug,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      timezone: 'UTC',
      subscriptionPlan: SubscriptionPlan.TRIAL,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      isActive: true,
      settings: {},
      employeeCount: 1,
      onboardingCompleted: false,
    });

    const user = await this.userRepository.create({
      companyId: company.id,
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phoneNumber: dto.phoneNumber,
      role: UserRole.ADMIN,
      isActive: true,
      emailVerified: false,
      settings: {},
    });

    return { user, company };
  }

  async registerStaff(dto: RegisterStaffDto): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(dto.email, dto.companyId);
    if (existingUser) {
      throw new Error('User already exists in this company');
    }

    const user = await this.userRepository.create({
      companyId: dto.companyId,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phoneNumber: dto.phoneNumber,
      departmentId: dto.departmentId,
      position: dto.position,
      role: dto.role,
      isActive: true,
      emailVerified: false,
      settings: {},
    });

    return user;
  }

  async loginUser(dto: LoginDto): Promise<User> {
    if (!dto.companySlug) {
      throw new Error('Company slug is required');
    }

    const company = await this.companyRepository.findBySlug(dto.companySlug);
    if (!company) {
      throw new Error('Invalid credentials');
    }

    const user = await this.userRepository.findByEmail(dto.email, company.id);
    if (!user || !user.passwordHash) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
      throw new Error('Account is inactive');
    }

    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    return user;
  }

  async loginSuperAdmin(dto: LoginDto): Promise<SuperAdmin> {
    const admin = await this.superAdminRepository.findByEmail(dto.email);
    if (!admin || !admin.passwordHash) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    if (!admin.isActive) {
      throw new Error('Account is inactive');
    }

    return admin;
  }

  async googleAuth(dto: GoogleAuthDto): Promise<User | SuperAdmin> {
    const existingUser = await this.userRepository.findByGoogleId(dto.googleId);
    if (existingUser) {
      await this.userRepository.update(existingUser.id, { lastLoginAt: new Date() });
      return existingUser;
    }

    if (dto.companySlug) {
      const company = await this.companyRepository.findBySlug(dto.companySlug);
      if (!company) {
        throw new Error('Company not found');
      }

      const emailUser = await this.userRepository.findByEmail(dto.email, company.id);
      if (emailUser) {
        const updatedUser = await this.userRepository.update(emailUser.id, {
          googleId: dto.googleId,
          avatarUrl: dto.avatarUrl,
          emailVerified: true,
          lastLoginAt: new Date(),
        });
        return updatedUser;
      }

      throw new Error('User not found. Please register first.');
    }

    throw new Error('Company slug required for Google authentication');
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async sendVerificationCode(email: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // TODO: Implement email verification code storage using repository pattern
    // For now, return the code
    return code;
  }

  async verifyCode(email: string, code: string): Promise<boolean> {
    // TODO: Implement email verification code validation using repository pattern
    // For now, return true for development
    return true;

    return true;
  }
}
