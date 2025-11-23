import { useState } from 'react'
import { Check } from 'lucide-react'

interface PaymentStepProps {
  companySize: string
  onComplete: () => void
}

export default function PaymentStep({ companySize, onComplete }: PaymentStepProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedPlan, setSelectedPlan] = useState<'silver' | 'gold'>('gold')

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
      features: [
        'Attendance tracking',
        'Task management',
        'Basic reports',
        `${numberOfEmployees} ${numberOfEmployees === 1 ? 'user' : 'users'}`,
        'Email support',
      ]
    },
    gold: {
      name: 'Gold Plan',
      description: 'For growing companies',
      monthlyPrice: calculatePrice('gold', 'monthly'),
      yearlyPrice: calculatePrice('gold', 'yearly'),
      features: [
        'Advanced attendance tracking',
        'Task management',
        'Performance metrics',
        'Advanced reports',
        `${numberOfEmployees} ${numberOfEmployees === 1 ? 'user' : 'users'}`,
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
          <div className="absolute -top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            30-DAY FREE
          </div>
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
          {selectedPlan === 'gold' && (
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
          <p className="text-sm text-gray-600">
            For {numberOfEmployees} {numberOfEmployees === 1 ? 'employee' : 'employees'}
          </p>
          {billingCycle === 'yearly' && (
            <div className="mt-2 inline-block bg-green-50 border border-green-200 rounded-lg px-3 py-1">
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
          onClick={onComplete}
          className="w-full bg-primary-600 text-white font-bold py-4 rounded-lg hover:bg-primary-700 transition-colors shadow-md"
        >
          {selectedPlan === 'gold' ? 'Start 30-Day Free Trial' : 'Continue to Payment'}
        </button>
      </div>

      <div className="text-center space-y-2">
        {selectedPlan === 'gold' && (
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
