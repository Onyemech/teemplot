import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Clock, Bell, Fingerprint, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { useToast } from '@/contexts/ToastContext'
// import { useUser } from '@/contexts/UserContext' // Commented out as not currently used

interface SetupStep {
  id: string
  title: string
  description: string
  icon: any
  completed: boolean
}

interface SetupData {
  companyLocation: {
    address: string
    latitude: number | null
    longitude: number | null
    radius: number
  }
  employeeHours: {
    startTime: string
    endTime: string
    breakDuration: number
    workDays: string[]
  }
  latenessPolicy: {
    graceMinutes: number
    enabled: boolean
  }
  automateAlerts: {
    lateClockIn: boolean
    missedClockOut: boolean
    nearOffice: boolean
  }
  biometricClockIn: {
    enabled: boolean
    adminEnrolled: boolean
  }
}

export default function AttendanceSetupWizard() {
  const navigate = useNavigate()
  const toast = useToast()
  // const { user } = useUser() // Commented out as not currently used
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [setupData, setSetupData] = useState<SetupData>({
    companyLocation: {
      address: '',
      latitude: null,
      longitude: null,
      radius: 100
    },
    employeeHours: {
      startTime: '09:00',
      endTime: '17:00',
      breakDuration: 60,
      workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    },
    latenessPolicy: {
      graceMinutes: 15,
      enabled: true
    },
    automateAlerts: {
      lateClockIn: true,
      missedClockOut: true,
      nearOffice: true
    },
    biometricClockIn: {
      enabled: false,
      adminEnrolled: false
    }
  })

  const steps: SetupStep[] = [
    {
      id: 'company-location',
      title: 'Company Location',
      description: 'Add and manage your company location',
      icon: MapPin,
      completed: false
    },
    {
      id: 'employee-hours',
      title: 'Employee Hours',
      description: 'Outline the expected working hours to guide employee attendance and ensure compliance',
      icon: Clock,
      completed: false
    },
    {
      id: 'lateness-policy',
      title: 'Lateness Policy',
      description: 'A buffer time allowing slight lateness before marking as late',
      icon: Clock,
      completed: false
    },
    {
      id: 'automate-alerts',
      title: 'Automate Alerts & Notifications',
      description: 'Prompt employees with alerts for delayed clock-ins and when near the office',
      icon: Bell,
      completed: false
    },
    {
      id: 'biometric-clockin',
      title: 'Biometrics Clock-in Option',
      description: 'Require employees to verify their identity using fingerprint, facial recognition, or other biometric methods',
      icon: Fingerprint,
      completed: false
    }
  ]

  const handleNext = async () => {
    setLoading(true)
    try {
      // Save current step data
      await saveStepData()
      
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1)
      } else {
        // Complete setup
        await completeSetup()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save step')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const saveStepData = async () => {
    const stepId = steps[currentStep].id
    
    switch (stepId) {
      case 'company-location':
        await apiClient.patch('/api/company-settings/location', setupData.companyLocation)
        break
      case 'employee-hours':
        await apiClient.patch('/api/company-settings/work-hours', setupData.employeeHours)
        break
      case 'lateness-policy':
        await apiClient.patch('/api/company-settings/lateness-policy', setupData.latenessPolicy)
        break
      case 'automate-alerts':
        await apiClient.patch('/api/company-settings/alerts', setupData.automateAlerts)
        break
      case 'biometric-clockin':
        await apiClient.patch('/api/company-settings/biometric', setupData.biometricClockIn)
        break
    }
  }

  const completeSetup = async () => {
    await apiClient.patch('/api/company-settings/attendance-setup-completed', { completed: true })
    toast.success('Attendance setup completed successfully!')
    navigate('/dashboard/attendance')
  }

  const renderStepContent = () => {
    const step = steps[currentStep]
    
    switch (step.id) {
      case 'company-location':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Add Location</h3>
              <p className="text-gray-600">Set your office location for accurate attendance tracking</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Company Address</label>
                <input
                  type="text"
                  value={setupData.companyLocation.address}
                  onChange={(e) => setSetupData(prev => ({
                    ...prev,
                    companyLocation: { ...prev.companyLocation, address: e.target.value }
                  }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                  placeholder="34 Oduduwa Way Ikeja, Nigeria"
                />
              </div>

              <div className="bg-gray-900 rounded-xl p-4 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium">Coordinate: 6.428804, 3.443709</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Clock-in Radius (m)</label>
                <input
                  type="number"
                  value={setupData.companyLocation.radius}
                  onChange={(e) => setSetupData(prev => ({
                    ...prev,
                    companyLocation: { ...prev.companyLocation, radius: parseInt(e.target.value) }
                  }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                  placeholder="E.g. 10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Location Title</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                  placeholder="E.g. Head Office"
                />
              </div>
            </div>
          </div>
        )

      case 'employee-hours':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Employee Hours</h3>
              <p className="text-gray-600">Configure work schedule and break times</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Start Time</label>
                <input
                  type="time"
                  value={setupData.employeeHours.startTime}
                  onChange={(e) => setSetupData(prev => ({
                    ...prev,
                    employeeHours: { ...prev.employeeHours, startTime: e.target.value }
                  }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">End Time</label>
                <input
                  type="time"
                  value={setupData.employeeHours.endTime}
                  onChange={(e) => setSetupData(prev => ({
                    ...prev,
                    employeeHours: { ...prev.employeeHours, endTime: e.target.value }
                  }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Break Duration (minutes)</label>
              <input
                type="number"
                value={setupData.employeeHours.breakDuration}
                onChange={(e) => setSetupData(prev => ({
                  ...prev,
                  employeeHours: { ...prev.employeeHours, breakDuration: parseInt(e.target.value) }
                }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                placeholder="60"
              />
            </div>
          </div>
        )

      case 'lateness-policy':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Lateness Policy</h3>
              <p className="text-gray-600">Set grace period for late arrivals</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Grace Period (minutes)</label>
              <input
                type="number"
                value={setupData.latenessPolicy.graceMinutes}
                onChange={(e) => setSetupData(prev => ({
                  ...prev,
                  latenessPolicy: { ...prev.latenessPolicy, graceMinutes: parseInt(e.target.value) }
                }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                placeholder="15"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="lateness-enabled"
                checked={setupData.latenessPolicy.enabled}
                onChange={(e) => setSetupData(prev => ({
                  ...prev,
                  latenessPolicy: { ...prev.latenessPolicy, enabled: e.target.checked }
                }))}
                className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="lateness-enabled" className="text-sm font-medium text-gray-900">
                Enable lateness policy
              </label>
            </div>
          </div>
        )

      case 'automate-alerts':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Automate Alerts</h3>
              <p className="text-gray-600">Configure notification preferences</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <h4 className="font-medium text-gray-900">Late Clock-in Alerts</h4>
                  <p className="text-sm text-gray-600">Notify when employees are late</p>
                </div>
                <input
                  type="checkbox"
                  checked={setupData.automateAlerts.lateClockIn}
                  onChange={(e) => setSetupData(prev => ({
                    ...prev,
                    automateAlerts: { ...prev.automateAlerts, lateClockIn: e.target.checked }
                  }))}
                  className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <h4 className="font-medium text-gray-900">Missed Clock-out Alerts</h4>
                  <p className="text-sm text-gray-600">Notify when employees forget to clock out</p>
                </div>
                <input
                  type="checkbox"
                  checked={setupData.automateAlerts.missedClockOut}
                  onChange={(e) => setSetupData(prev => ({
                    ...prev,
                    automateAlerts: { ...prev.automateAlerts, missedClockOut: e.target.checked }
                  }))}
                  className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <h4 className="font-medium text-gray-900">Near Office Alerts</h4>
                  <p className="text-sm text-gray-600">Remind employees to clock in when near office</p>
                </div>
                <input
                  type="checkbox"
                  checked={setupData.automateAlerts.nearOffice}
                  onChange={(e) => setSetupData(prev => ({
                    ...prev,
                    automateAlerts: { ...prev.automateAlerts, nearOffice: e.target.checked }
                  }))}
                  className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )

      case 'biometric-clockin':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Fingerprint className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Face ID & Finger Print</h3>
              <p className="text-gray-600">Require employees to verify their identity using fingerprint, facial recognition, or other biometric methods</p>
            </div>

            <div className="flex items-center justify-center">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={setupData.biometricClockIn.enabled}
                  onChange={(e) => setSetupData(prev => ({
                    ...prev,
                    biometricClockIn: { ...prev.biometricClockIn, enabled: e.target.checked }
                  }))}
                  className="sr-only peer"
                />
                <div className="relative w-16 h-9 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-7 peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-primary"></div>
                <span className="ml-3 text-lg font-medium text-gray-900">
                  {setupData.biometricClockIn.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>

            {setupData.biometricClockIn.enabled && (
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-primary mb-2">Biometric Authentication Enabled</h4>
                    <p className="text-primary/80 text-sm mb-3">
                      Employees will be prompted to use their device's biometric sensors when clocking in.
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
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Attendance Setup</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Progress Sidebar */}
          <div className="lg:w-80">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Setup Progress</h2>
              <div className="space-y-4">
                {steps.map((step, index) => {
                  const Icon = step.icon
                  const isActive = index === currentStep
                  const isCompleted = index < currentStep
                  
                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        isActive ? 'bg-orange-50 border border-orange-200' :
                        isCompleted ? 'bg-primary/10' : 'bg-gray-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isCompleted ? 'bg-primary' :
                        isActive ? 'bg-orange-600' : 'bg-gray-400'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-4 h-4 text-white" />
                        ) : (
                          <Icon className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${
                          isActive ? 'text-orange-600' :
                          isCompleted ? 'text-primary' : 'text-gray-600'
                        }`}>
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
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              {renderStepContent()}

              {/* Navigation Buttons */}
              <div className="mt-8 pt-6 border-t border-gray-200 flex gap-3">
                {currentStep > 0 && (
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                )}
                
                <button
                  onClick={handleNext}
                  disabled={loading}
                  className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white py-3 px-6 rounded-xl font-medium flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      {currentStep === steps.length - 1 ? 'Finish' : 'Continue'}
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