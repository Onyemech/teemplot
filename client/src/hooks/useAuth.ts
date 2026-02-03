import { useState, useEffect } from 'react'
import { UserRoles, UserRole } from '@/constants/roles'

export type { UserRole }
export type SubscriptionPlan = 'trial' | 'silver' | 'gold'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  companyId: string
  company: {
    id: string
    name: string
    subscriptionPlan: SubscriptionPlan
    subscriptionStatus: 'active' | 'expired' | 'cancelled'
    trialEndsAt: string | null
    employeeLimit: number
    currentEmployeeCount: number
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const { getUser } = await import('@/utils/auth')
      
      // Fetch user from server (uses httpOnly cookies)
      const userData = await getUser()
      
      if (userData) {
        setUser(userData as User)
      } else {
        setUser(null)
      }
    } catch (error: any) {
      console.error('Failed to fetch user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const isOwner = user?.role === UserRoles.OWNER
  const isAdmin = user?.role === UserRoles.ADMIN
  const isDepartmentHead = user?.role === UserRoles.DEPARTMENT_HEAD
  const isEmployee = user?.role === UserRoles.EMPLOYEE
  
  // Backward compatibility alias (deprecated)
  const isStaff = isEmployee

  // Role-based permissions
  const canManageEmployees = isOwner || isAdmin || isDepartmentHead
  const canManageOwner = false // No one can manage owner
  const canManageAdmin = isOwner // Only owner can manage admin
  const canManageDepartmentHead = isOwner || isAdmin
  const canManageStaff = isOwner || isAdmin || isDepartmentHead
  const canModifySubscription = isOwner
  const canDeleteCompany = isOwner

  const logout = async () => {
    try {
      const { logout } = await import('@/utils/auth')
      await logout()
      setUser(null)
    } catch (error: any) {
      console.error('Failed to logout:', error)
    }
  }

  return {
    user,
    loading,
    logout,
    isOwner,
    isAdmin,
    isDepartmentHead,
    isEmployee,
    isStaff,
    canManageEmployees,
    canManageOwner,
    canManageAdmin,
    canManageDepartmentHead,
    canManageStaff,
    canModifySubscription,
    canDeleteCompany,
    refetch: fetchUser
  }
}
