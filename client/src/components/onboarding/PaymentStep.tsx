import { useState } from 'react'
import { Check } from 'lucide-react'
import { submitPlanSelection, completeOnboarding } from '@/utils/onboardingApi'
import { getUser } from '@/utils/auth'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'
import { useUser } from '@/contexts/UserContext'

interface PaymentStepProps {
  companySize: string
  onComplete: () => void
}

export default function PaymentStep({ companySize, onComplete }: PaymentStepProps) {
  const toast = useToast()
  const { refetch } = useUser()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedPlan, setSelectedPlan] = useState<'silver' | 'gold'>('gold')
  const [loading, setLoading] = useState(false)

  const numberOfEmployees = parseInt(companySize) || 1

  // Pricing per user per month (from database schema)
  const SILVER_MONTHLY = 1200
  const SILVER_YEARLY = 12000
  const GOLD_MONTHLY = 2500
  const GOLD_YEARLY = 25000

  const calculatePrice = (plan: 'silver' | 'gold', cycle: 'monthly' | 'yearly') => {
    const perUser = plan === 'silver' 
      ? (cycle === 'monthly' ? SILVER_MONTHLY : SILVER_YEARLY)
      : (cycle === 'monthly' ? GOLD_MONTHLY : GOLD_YEARLY)
    return perUser * numberOfEmployees
  }

  const calculateSavings = (plan: 'silver' | 'gold') => {
    const monthlyTotal = calculatePrice(plan, 'monthly') * 12
    const yearlyTotal = calculatePrice(plan, 'yearly')
    const savings = monthlyTotal - yearlyTotal
    const percentage = ((savings / monthlyTotal) * 100).toFixed(0)
    return { savings, percentage }
  }

  const plans = {
    silver: {
      name: 'Silver Plan',
      description: 'For small teams',
      monthlyPrice: calculatePrice('silver', 'monthly'),
      yearlyPrice: calculatePrice('silver', 'yearly'),
      hasTrial: false,
      features: [
        'Attendance tracking',
        'Task management',
        'Basic reports',
        `${numberOfEmployees} total ${numberOfEmployees === 1 ? 'user' : 'users'} (including you)`,
        'Email support',
      ]
    },
    gold: {
      name: 'Gold Plan',
      description: 'For growing companies',
      monthlyPrice: calculatePrice('gold', 'monthly'),
      yearlyPrice: calculatePrice('gold', 'yearly'),
      hasMonthlyTrial: true, // Only monthly has trial
      features: [
        'Advanced attendance tracking',
        'Task management',
        'Performance metrics',
        'Advanced reports',
        `${numberOfEmployees} total ${numberOfEmployees === 1 ? 'user' : 'users'} (including you)`,
        'Priority support',
        'Custom integrations',
      ]
    }
  }

  const currentPlan = plans[selectedPlan]
  const price = billingCycle === 'monthly' ? currentPlan.monthlyPrice : currentPlan.yearlyPrice
  const savings = calculateSavings(selectedPlan)

  return (
    <div className="space-y-6">
      {/* Plan Selection */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setSelectedPlan('silver')}
          className={`p-4 rounded-lg border-2 transition-all ${
            selectedPlan === 'silver'
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <h3 className="font-bold text-lg text-gray-900">Silver</h3>
          <p className="text-sm text-gray-600">Small teams</p>
        </button>
        <button
          onClick={() => setSelectedPlan('gold')}
          className={`p-4 rounded-lg border-2 transition-all relative ${
            selectedPlan === 'gold'
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          {billingCycle === 'monthly' && (
            <div className="absolute -top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              30-DAY FREE
            </div>
          )}
          <h3 className="font-bold text-lg text-gray-900">Gold</h3>
          <p className="text-sm text-gray-600">Growing teams</p>
        </button>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4 p-1 bg-gray-100 rounded-lg w-fit mx-auto">
        <button
          onClick={() => setBillingCycle('monthly')}
          className={`px-6 py-2 rounded-md transition-colors font-medium ${
            billingCycle === 'monthly' ? 'bg-white shadow-sm' : ''
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingCycle('yearly')}
          className={`px-6 py-2 rounded-md transition-colors font-medium ${
            billingCycle === 'yearly' ? 'bg-white shadow-sm' : ''
          }`}
        >
          Yearly <span className="text-green-600 text-xs ml-1 font-bold">(Save {savings.percentage}%)</span>
        </button>
      </div>

      {/* Plan Card */}
      <div className="border-2 border-primary-500 rounded-xl p-6 bg-white shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{currentPlan.name}</h3>
            <p className="text-sm text-gray-600">{currentPlan.description}</p>
          </div>
          {selectedPlan === 'gold' && billingCycle === 'monthly' && (
            <div className="px-3 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-full">
              30-DAY FREE TRIAL
            </div>
          )}
        </div>

        <div className="mb-6 pb-6 border-b border-gray-200">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-bold text-gray-900">₦{price.toLocaleString()}</span>
            <span className="text-gray-600">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
          </div>
          <p className="text-sm text-gray-600 mb-1">
            For {numberOfEmployees} total {numberOfEmployees === 1 ? 'user' : 'users'} (including you)
          </p>
          <p className="text-xs text-gray-500">
            You can invite {numberOfEmployees - 1} additional {numberOfEmployees - 1 === 1 ? 'person' : 'people'}
          </p>
          {billingCycle === 'yearly' && (
            <div className="mt-3 inline-block bg-green-50 border border-green-200 rounded-lg px-3 py-1">
              <p className="text-sm text-green-700 font-medium">
                💰 Save ₦{savings.savings.toLocaleString()}/year ({savings.percentage}% off)
              </p>
            </div>
          )}
        </div>

        <ul className="space-y-3 mb-6">
          {currentPlan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={async () => {
            setLoading(true)
            try {
              // Get user from httpOnly cookie (server validates automatically)
              const user = await getUser()
              
              if (!user || !user.companyId) {
                throw new Error('Session expired. Please log in again.')
              }
              
              const planKey = `${selectedPlan}_${billingCycle}` as 'silver_monthly' | 'silver_yearly' | 'gold_monthly' | 'gold_yearly'
              
              // Gold Monthly = Free Trial (no payment)
              if (selectedPlan === 'gold' && billingCycle === 'monthly') {
                // Submit plan selection (activates trial)
                await submitPlanSelection({
                  companyId: user.companyId,
                  plan: planKey,
                  companySize: numberOfEmployees,
                })

                // Complete onboarding
                await completeOnboarding({
                  companyId: user.companyId,
                  userId: user.id,
                })

                // Refresh user context to update onboarding status before navigation
                // This prevents the DashboardGuard from redirecting back to onboarding
                await refetch()

                toast.success('30-day free trial activated!')
                onComplete()
              } else {
                // All other plans require payment
                const paymentResponse = await apiClient.post('/subscription/initiate-subscription', {
                  plan: planKey,
                  companySize: numberOfEmployees,
                })

                if (paymentResponse.data.success && paymentResponse.data.data.authorizationUrl) {
                  // Redirect to payment page
                  window.location.href = paymentResponse.data.data.authorizationUrl
                } else {
                  throw new Error('Failed to initiate payment')
                }
              }
            } catch (error: any) {
              console.error('Failed to process payment:', error)
              const errorMsg = error.response?.data?.message || error.message || 'Failed to process payment'
              toast.error(errorMsg)
              
              // If auth error, redirect to login
              if (errorMsg.includes('Session expired') || errorMsg.includes('log in')) {
                setTimeout(() => {
                  window.location.href = '/login'
                }, 2000)
              }
            } finally {
              setLoading(false)
            }
          }}
          disabled={loading}
          className="w-full bg-primary text-white font-bold py-4 rounded-lg hover:bg-primary/90 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : (selectedPlan === 'gold' && billingCycle === 'monthly' 
            ? 'Start 30-Day Free Trial' 
            : 'Continue to Payment')}
        </button>
      </div>

      <div className="text-center space-y-2">
        {selectedPlan === 'gold' && billingCycle === 'monthly' && (
          <p className="text-sm font-medium text-green-600">
            ✓ 30-day free trial • No credit card required • Cancel anytime
          </p>
        )}
        <p className="text-xs text-gray-500">
          Change or cancel your plan anytime from your dashboard
        </p>
      </div>
    </div>
  )
}
