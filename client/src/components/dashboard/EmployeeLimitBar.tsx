import { Users, AlertTriangle } from 'lucide-react'
import { useEmployeeLimit } from '@/hooks/useEmployeeLimit'

export default function EmployeeLimitBar() {
  const { declaredLimit, currentCount, remaining, usagePercentage, canAddMore, loading } = useEmployeeLimit()

  if (loading) {
    return null
  }

  // Don't show if no limit set
  if (declaredLimit === 0) {
    return null
  }

  const getColorClasses = () => {
    if (usagePercentage >= 100) {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        bar: 'bg-red-500',
        icon: 'text-red-600'
      }
    } else if (usagePercentage >= 90) {
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-700',
        bar: 'bg-orange-500',
        icon: 'text-orange-600'
      }
    } else if (usagePercentage >= 75) {
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-700',
        bar: 'bg-yellow-500',
        icon: 'text-yellow-600'
      }
    } else {
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        bar: 'bg-blue-500',
        icon: 'text-blue-600'
      }
    }
  }

  const colors = getColorClasses()

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-xl p-4 sm:p-6 mb-6`}>
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}>
          {usagePercentage >= 90 ? (
            <AlertTriangle className={`w-5 h-5 ${colors.icon}`} />
          ) : (
            <Users className={`w-5 h-5 ${colors.icon}`} />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-sm font-semibold ${colors.text}`}>
              Employee Limit
            </h3>
            <span className={`text-xs font-medium ${colors.text}`}>
              {currentCount} / {declaredLimit}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white rounded-full h-3 overflow-hidden shadow-inner">
            <div
              className={`h-full ${colors.bar} transition-all duration-500 ease-out rounded-full`}
              style={{ width: `${Math.min(100, usagePercentage)}%` }}
            />
          </div>

          {/* Status Message */}
          <div className="mt-3 flex items-center justify-between">
            <p className={`text-xs ${colors.text}`}>
              {canAddMore ? (
                <>
                  <span className="font-semibold">{remaining}</span> {remaining === 1 ? 'slot' : 'slots'} remaining
                </>
              ) : (
                <span className="font-semibold">Limit reached!</span>
              )}
            </p>
            
            {usagePercentage >= 90 && (
              <span className={`text-xs font-medium ${colors.text}`}>
                {usagePercentage >= 100 ? '⚠️ At capacity' : '⚠️ Almost full'}
              </span>
            )}
          </div>

          {/* Warning Message */}
          {!canAddMore && (
            <div className="mt-3 p-2 bg-white rounded-lg border border-red-200">
              <p className="text-xs text-red-600">
                You've reached your declared employee limit. Contact support to increase your limit.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
