import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Fingerprint, Shield, CheckCircle } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { useSettingsSync } from '@/hooks/useSettingsSync'

interface SetupStep {
  id: string
  title: string
  completed: boolean
  current?: boolean
}

export default function BiometricSetup() {
  const navigate = useNavigate()
  const toast = useToast()
  const { updateSettings, markSetupStepCompleted } = useSettingsSync()
  
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [loading, setLoading] = useState(false)

  const setupSteps: SetupStep[] = [
    { id: 'company-location', title: 'Company location', completed: true },
    { id: 'employee-hours', title: 'Employee hours', completed: true },
    { id: 'lateness-policy', title: 'Lateness policy', completed: true },
    { id: 'automate-alerts', title: 'Automate alerts', completed: true },
    { id: 'biometric-clockin', title: 'Biometrics Clock-in option', completed: false, current: true }
  ]

  useEffect(() => {
    // Load current biometric settings
    loadCurrentSettings()
  }, [])

  const loadCurrentSettings = async () => {
    try {
      // This would typically load from your settings API
      // For now, we'll use a default value
      setBiometricEnabled(false)
    } catch (error) {
      console.error('Failed to load biometric settings:', error)
    }
  }

  const handleFinish = async () => {
    setLoading(true)
    try {
      // Update settings using the sync hook
      await updateSettings('biometric', {
        faceIdEnabled: biometricEnabled,
        fingerprintEnabled: biometricEnabled,
        biometricEnabled
      })

      // Mark this step as completed
      await markSetupStepCompleted('biometric-clockin')

      toast.success('Biometric settings saved successfully!')
      
      // Navigate to attendance overview or dashboard
      navigate('/dashboard/attendance')
    } catch (error: any) {
      console.error('Failed to save biometric settings:', error)
      toast.error(error.message || 'Failed to save biometric settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header at top */}
      <div className="px-6 py-3 bg-gray-50">
        <h1 className="text-2xl font-bold text-gray-900">Biometric Clock-in Option</h1>
      </div>

      {/* Main Layout - Content Left, Progress Right */}
      <div className="flex">
        {/* Form Content - Left Side */}
        <div className="flex-1 pl-6 pr-4 py-8 flex items-center justify-center">
          <div className="max-w-md w-full">
            {/* Biometric Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Fingerprint className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Face ID & Finger Print
                    </h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Require employees to verify their identity using fingerprint or face ID upon clock-in
                  </p>
                </div>
                
                {/* Toggle Switch */}
                <div className="ml-6">
                  <button
                    onClick={() => setBiometricEnabled(!biometricEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      biometricEnabled ? 'bg-orange-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        biometricEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Additional Info when enabled */}
              {biometricEnabled && (
                <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-green-900 mb-1">
                        Smart Authentication Fallback
                      </h4>
                      <p className="text-sm text-green-700">
                        Employees can use Face ID first, then fingerprint if face recognition fails, 
                        and finally fall back to password authentication if biometric methods are unavailable.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Finish Button */}
            <div className="mt-8">
              <button
                onClick={handleFinish}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white py-3 px-6 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Finish
                </>
              )}
              </button>
            </div>
          </div>
        </div>

        {/* Progress Tracker - Right Side with Light Gray Background */}
        <div className="w-72 pl-4 pr-6 py-4 bg-gray-50">
          <div className="space-y-4">
            {setupSteps.map((step) => (
              <div key={step.id} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  step.completed 
                    ? 'bg-green-600' 
                    : step.current 
                      ? 'bg-orange-600' 
                      : 'bg-gray-300'
                }`}>
                  {step.completed ? (
                    <CheckCircle className="w-3 h-3 text-white" />
                  ) : (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <span className={`text-sm font-medium ${
                  step.current 
                    ? 'text-orange-700' 
                    : step.completed 
                      ? 'text-green-700' 
                      : 'text-gray-600'
                }`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}