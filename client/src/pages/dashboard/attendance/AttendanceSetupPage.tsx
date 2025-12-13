import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Clock, Bell, Fingerprint, CheckCircle, ChevronRight, User } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { useToast } from '@/contexts/ToastContext'
// import { useUser } from '@/contexts/UserContext' // Commented out as not currently used

interface SetupItem {
  id: string
  title: string
  description: string
  icon: any
  completed: boolean
  onClick: () => void
}

export default function AttendanceSetupPage() {
  const navigate = useNavigate()
  const toast = useToast()
  // const { user } = useUser() // Commented out as not currently used
  const [setupItems, setSetupItems] = useState<SetupItem[]>([])
  const [allCompleted, setAllCompleted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    initializeSetupItems()
    checkSetupStatus()
  }, [])

  const initializeSetupItems = () => {
    const items: SetupItem[] = [
      {
        id: 'company-location',
        title: 'Company Location',
        description: 'Add and manage your company location',
        icon: MapPin,
        completed: false,
        onClick: () => handleItemClick('company-location')
      },
      {
        id: 'employee-hours',
        title: 'Employee Hours',
        description: 'Outline the expected working hours to guide employee attendance and ensure compliance',
        icon: Clock,
        completed: false,
        onClick: () => handleItemClick('employee-hours')
      },
      {
        id: 'lateness-policy',
        title: 'Lateness Policy',
        description: 'A buffer time allowing slight lateness before marking as late',
        icon: Clock,
        completed: false,
        onClick: () => handleItemClick('lateness-policy')
      },
      {
        id: 'automate-alerts',
        title: 'Automate Alerts & Notifications',
        description: 'Prompt employees with alerts for delayed clock-ins and when near the office',
        icon: Bell,
        completed: false,
        onClick: () => handleItemClick('automate-alerts')
      },
      {
        id: 'biometric-clockin',
        title: 'Biometrics Clock-in Option',
        description: 'Require employees to verify their identity using fingerprint, facial recognition, or other biometric methods',
        icon: Fingerprint,
        completed: false,
        onClick: () => handleItemClick('biometric-clockin')
      }
    ]
    setSetupItems(items)
  }

  const checkSetupStatus = async () => {
    try {
      const response = await apiClient.get('/api/company-settings/attendance-setup-status')
      if (response.data.success) {
        const status = response.data.data
        setSetupItems(prev => prev.map(item => ({
          ...item,
          completed: status[item.id] || false
        })))
        
        // Check if all items are completed
        const allDone = Object.values(status).every(Boolean)
        setAllCompleted(allDone)
      }
    } catch (error) {
      console.error('Failed to check setup status:', error)
    }
  }

  const handleItemClick = (itemId: string) => {
    // Navigate to specific setup page
    switch (itemId) {
      case 'company-location':
        navigate('/dashboard/attendance/setup/company-location')
        break
      case 'employee-hours':
        navigate('/dashboard/attendance/setup/employee-hours')
        break
      case 'lateness-policy':
        navigate('/dashboard/attendance/setup/lateness-policy')
        break
      case 'automate-alerts':
        navigate('/dashboard/attendance/setup/automate-alerts')
        break
      case 'biometric-clockin':
        navigate('/dashboard/attendance/setup/biometric')
        break
    }
  }

  const handleCompleteSetup = async () => {
    setLoading(true)
    try {
      await apiClient.patch('/api/company-settings/attendance-setup-completed', { completed: true })
      toast.success('Attendance setup completed successfully!')
      
      // Show success modal
      setAllCompleted(true)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to complete setup')
    } finally {
      setLoading(false)
    }
  }

  const completedCount = setupItems.filter(item => item.completed).length
  const totalCount = setupItems.length
  const isSetupComplete = completedCount === totalCount

  if (allCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Attendance Setup Completed</h3>
          <p className="text-gray-600 mb-8">
            All your attendance settings have been configured successfully. Your employees can now start using the platform.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/dashboard/employees')}
              className="flex-1 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <User className="w-5 h-5" />
              Invite Employees
            </button>
            <button
              onClick={() => navigate('/dashboard/attendance')}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Attendance Setup</h1>
          <p className="text-gray-600 mt-1">Configure your attendance system settings</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-4">
        {/* Progress Indicator */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Setup Progress</span>
            <span className="text-sm text-gray-500">{completedCount} of {totalCount} completed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Setup Items */}
        <div className="space-y-0 mb-4">
          {setupItems.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.id}
                onClick={item.onClick}
                className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      item.completed ? 'bg-primary' : 'bg-gray-100 group-hover:bg-gray-200'
                    } transition-colors`}>
                      {item.completed ? (
                        <CheckCircle className="w-6 h-6 text-white" />
                      ) : (
                        <Icon className="w-6 h-6 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.title}</h3>
                      <p className="text-gray-600 text-sm">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.completed && (
                      <span className="text-sm font-medium text-primary">Completed</span>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Complete Setup Button */}
        {isSetupComplete && (
          <div className="text-center">
            <button
              onClick={handleCompleteSetup}
              disabled={loading}
              className="bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 mx-auto"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Completing Setup...
                </>
              ) : (
                <>
                  <CheckCircle className="w-6 h-6" />
                  Complete Attendance Setup
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}