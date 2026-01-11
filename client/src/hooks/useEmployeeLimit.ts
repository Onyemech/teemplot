import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'

interface EmployeeLimitState {
  declaredLimit: number // What user said during onboarding
  currentCount: number // Actual current employees
  remaining: number // How many more can be added
  usagePercentage: number // For progress bar
  canAddMore: boolean
  planType: 'silver' | 'gold' | 'enterprise' // Added planType
  loading: boolean
  error: string | null
}

export function useEmployeeLimit() {
  const [state, setState] = useState<EmployeeLimitState>({
    declaredLimit: 0,
    currentCount: 0,
    remaining: 0,
    usagePercentage: 0,
    canAddMore: false,
    planType: 'silver', // Default
    loading: true,
    error: null
  })

  useEffect(() => {
    fetchEmployeeLimit()
  }, [])

  const fetchEmployeeLimit = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      const response = await apiClient.get('/api/company/info')
      const { 
        employee_limit, 
        current_employee_count, 
        pending_invitations_count,
        subscription_plan, 
        subscription_status 
      } = response.data

      // Use employee_limit from DB, default to 0 if null
      const declaredLimit = employee_limit ?? 0
      const currentCount = Number(current_employee_count ?? 0)
      const pendingCount = Number(pending_invitations_count ?? 0)
      
      // Calculate remaining based on total usage (active + pending)
      const currentUsage = currentCount + pendingCount
      const remaining = Math.max(0, declaredLimit - currentUsage)
      const usagePercentage = declaredLimit > 0 ? (currentUsage / declaredLimit) * 100 : 0
      const canAddMore = currentUsage < declaredLimit

      // Determine plan type
      let planType: 'silver' | 'gold' | 'enterprise' = 'silver'
      if (subscription_status === 'trial') planType = 'gold' // Trial gives Gold access
      else if (subscription_plan?.includes('gold')) planType = 'gold'
      else if (subscription_plan?.includes('enterprise')) planType = 'enterprise'

      setState({
        declaredLimit,
        currentCount, // Keep as active count for display
        remaining,
        usagePercentage,
        canAddMore,
        planType,
        loading: false,
        error: null
      })
    } catch (err: any) {
      console.error('Failed to fetch employee limit:', err)
      setState({
        declaredLimit: 10,
        currentCount: 0,
        remaining: 10,
        usagePercentage: 0,
        canAddMore: true,
        planType: 'silver',
        loading: false,
        error: err.message || 'Failed to fetch employee limit'
      })
    }
  }

  const refresh = () => {
    fetchEmployeeLimit()
  }

  return {
    ...state,
    refresh
  }
}
