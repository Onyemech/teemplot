import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'

export type SubscriptionPlan = 'free' | 'silver' | 'gold'

interface PlanLimits {
  maxEmployees: number
  currentEmployees: number
  canAddEmployee: boolean
  usagePercentage: number
  plan: SubscriptionPlan
}

const PLAN_LIMITS: Record<SubscriptionPlan, number> = {
  free: 10,
  silver: 50,
  gold: Infinity
}

export function usePlanLimits() {
  const [limits, setLimits] = useState<PlanLimits | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPlanLimits()
  }, [])

  const fetchPlanLimits = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/api/company/info')
      const { subscription_plan, employee_count } = response.data

      const maxEmployees = PLAN_LIMITS[subscription_plan as SubscriptionPlan] || 10
      const canAddEmployee = employee_count < maxEmployees
      const usagePercentage = maxEmployees === Infinity 
        ? 0 
        : (employee_count / maxEmployees) * 100

      setLimits({
        maxEmployees,
        currentEmployees: employee_count,
        canAddEmployee,
        usagePercentage,
        plan: subscription_plan
      })
      setError(null)
    } catch (err: any) {
      console.error('Failed to fetch plan limits:', err)
      setError(err.message || 'Failed to fetch plan limits')
    } finally {
      setLoading(false)
    }
  }

  const refresh = () => {
    fetchPlanLimits()
  }

  return {
    limits,
    loading,
    error,
    refresh
  }
}
