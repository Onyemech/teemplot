import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { hasFeatureAccess, type Feature, type SubscriptionPlan } from '@/utils/planFeatures'

interface FeatureAccessState {
  plan: SubscriptionPlan | null
  hasAccess: (feature: Feature) => boolean
  loading: boolean
  error: string | null
}

export function useFeatureAccess(): FeatureAccessState {
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPlan()
  }, [])

  const fetchPlan = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/api/company/info')
      setPlan(response.data.subscription_plan)
      setError(null)
    } catch (err: any) {
      console.error('Failed to fetch plan:', err)
      setError(err.message || 'Failed to fetch plan')
      // Default to trial plan on error
      setPlan('trial')
    } finally {
      setLoading(false)
    }
  }

  const checkAccess = (feature: Feature): boolean => {
    if (!plan) return false
    return hasFeatureAccess(plan, feature)
  }

  return {
    plan,
    hasAccess: checkAccess,
    loading,
    error
  }
}
