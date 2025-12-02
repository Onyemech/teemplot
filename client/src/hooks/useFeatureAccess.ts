import { useAuth } from './useAuth'
import { hasFeatureAccess, type Feature, type SubscriptionPlan } from '@/utils/planFeatures'

export function useFeatureAccess() {
  const { user, loading } = useAuth()

  const plan: SubscriptionPlan = user?.company?.subscriptionPlan || 'trial'
  const subscriptionStatus = user?.company?.subscriptionStatus || 'active'
  const trialEndsAt = user?.company?.trialEndsAt
  const employeeLimit = user?.company?.employeeLimit || 0
  const currentEmployeeCount = user?.company?.currentEmployeeCount || 0

  // Check if trial has expired
  const isTrialExpired = plan === 'trial' && trialEndsAt && new Date(trialEndsAt) < new Date()
  
  // Check if subscription is expired
  const isSubscriptionExpired = subscriptionStatus === 'expired' || isTrialExpired

  // Check if employee limit reached
  const isEmployeeLimitReached = currentEmployeeCount >= employeeLimit

  const hasAccess = (feature: Feature): boolean => {
    // If subscription expired, no access to any features
    if (isSubscriptionExpired) return false
    
    return hasFeatureAccess(plan, feature)
  }

  const canAddEmployee = (): boolean => {
    if (isSubscriptionExpired) return false
    return !isEmployeeLimitReached
  }

  return {
    plan,
    subscriptionStatus,
    isTrialExpired,
    isSubscriptionExpired,
    isEmployeeLimitReached,
    employeeLimit,
    currentEmployeeCount,
    trialEndsAt,
    hasAccess,
    canAddEmployee,
    loading
  }
}
