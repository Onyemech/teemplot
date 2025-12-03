import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { apiClient } from '@/lib/api'

interface SubscriptionWarningBarProps {
  userRole: 'owner' | 'admin' | 'staff'
}

export default function SubscriptionWarningBar({ userRole }: SubscriptionWarningBarProps) {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Only show for owner and admin
    if (userRole !== 'owner' && userRole !== 'admin') {
      return
    }

    const fetchSubscriptionStatus = async () => {
      try {
        const response = await apiClient.get('/company/subscription-status')
        const { subscriptionPlan, subscriptionEndDate } = response.data

        // Only show for paid subscriptions (silver/gold), not trial
        if ((subscriptionPlan === 'silver' || subscriptionPlan === 'gold') && subscriptionEndDate) {
          const endDate = new Date(subscriptionEndDate)
          const today = new Date()
          const diffTime = endDate.getTime() - today.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          // Only show if 7 days or less remaining
          if (diffDays <= 7 && diffDays > 0) {
            setDaysRemaining(diffDays)
          }
        }
      } catch (error) {
        console.error('Failed to fetch subscription status:', error)
      }
    }

    fetchSubscriptionStatus()
    // Check every hour
    const interval = setInterval(fetchSubscriptionStatus, 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [userRole])

  if (!daysRemaining || isDismissed) {
    return null
  }

  const getBarColor = () => {
    if (daysRemaining <= 2) return 'bg-red-500'
    if (daysRemaining <= 5) return 'bg-orange-500'
    return 'bg-yellow-500'
  }

  const getTextColor = () => {
    if (daysRemaining <= 2) return 'text-red-700'
    if (daysRemaining <= 5) return 'text-orange-700'
    return 'text-yellow-700'
  }

  const getBgColor = () => {
    if (daysRemaining <= 2) return 'bg-red-50'
    if (daysRemaining <= 5) return 'bg-orange-50'
    return 'bg-yellow-50'
  }

  return (
    <div className={`${getBgColor()} border-b border-gray-200`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3 flex-1">
            <AlertTriangle className={`w-5 h-5 ${getTextColor()}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${getTextColor()}`}>
                {daysRemaining === 1 
                  ? 'Your subscription expires tomorrow!' 
                  : `Your subscription expires in ${daysRemaining} days`}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                Renew now to avoid service interruption
              </p>
            </div>
            <button
              onClick={() => window.location.href = '/dashboard/settings/billing'}
              className={`px-4 py-2 ${getBarColor()} text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity`}
            >
              Renew Now
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
            style={{ width: `${Math.max(10, (daysRemaining / 7) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
