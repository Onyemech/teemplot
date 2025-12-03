import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { Check, ArrowRight } from 'lucide-react'
import Button from '@/components/ui/Button'
import BackButton from '@/components/ui/BackButton'
import Card from '@/components/ui/Card'
import { submitPlanSelection } from '@/utils/onboardingApi'
import { getUser } from '@/utils/auth'
import { useToast } from '@/contexts/ToastContext'

interface Plan {
  id: string
  name: string
  price: string
  period: string
  features: string[]
  recommended?: boolean
  trial?: boolean
}

export default function SubscriptionPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [selectedPlan, setSelectedPlan] = useState<string>('gold')
  const [loading, setLoading] = useState(false)

  // Prefetch next page
  useEffect(() => {
    // prefetch not needed in React Router: '/onboarding/complete')
  }, [])

  const plans: Plan[] = [
    {
      id: 'silver',
      name: 'Silver',
      price: '₦15,000',
      period: 'per month',
      features: [
        'Advanced attendance tracking',
        'Task management with priorities',
        'Performance analytics',
        'Priority email support',
        'Mobile app access',
        'Custom reports',
      ],
    },
    {
      id: 'gold',
      name: 'Gold',
      price: '₦35,000',
      period: 'per month',
      recommended: true,
      trial: true,
      features: [
        'All Silver features',
        'Advanced analytics & insights',
        'Custom integrations',
        '24/7 support',
        'Dedicated account manager',
        'API access',
        'White-label options',
        '30-day free trial',
      ],
    },
  ]

  const handleContinue = async () => {
    setLoading(true)

    try {
      // Get user from httpOnly cookie
      const user = await getUser()
      
      if (!user || !user.companyId) {
        throw new Error('Session expired. Please log in again.')
      }
      
      // Get business info for company size
      const businessInfo = sessionStorage.getItem('onboarding_business_info')
      const companySize = businessInfo ? JSON.parse(businessInfo).employeeCount : 1
      
      // Map plan to backend format
      const planMap: Record<string, string> = {
        'silver': 'silver_monthly',
        'gold': 'gold_monthly',
      }
      
      // Submit plan selection to backend
      await submitPlanSelection({
        companyId: user.companyId,
        plan: planMap[selectedPlan] as any,
        companySize: parseInt(companySize),
      })
      
      // Store selected plan in session storage for reference
      sessionStorage.setItem('onboarding_subscription', JSON.stringify({
        plan: selectedPlan,
        timestamp: new Date().toISOString(),
      }))

      toast.success('Plan selected successfully!')

      // Gold with trial skips payment, silver goes to payment
      if (selectedPlan === 'gold') {
        navigate('/onboarding/complete')
      } else {
        // For silver, go to payment
        navigate('/onboarding/payment')
      }
    } catch (err: any) {
      console.error('Error saving subscription:', err)
      toast.error(err.message || 'Failed to select plan')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    navigate('/onboarding/documents')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Teemplot" className="h-16 w-auto" />
            <div className="text-sm text-gray-700 font-medium">
              Step 7 of 9
            </div>
          </div>
          <div className="text-sm font-medium text-[#0F5D5D]">
            Choose Your Plan
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-6xl mx-auto">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-[#0F5D5D] h-2 rounded-full transition-all duration-500" 
              style={{ width: '77%' }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Choose the perfect plan for your business
            </h1>
            <p className="text-xl text-gray-600">
              Choose the plan that fits your business needs
            </p>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`
                  relative p-8 cursor-pointer transition-all duration-200
                  ${selectedPlan === plan.id 
                    ? 'ring-2 ring-[#0F5D5D] shadow-xl scale-105' 
                    : 'hover:shadow-lg'
                  }
                  ${plan.recommended ? 'border-2 border-[#0F5D5D]' : ''}
                `}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.recommended && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-[#FF5722] text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Recommended
                    </span>
                  </div>
                )}

                {plan.trial && (
                  <div className="absolute -top-4 right-4">
                    <span className="bg-[#0F5D5D] text-white px-3 py-1 rounded-full text-xs font-semibold">
                      14-Day Trial
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-[#0F5D5D]">
                      {plan.price}
                    </span>
                    <span className="text-gray-600">
                      /{plan.period}
                    </span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-[#0F5D5D] flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={selectedPlan === plan.id ? 'primary' : 'outline'}
                  fullWidth
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
                </Button>
              </Card>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between max-w-4xl mx-auto">
            <BackButton onClick={handleBack} />

            <Button
              variant="primary"
              loading={loading}
              onClick={handleContinue}
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
            >
              {selectedPlan === 'gold' ? 'Start 30-Day Trial' : 'Continue to Payment'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
