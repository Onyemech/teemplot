import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { submitPlanSelection, completeOnboarding } from '@/utils/onboardingApi'
import { useUser } from '@/contexts/UserContext'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'

interface PaymentStepProps {
  companySize: string
  onComplete: () => void
}

interface PricingData {
  silver_monthly: number;
  silver_yearly: number;
  gold_monthly: number;
  gold_yearly: number;
}

export default function PaymentStep({ companySize, onComplete }: PaymentStepProps) {
  const toast = useToast()
  const { user } = useUser() // Use UserContext instead of API call
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedPlan, setSelectedPlan] = useState<'silver' | 'gold'>('gold')
  const [loading, setLoading] = useState(false)
  const [pricingLoading, setPricingLoading] = useState(true)
  const [pricing, setPricing] = useState<PricingData>({
    silver_monthly: 1200,
    silver_yearly: 12000,
    gold_monthly: 2500,
    gold_yearly: 25000,
  })

  const numberOfEmployees = parseInt(companySize) || 1

  // Load pricing from server
  useEffect(() => {
    const loadPricing = async () => {
      try {
        const response = await apiClient.get('/api/subscription/pricing')
        if (response.data.success) {
          setPricing(response.data.data.pricing)
        }
      } catch (error) {
        console.error('Failed to load pricing:', error)
        toast.error('Failed to load pricing. Using default values.')
      } finally {
        setPricingLoading(false)
      }
    }

    loadPricing()
  }, [toast])

  const calculatePrice = (plan: 'silver' | 'gold', cycle: 'monthly' | 'yearly') => {
    const perUser = plan === 'silver' 
      ? (cycle === 'monthly' ? pricing.silver_monthly : pricing.silver_yearly)
      : (cycle === 'monthly' ? pricing.gold_monthly : pricing.gold_yearly)
    return Math.round(perUser * numberOfEmployees * 100) / 100 // Round to 2 decimal places
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

  if (pricingLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Loading pricing information...</p>
        </div>
      </div>
    )
  }

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
              // Use user from context (no API call needed)
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

                toast.success('30-day free trial activated!')
                onComplete()
              } else {
                // All other plans require payment
                const paymentResponse = await apiClient.post('/api/subscription/initiate-subscription', {
                  plan: planKey,
                  companySize: numberOfEmployees,
                }, {
                  timeout: 10000 // 10 second timeout for payment initialization
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
