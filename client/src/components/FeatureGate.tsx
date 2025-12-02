import { ReactNode } from 'react'
import { Lock, ArrowUpCircle } from 'lucide-react'
import { useFeatureAccess } from '@/hooks/useFeatureAccess'
import { type Feature, getFeatureDisplayName, PLAN_FEATURES } from '@/utils/planFeatures'

interface FeatureGateProps {
  feature: Feature
  children: ReactNode
  fallback?: ReactNode
  showUpgrade?: boolean
}

export default function FeatureGate({ 
  feature, 
  children, 
  fallback,
  showUpgrade = true 
}: FeatureGateProps) {
  const { hasAccess, plan, loading } = useFeatureAccess()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // If user has access, render children
  if (hasAccess(feature)) {
    return <>{children}</>
  }

  // If custom fallback provided, use it
  if (fallback) {
    return <>{fallback}</>
  }

  // Default upgrade prompt
  if (showUpgrade) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-gray-400" />
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {getFeatureDisplayName(feature)} Not Available
        </h3>
        
        <p className="text-gray-600 text-center mb-6 max-w-md">
          {plan === 'trial' && (
            <>Your trial has expired. Subscribe to Silver or Gold plan to access {getFeatureDisplayName(feature)}</>
          )}
          {plan === 'silver' && (
            <>Upgrade to Gold plan to access {getFeatureDisplayName(feature)}</>
          )}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => window.location.href = '/dashboard/settings/billing'}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <ArrowUpCircle className="w-5 h-5" />
            Upgrade Plan
          </button>
          
          <button
            onClick={() => window.location.href = '/dashboard/settings/billing'}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            View Plans
          </button>
        </div>

        {/* Feature comparison */}
        <div className="mt-8 p-4 bg-white rounded-lg border border-gray-200 w-full max-w-md">
          <p className="text-sm font-medium text-gray-700 mb-3">Available in:</p>
          <div className="space-y-2">
            {Object.entries(PLAN_FEATURES).map(([planKey, planInfo]) => {
              const hasPlanAccess = planInfo.features.includes(feature)
              return (
                <div 
                  key={planKey}
                  className={`flex items-center justify-between p-2 rounded ${
                    hasPlanAccess ? 'bg-green-50' : 'bg-gray-50'
                  }`}
                >
                  <span className="text-sm font-medium capitalize">{planInfo.displayName}</span>
                  {hasPlanAccess ? (
                    <span className="text-xs text-green-600 font-medium">✓ Included</span>
                  ) : (
                    <span className="text-xs text-gray-400">Not included</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // No access and no upgrade prompt
  return null
}
