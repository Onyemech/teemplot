import { useState } from 'react'
import { Bell, Clock, MapPin, Settings, CheckCircle, ArrowRight } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { useNavigate } from 'react-router-dom'
import AnimatedCheckmark from '@/components/ui/AnimatedCheckmark'

interface AlertSettings {
  delayedClockIn: boolean
  nearTheOffice: boolean
}

interface SetupStep {
  id: string
  title: string
  description: string
  icon: any
  status: 'completed' | 'current' | 'pending'
  color: string
}

export default function AutomateAlertsSetup() {
  const navigate = useNavigate()
  const [alertSettings, setAlertSettings] = useState<AlertSettings>({
    delayedClockIn: false,
    nearTheOffice: false
  })
  const [loading, setLoading] = useState(false)

  const setupSteps: SetupStep[] = [
    {
      id: 'company-location',
      title: 'Company location',
      description: 'Set your office location for geofencing',
      icon: MapPin,
      status: 'completed',
      color: 'text-green-600'
    },
    {
      id: 'employee-hours',
      title: 'Employee hours',
      description: 'Configure work schedule and break times',
      icon: Clock,
      status: 'completed',
      color: 'text-green-600'
    },
    {
      id: 'lateness-policy',
      title: 'Lateness policy',
      description: 'Set grace periods and late arrival rules',
      icon: Settings,
      status: 'completed',
      color: 'text-green-600'
    },
    {
      id: 'automate-alerts',
      title: 'Automate alerts',
      description: 'Configure notification preferences',
      icon: Bell,
      status: 'current',
      color: 'text-orange-600'
    },
    {
      id: 'biometric-clockin',
      title: 'Biometric Clock-in option',
      description: 'Enable advanced security features',
      icon: CheckCircle,
      status: 'pending',
      color: 'text-gray-400'
    }
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
      const response = await apiClient.patch('/api/company-settings/notifications', {
        notifyDelayedClockIn: alertSettings.delayedClockIn,
        notifyNearOffice: alertSettings.nearTheOffice
      })

      if (response.data.success) {
        // Move to next step
        navigate('/dashboard/attendance/setup/biometric')
      }
    } catch (error: any) {
      console.error('Failed to save alert settings:', error)
      alert(error.response?.data?.message || 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Automate Alert & Notifications</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Setup Progress Sidebar */}
          <div className="lg:w-80">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Setup Progress</h2>
              <div className="space-y-4">
                {setupSteps.map((step) => {
                  const Icon = step.icon
                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        step.status === 'current' ? 'bg-orange-50 border border-orange-200' :
                        step.status === 'completed' ? 'bg-primary/10' : 'bg-gray-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        step.status === 'completed' ? 'bg-primary' :
                        step.status === 'current' ? 'bg-orange-600' : 'bg-gray-400'
                      }`}>
                        {step.status === 'completed' ? (
                          <AnimatedCheckmark size="sm" />
                        ) : (
                          <Icon className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${step.color}`}>
                          {step.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {step.description}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Configure Automated Alerts</h2>
                <p className="text-gray-600">Set up smart notifications to keep your team on track</p>
              </div>

              <div className="space-y-6">
                {/* Delayed Clock-in Alert */}
                <div className="flex items-center justify-between p-6 bg-gray-50 rounded-xl">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-orange-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Delayed Clock-in</h3>
                    </div>
                    <p className="text-gray-600 ml-13">
                      Prompt employees with alerts for delayed clock-ins
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alertSettings.delayedClockIn}
                      onChange={() => handleToggle('delayedClockIn')}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>

                {/* Near the Office Alert */}
                <div className="flex items-center justify-between p-6 bg-gray-50 rounded-xl">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Near the Office</h3>
                    </div>
                    <p className="text-gray-600 ml-13">
                      Prompt employees with alerts when within the set radius
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alertSettings.nearTheOffice}
                      onChange={() => handleToggle('nearTheOffice')}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Alert Preview */}
                {(alertSettings.delayedClockIn || alertSettings.nearTheOffice) && (
                  <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
                    <h4 className="font-semibold text-blue-900 mb-3">Alert Preview</h4>
                    <div className="space-y-3">
                      {alertSettings.delayedClockIn && (
                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <Clock className="w-4 h-4 text-orange-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">Clock-in Reminder</div>
                            <div className="text-sm text-gray-600">You're running late! Don't forget to clock in.</div>
                          </div>
                        </div>
                      )}
                      {alertSettings.nearTheOffice && (
                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">Near Office</div>
                            <div className="text-sm text-gray-600">You're near the office. Ready to clock in?</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Continue Button */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={handleContinue}
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white py-2 px-4 rounded-xl font-medium flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
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
        </div>
      </div>
    </div>
  )
}