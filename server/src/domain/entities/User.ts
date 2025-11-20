export interface User {
  id: string;
  companyId: string;
  email: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  role: UserRole;
  employeeId?: string;
  departmentId?: string;
  position?: string;
  dateOfBirth?: Date;
  hireDate?: Date;
  biometricData?: BiometricData;
  isActive: boolean;
  emailVerified: boolean;
  googleId?: string;
  lastLoginAt?: Date;
  settings?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  STAFF = 'staff',
}

export interface BiometricData {
  faceDescriptor?: number[];
  fingerprintHash?: string;
  capturedAt: Date;
}

export interface SuperAdmin {
  id: string;
  email: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  isActive: boolean;
  emailVerified: boolean;
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
