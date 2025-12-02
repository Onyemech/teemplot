import { AlertTriangle, CreditCard } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useFeatureAccess } from '@/hooks/useFeatureAccess'

export default function SubscriptionExpiredModal() {
  const navigate = useNavigate()
  const { isSubscriptionExpired, isTrialExpired, plan } = useFeatureAccess()

  if (!isSubscriptionExpired) return null

  const handlePayment = () => {
    navigate('/dashboard/settings/billing')
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isTrialExpired ? 'Trial Expired' : 'Subscription Expired'}
          </h2>

          {/* Message */}
          <p className="text-gray-600 mb-6">
            {isTrialExpired
              ? 'Your 30-day trial has ended. Upgrade to continue using all features.'
              : `Your ${plan} plan has expired. Renew your subscription to regain access.`}
          </p>

          {/* Payment Button */}
          <button
            onClick={handlePayment}
            className="w-full bg-[#0F5D5D] hover:bg-[#0a4444] text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            Renew Subscription
          </button>

          {/* Info */}
          <p className="text-sm text-gray-500 mt-4">
            All features are locked until payment is completed
          </p>
        </div>
      </div>
    </div>
  )
}
