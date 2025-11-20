export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface User {
  id: string
  companyId: string
  email: string
  firstName: string
  lastName: string
  phoneNumber?: string
  avatarUrl?: string
  role: 'owner' | 'admin' | 'staff'
  employeeId?: string
  departmentId?: string
  position?: string
  dateOfBirth?: string
  hireDate?: string
  isActive: boolean
  emailVerified: boolean
  createdAt: string
  updatedAt: string
}

export interface Company {
  id: string
  name: string
  slug: string
  email: string
  phoneNumber?: string
  address?: string
  city?: string
  stateProvince?: string
  country?: string
  postalCode?: string
  logoUrl?: string
  industry?: string
  companySize?: string
  employeeCount: number
  subscriptionPlan: 'trial' | 'silver_monthly' | 'silver_yearly' | 'gold_monthly' | 'gold_yearly'
  subscriptionStatus: 'active' | 'inactive' | 'cancelled' | 'expired'
  subscriptionStartDate?: string
  subscriptionEndDate?: string
  trialStartDate?: string
  trialEndDate?: string
  taxIdentificationNumber?: string
  website?: string
  cacDocumentUrl?: string
  proofOfAddressUrl?: string
  companyPolicyUrl?: string
  onboardingCompleted: boolean
  ownerFirstName?: string
  ownerLastName?: string
  ownerEmail?: string
  ownerPhone?: string
  ownerDateOfBirth?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AttendanceRecord {
  id: string
  userId: string
  clockInTime: string
  clockOutTime?: string
  clockInLocation?: {
    latitude: number
    longitude: number
    address?: string
  }
  clockOutLocation?: {
    latitude: number
    longitude: number
    address?: string
  }
  totalHours?: number
  status: 'present' | 'late' | 'absent' | 'half_day'
  createdAt: string
}

export interface Task {
  id: string
  companyId: string
  title: string
  description?: string
  assignedTo?: string
  assignedBy?: string: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  dueDate?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}
