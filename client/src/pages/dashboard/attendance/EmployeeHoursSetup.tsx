import { useState } from 'react'
import { Clock, MapPin, Bell, Settings, CheckCircle, ArrowRight } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { useNavigate } from 'react-router-dom'
import AnimatedCheckmark from '@/components/ui/AnimatedCheckmark'

interface SetupStep {
  id: string
  title: string
  description: string
  icon: any
  status: 'completed' | 'current' | 'pending'
  color: string
}

interface EmployeeHours {
  resumptionTime: string
  closingTime: string
  breakTime: string
  workingDays: string[]
  timezone: string
}

export default function EmployeeHoursSetup() {
  const navigate = useNavigate()

  const [employeeHours, setEmployeeHours] = useState<EmployeeHours>({
    resumptionTime: '08:00',
    closingTime: '17:00',
    breakTime: '12:00',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    timezone: 'Africa/Lagos'
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
      status: 'current',
      color: 'text-orange-600'
    },
    {
      id: 'lateness-policy',
      title: 'Lateness policy',
      description: 'Set grace periods and late arrival rules',
      icon: Settings,
      status: 'pending',
      color: 'text-gray-400'
    },
    {
      id: 'automate-alerts',
      title: 'Automate alerts',
      description: 'Configure notification preferences',
      icon: Bell,
      status: 'pending',
      color: 'text-gray-400'
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

  const workingDaysOptions = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ]

  const handleWorkingDayToggle = (day: string) => {
    setEmployeeHours(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day]
    }))
  }

  const handleContinue = async () => {
    setLoading(true)
    try {
      const response = await apiClient.patch('/api/company-settings/work-schedule', {
        workStartTime: employeeHours.resumptionTime,
        workEndTime: employeeHours.closingTime,
        workingDays: employeeHours.workingDays.reduce((acc, day) => {
          acc[day.toLowerCase()] = true
          return acc
        }, {} as Record<string, boolean>),
        timezone: employeeHours.timezone
      })

      if (response.data.success) {
        // Move to next step
        navigate('/dashboard/attendance/setup/lateness-policy')
      }
    } catch (error: any) {
      console.error('Failed to save employee hours:', error)
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
          <h1 className="text-2xl font-bold text-gray-900">Set employee hours</h1>
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
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Configure Work Schedule</h2>
                <p className="text-gray-600">Set your company's working hours and break times</p>
              </div>

              <div className="space-y-6">
                {/* Resumption Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resumption Time
                  </label>
                  <input
                    type="time"
                    value={employeeHours.resumptionTime}
                    onChange={(e) => setEmployeeHours(prev => ({ ...prev, resumptionTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Closing Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    value={employeeHours.closingTime}
                    onChange={(e) => setEmployeeHours(prev => ({ ...prev, closingTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Break Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Break Time
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="time"
                      value={employeeHours.breakTime}
                      onChange={(e) => setEmployeeHours(prev => ({ ...prev, breakTime: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                      <option value="30">30 mins</option>
                      <option value="60">1 hour</option>
                      <option value="90">1.5 hours</option>
                    </select>
                  </div>
                </div>

                {/* Working Days */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Working Days
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {workingDaysOptions.map((day) => (
                      <label
                        key={day}
                        className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          employeeHours.workingDays.includes(day)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={employeeHours.workingDays.includes(day)}
                          onChange={() => handleWorkingDayToggle(day)}
                          className="sr-only"
                        />
                        <span className="text-sm font-medium">{day.slice(0, 3)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Timezone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <select
                    value={employeeHours.timezone}
                    onChange={(e) => setEmployeeHours(prev => ({ ...prev, timezone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="Africa/Lagos">West Africa Time (WAT)</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">Greenwich Mean Time (GMT)</option>
                    <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
                  </select>
                </div>
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