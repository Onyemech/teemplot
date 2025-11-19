'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Plan = 'silver_monthly' | 'silver_yearly' | 'gold_monthly' | 'gold_yearly';

interface PlanOption {
  id: Plan;
  name: string;
  price: number;
  period: string;
  features: string[];
  popular?: boolean;
  trial?: boolean;
}

export default function PlansPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const businessInfo = JSON.parse(sessionStorage.getItem('businessInfo') || '{}');
  const companySize = businessInfo.companySize || 1;

  const plans: PlanOption[] = [
    {
      id: 'silver_monthly',
      name: 'Silver Monthly',
      price: 1200,
      period: '30 Days',
      features: [
        'Clock-in/Clock-out',
        'Attendance Management',
        'Leave Management',
        'Leave Balance Configuration',
        'Attendance Data Access',
      ],
    },
    {
      id: 'silver_yearly',
      name: 'Silver Yearly',
      price: 12000,
      period: '365 Days',
      features: [
        'Everything in Silver Monthly',
        'Save ₦2,400 per employee/year',
        '16.7% discount',
      ],
    },
    {
      id: 'gold_monthly',
      name: 'Gold Monthly',
      price: 2500,
      period: '30 Days',
      popular: true,
      trial: true,
      features: [
        'Everything in Silver',
        'Task Assignment & Tracking',
        'Task Review Workflow',
        'Performance Metrics',
        'Access to New Features',
        '⭐ 30 Days FREE Trial',
      ],
    },
    {
      id: 'gold_yearly',
      name: 'Gold Yearly',
      price: 25000,
      period: '365 Days',
      features: [
        'Everything in Gold Monthly',
        'Save ₦5,000 per employee/year',
        '16.7% discount',
      ],
    },
  ];

  const calculateTotal = (pricePerEmployee: number) => {
    return pricePerEmployee * companySize;
  };

  const handleSelectPlan = async () => {
    if (!selectedPlan) return;

    setIsLoading(true);

    // Store plan selection
    sessionStorage.setItem('selectedPlan', selectedPlan);

    // Navigate to completion
    router.push('/onboarding/complete');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-6xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">🌱 Teemplot</h1>
        </div>

        {/* Progress */}
        <div className="mb-8 max-w-md mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Step 7 of 9</span>
            <span className="text-sm text-gray-600">78%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-600 h-2 rounded-full" style={{ width: '78%' }}></div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Plan</h2>
          <p className="text-gray-600">
            Company Size: {companySize} employees
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative bg-white rounded-lg shadow-sm p-6 cursor-pointer transition-all ${
                selectedPlan === plan.id
                  ? 'ring-2 ring-green-600 shadow-lg'
                  : 'hover:shadow-md'
              } ${plan.popular ? 'border-2 border-green-600' : 'border border-gray-200'}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                    POPULAR
                  </span>
                </div>
              )}

              {plan.trial && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-yellow-400 text-gray-900 text-xs font-medium px-3 py-1 rounded-full">
                    FREE TRIAL
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-600">{plan.period}</p>
              </div>

              <div className="mb-4">
                <div className="text-3xl font-bold text-gray-900">
                  ₦{plan.price.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">per employee</div>
                <div className="text-lg font-semibold text-green-600 mt-2">
                  Total: ₦{calculateTotal(plan.price).toLocaleString()}
                </div>
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start text-sm">
                    <svg
                      className="w-5 h-5 text-green-600 mr-2 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {selectedPlan === plan.id && (
                <div className="absolute top-4 right-4">
                  <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Continue Button */}
        <div className="max-w-md mx-auto">
          <button
            onClick={handleSelectPlan}
            disabled={!selectedPlan || isLoading}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Processing...' : 'Continue to Payment'}
          </button>

          <button
            onClick={() => router.back()}
            className="mt-4 w-full text-center text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}
