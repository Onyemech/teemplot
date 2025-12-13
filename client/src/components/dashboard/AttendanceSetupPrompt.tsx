import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, MapPin, Bell, Fingerprint, ArrowRight, CheckCircle } from 'lucide-react'
import { useUser } from '@/contexts/UserContext'

interface AttendanceSetupPromptProps {
  onDismiss?: () => void
}

export default function AttendanceSetupPrompt({ onDismiss }: AttendanceSetupPromptProps) {
  const navigate = useNavigate()
  const { user } = useUser()
  const [dismissed, setDismissed] = useState(false)

  const handleSetupAttendance = () => {
    navigate('/dashboard/attendance/setup')
  }

  const handleSkipForNow = () => {
    setDismissed(true)
    onDismiss?.()
  }

  if (dismissed) return null

  const setupSteps = [
    {
      icon: MapPin,
      title: 'Company Location',
      description: 'Set your office location for geofencing'
    },
    {
      icon: Clock,
      title: 'Employee Hours',
      description: 'Configure work schedule and break times'
    },
    {
      icon: Bell,
      title: 'Automate Alerts',
      description: 'Set up notifications for attendance'
    },
    {
      icon: Fingerprint,
      title: 'Biometric Setup',
      description: 'Enable secure biometric clock-in'
    }
  ]

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to {user?.companyName || 'Teemplot'}!
        </h2>
        <p className="text-gray-600 mb-6">
          Let's set up your attendance system to start tracking employee time and productivity.
        </p>
      </div>

      {/* Setup Steps Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {setupSteps.map((step, index) => {
          const Icon = step.icon
          return (
            <div key={index} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 text-sm">{step.title}</h3>
                <p className="text-xs text-gray-600 truncate">{step.description}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Benefits */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
        <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          What you'll get:
        </h3>
        <ul className="text-sm text-primary/80 space-y-2">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
            Accurate location-based attendance tracking
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
            Automated notifications and alerts
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
            Secure biometric authentication
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
            Real-time attendance monitoring
          </li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleSetupAttendance}
          className="flex-1 bg-primary hover:bg-primary/90 text-white font-medium py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
        >
          Setup Attendance
          <ArrowRight className="w-5 h-5" />
        </button>
        
        <button
          onClick={handleSkipForNow}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
        >
          Skip for Now
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center mt-4">
        Takes about 5 minutes to complete • You can change these settings later
      </p>
    </div>
  )
}