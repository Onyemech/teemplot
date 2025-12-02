import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'

interface EmployeeLimitState {
  declaredLimit: number // What user said during onboarding
  currentCount: number // Actual current employees
  remaining: number // How many more can be added
  usagePercentage: number // For progress bar
  canAddMore: boolean
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
    loading: true,
    error: null
  })

  useEffect(() => {
    fetchEmployeeLimit()
  }, [])

  const fetchEmployeeLimit = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }))
      
      const response = await apiClient.get('/api/company/info')
      const { employee_count: declaredLimit, current_employee_count: currentCount } = response.data

      const remaining = Math.max(0, declaredLimit - currentCount)
      const usagePercentage = declaredLimit > 0 ? (currentCount / declaredLimit) * 100 : 0
      const canAddMore = currentCount < declaredLimit

      setState({
        declaredLimit,
        currentCount,
        remaining,
        usagePercentage,
        canAddMore,
        loading: false,
        error: null
      })
    } catch (err: any) {
      console.error('Failed to fetch employee limit:', err)
      setState(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to fetch employee limit'
      }))
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
