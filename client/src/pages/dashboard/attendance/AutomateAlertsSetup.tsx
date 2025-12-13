import { useState } from 'react'
import { Clock, MapPin, CheckCircle, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSettingsSync } from '@/hooks/useSettingsSync'
import { useToast } from '@/contexts/ToastContext'

interface AlertSettings {
  delayedClockIn: boolean
  nearTheOffice: boolean
}



export default function AutomateAlertsSetup() {
  const navigate = useNavigate()
  const toast = useToast()
  const { updateSettings, markSetupStepCompleted } = useSettingsSync()
  const [alertSettings, setAlertSettings] = useState<AlertSettings>({
    delayedClockIn: false,
    nearTheOffice: false
  })
  const [loading, setLoading] = useState(false)

  const setupSteps = [
    { id: 'company-location', title: 'Company location', completed: true },
    { id: 'employee-hours', title: 'Employee hours', completed: true },
    { id: 'lateness-policy', title: 'Lateness policy', completed: true },
    { id: 'automate-alerts', title: 'Automate alerts', completed: false, current: true },
    { id: 'biometric-clockin', title: 'Biometrics Clock-in option', completed: false }
  ]

  const handleToggle = (setting: keyof AlertSettings) => {
    setAlertSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }))
  }

  const handleContinue = async () => {
    setLoading(true)
    try {
      // Update settings using the sync hook - use 'automate-alerts' to match the API
      await updateSettings('automate-alerts', {
        notifyDelayedClockIn: alertSettings.delayedClockIn,
        notifyNearOffice: alertSettings.nearTheOffice
      })

      // Mark this step as completed
      await markSetupStepCompleted('automate-alerts')
      
      // Move to next step
      navigate('/dashboard/attendance/setup/biometric')
    } catch (error: any) {
      console.error('Failed to save alert settings:', error)
      toast.error(error.message || 'Failed to save alert settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header at top */}
      <div className="px-6 py-3 bg-gray-50">
        <h1 className="text-2xl font-bold text-gray-900">Automate Alert & Notifications</h1>
      </div>

      {/* Main Layout - Content Left, Progress Right */}
      <div className="flex">
        {/* Form Content - Left Side */}
        <div className="flex-1 pl-6 pr-4 py-8 flex items-center justify-center">
          <div className="max-w-md w-full">
            <div className="space-y-6">
              {/* Delayed Clock-in Alert */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                        <Clock className="w-5 h-5 text-orange-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Delayed Clock-in
                      </h3>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Prompt employees with alerts for delayed clock-ins
                    </p>
                  </div>
                  
                  {/* Toggle Switch */}
                  <div className="ml-6">
                    <button
                      onClick={() => handleToggle('delayedClockIn')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                        alertSettings.delayedClockIn ? 'bg-orange-500' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          alertSettings.delayedClockIn ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Near the Office Alert */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Near the Office
                      </h3>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Prompt employees with alerts when within the set radius
                    </p>
                  </div>
                  
                  {/* Toggle Switch */}
                  <div className="ml-6">
                    <button
                      onClick={() => handleToggle('nearTheOffice')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        alertSettings.nearTheOffice ? 'bg-blue-500' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          alertSettings.nearTheOffice ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
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
                  <>
                    Continue
                    <ArrowRight className="w-5 h-5" />
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