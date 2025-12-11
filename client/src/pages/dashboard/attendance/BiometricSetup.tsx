import { useState } from 'react'
import { Fingerprint, Clock, MapPin, Settings, Bell, CheckCircle, Shield } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { useNavigate } from 'react-router-dom'
import AnimatedCheckmark from '@/components/ui/AnimatedCheckmark'
import InviteEmployeeCard from '@/components/dashboard/InviteEmployeeCard'

interface SetupStep {
  id: string
  title: string
  description: string
  icon: any
  status: 'completed' | 'current' | 'pending'
  color: string
}

export default function BiometricSetup() {
  const navigate = useNavigate()
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const setupSteps: SetupStep[] = [
    {
      id: 'company-location',
      title: 'Company location',
      description: 'Set your office location for geofencing',
      icon: MapPin,
      status: 'completed',
      color: 'text-primary'
    },
    {
      id: 'employee-hours',
      title: 'Employee hours',
      description: 'Configure work schedule and break times',
      icon: Clock,
      status: 'completed',
      color: 'text-primary'
    },
    {
      id: 'lateness-policy',
      title: 'Lateness policy',
      description: 'Set grace periods and late arrival rules',
      icon: Settings,
      status: 'completed',
      color: 'text-primary'
    },
    {
      id: 'automate-alerts',
      title: 'Automate alerts',
      description: 'Configure notification preferences',
      icon: Bell,
      status: 'completed',
      color: 'text-primary'
    },
    {
      id: 'biometric-clockin',
      title: 'Biometric Clock-in option',
      description: 'Enable advanced security features',
      icon: CheckCircle,
      status: 'current',
      color: 'text-orange-600'
    }
  ]

  const handleFinish = async () => {
    setLoading(true)
    try {
      const response = await apiClient.patch('/api/company-settings/biometric', {
        biometricEnabled
      })

      if (response.data.success) {
        setShowSuccessModal(true)
      }
    } catch (error: any) {
      console.error('Failed to save biometric settings:', error)
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
          <h1 className="text-2xl font-bold text-gray-900">Biometric Clock-in Option</h1>
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
                      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
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
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Enhanced Security</h2>
                <p className="text-gray-600">Enable biometric authentication for secure clock-in</p>
              </div>

              <div className="space-y-6">
                {/* Biometric Option */}
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Fingerprint className="w-12 h-12 text-primary" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Face ID & Finger Print</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    Require employees to use biometric authentication using their device's built-in sensors for enhanced security.
                  </p>

                  <div className="flex items-center justify-center gap-4 mb-8">
                    <div className="flex items-center gap-2 text-primary">
                      <Shield className="w-5 h-5" />
                      <span className="text-sm font-medium">Enhanced Security</span>
                    </div>
                    <div className="flex items-center gap-2 text-primary">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Prevent Buddy Punching</span>
                    </div>
                  </div>

                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={biometricEnabled}
                      onChange={(e) => setBiometricEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="relative w-16 h-9 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-7 peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-primary"></div>
                    <span className="ml-3 text-lg font-medium text-gray-900">
                      {biometricEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </div>

                {biometricEnabled && (
                  <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 shadow-sm">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-primary mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-primary mb-2">Biometric Authentication Enabled</h4>
                        <p className="text-primary/80 text-sm mb-3">
                          Employees will be prompted to use their device's biometric sensors (Face ID, Touch ID, or Fingerprint) when clocking in.
                        </p>
                        <ul className="text-sm text-primary/80 space-y-1">
                          <li>• Prevents unauthorized clock-ins</li>
                          <li>• Works with device's built-in security</li>
                          <li>• Fallback to PIN if biometric fails</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Finish Button */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white py-2 px-4 rounded-xl font-medium flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      Finish Setup
                      <CheckCircle className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md text-center">
            <div className="flex justify-center mb-6">
              <AnimatedCheckmark size="lg" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Attendance Setup Completed</h3>
            <p className="text-gray-600 mb-8">
              All your attendance settings have been configured successfully. Your employees can now start using the platform.
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <InviteEmployeeCard 
                  variant="compact"
                  buttonText="Invite Employees"
                  className="w-full justify-center"
                  onSuccess={() => navigate('/dashboard/employees')}
                />
              </div>
              <button
                onClick={() => navigate('/dashboard/attendance')}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
              >
                Skip for Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}