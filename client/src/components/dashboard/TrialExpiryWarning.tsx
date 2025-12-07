import { useEffect, useState } from 'react'
import { Clock, X } from 'lucide-react'
import { apiClient } from '@/lib/api'

interface TrialExpiryWarningProps {
  userRole: 'owner' | 'admin' | 'staff'
}

export default function TrialExpiryWarning({ userRole }: TrialExpiryWarningProps) {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)
  const [plan, setPlan] = useState<string>('')

  useEffect(() => {
    // Only show for owner and admin
    if (userRole !== 'owner' && userRole !== 'admin') {
      return
    }

    const fetchTrialStatus = async () => {
      try {
        const response = await apiClient.get('/api/company/subscription-status')
        const { subscriptionPlan, trialEndDate } = response.data

        setPlan(subscriptionPlan)

        // Only show if on trial
        if (subscriptionPlan === 'trial' && trialEndDate) {
          const endDate = new Date(trialEndDate)
          const today = new Date()
          const diffTime = endDate.getTime() - today.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          // Show if trial is active
          if (diffDays >= 0) {
            setDaysRemaining(diffDays)
          }
        }
      } catch (error) {
        console.error('Failed to fetch trial status:', error)
      }
    }

    fetchTrialStatus()
    // Check every hour
    const interval = setInterval(fetchTrialStatus, 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [userRole])

  if (plan !== 'trial' || daysRemaining === null || isDismissed) {
    return null
  }

  const getBarColor = () => {
    if (daysRemaining === 0) return 'bg-red-500'
    if (daysRemaining <= 3) return 'bg-red-500'
    if (daysRemaining <= 7) return 'bg-orange-500'
    return 'bg-blue-500'
  }

  const getTextColor = () => {
    if (daysRemaining === 0) return 'text-red-700'
    if (daysRemaining <= 3) return 'text-red-700'
    if (daysRemaining <= 7) return 'text-orange-700'
    return 'text-blue-700'
  }

  const getBgColor = () => {
    if (daysRemaining === 0) return 'bg-red-50'
    if (daysRemaining <= 3) return 'bg-red-50'
    if (daysRemaining <= 7) return 'bg-orange-50'
    return 'bg-blue-50'
  }

  return (
    <div className={`${getBgColor()} border-b border-gray-200`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3 flex-1">
            <Clock className={`w-5 h-5 ${getTextColor()}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${getTextColor()}`}>
                {daysRemaining === 0 
                  ? 'Your 30-day trial ends today!' 
                  : daysRemaining === 1
                  ? 'Your 30-day trial ends tomorrow!'
                  : `${daysRemaining} days left in your 30-day trial`}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                Subscribe now to continue enjoying all Gold features
              </p>
            </div>
            <button
              onClick={() => window.location.href = '/dashboard/settings/billing'}
              className={`px-4 py-2 ${getBarColor()} text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity`}
            >
              Subscribe Now
            </button>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${getBarColor()} transition-all duration-300`}
            style={{ width: `${Math.max(0, (daysRemaining / 30) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
