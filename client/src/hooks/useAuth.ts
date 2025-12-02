import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'

export type UserRole = 'owner' | 'admin' | 'staff'
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
      const response = await apiClient.get('/api/auth/me')
      setUser(response.data)
    } catch (error) {
      console.error('Failed to fetch user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const isOwner = user?.role === 'owner'
  const isAdmin = user?.role === 'admin'
  const isStaff = user?.role === 'staff'
  
  // Role-based permissions
  const canManageEmployees = isOwner || isAdmin
  const canManageOwner = false // No one can manage owner
  const canManageAdmin = isOwner // Only owner can manage admin
  const canManageStaff = isOwner || isAdmin
  const canModifySubscription = isOwner
  const canDeleteCompany = isOwner

  return {
    user,
    loading,
    isOwner,
    isAdmin,
    isStaff,
    canManageEmployees,
    canManageOwner,
    canManageAdmin,
    canManageStaff,
    canModifySubscription,
    canDeleteCompany,
    refetch: fetchUser
  }
}
