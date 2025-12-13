import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { useSettingsSync } from '@/hooks/useSettingsSync'




export default function LatenessPolicySetup() {
  const navigate = useNavigate()
  const toast = useToast()
  const { updateSettings, markSetupStepCompleted } = useSettingsSync()
  // Removed showSuccess state as we're navigating directly
  const [loading, setLoading] = useState(false)
  const [gracePeriod, setGracePeriod] = useState(15)



  const handleContinue = async () => {
    setLoading(true)
    try {
      // Update settings using the sync hook
      await updateSettings('lateness-policy', {
        gracePeriodMinutes: gracePeriod,
        lateArrivalEnabled: true
      })

      // Mark this step as completed
      await markSetupStepCompleted('lateness-policy')
      
      toast.success('Lateness policy saved successfully!')
      
      // Move to next step
      navigate('/dashboard/attendance/setup/automate-alerts')
    } catch (error: any) {
      console.error('Failed to save lateness policy:', error)
      toast.error('Failed to save lateness policy')
    } finally {
      setLoading(false)
    }
  }

  // Removed success modal - navigating directly to next step

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header at top */}
      <div className="px-6 py-3 bg-gray-50">
        <h1 className="text-2xl font-bold text-gray-900">Lateness Policy</h1>
      </div>

      {/* Main Layout - Content Left, Progress Right */}
      <div className="flex">
        {/* Form Content - Left Side */}
        <div className="flex-1 pl-6 pr-4 py-8 flex items-center justify-center">
          <div className="max-w-md w-full">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Grace Period
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Added time before considering lateness
                </p>
                
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    value={gracePeriod}
                    onChange={(e) => setGracePeriod(parseInt(e.target.value) || 0)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm text-lg"
                    min="0"
                    max="60"
                  />
                  <span className="text-lg text-gray-600 font-medium">Minutes</span>
                </div>
                
                <p className="text-sm text-gray-500 mt-2">
                  Employees can clock in up to {gracePeriod} minutes late without being marked as late
                </p>
              </div>
            </div>

            {/* Continue Button */}
            <div className="mt-8">
              <button
                onClick={handleContinue}
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white py-3 px-6 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Progress Tracker - Right Side with Light Gray Background */}
        <div className="w-72 pl-4 pr-6 py-4 bg-gray-50">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                <CheckCircle className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-medium text-green-700">Company location</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                <CheckCircle className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-medium text-green-700">Employee hours</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
              <span className="text-sm font-medium text-orange-700">Lateness policy</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
              <span className="text-sm font-medium text-gray-600">Automate alerts</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
              <span className="text-sm font-medium text-gray-600">Biometrics Clock-in option</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}