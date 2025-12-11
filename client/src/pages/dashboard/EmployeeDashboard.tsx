import { useState, useEffect } from 'react'
import { Clock, MapPin, Timer, Calendar, FileText, User, Home, Inbox, Settings, ChevronDown } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { useUser } from '@/contexts/UserContext'

import { format } from 'date-fns'
import LocationClockIn from '@/components/attendance/LocationClockIn'

interface AttendanceStatus {
  isClockedIn: boolean
  clockInTime: string | null
  totalHoursToday: number
  isWithinGeofence: boolean
  distanceFromOffice: number
  currentLocation?: {
    latitude: number
    longitude: number
    address?: string
  }
}

interface QuickAction {
  id: string
  title: string
  description: string
  icon: any
  color: string
  bgColor: string
  action: () => void
}

export default function EmployeeDashboard() {
  const { user } = useUser()
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [location, setLocation] = useState<GeolocationPosition | null>(null)
  const [clockingIn, setClockingIn] = useState(false)
  const [showLocationModal, setShowLocationModal] = useState(false)

  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchAttendanceStatus()
    getCurrentLocation()
  }, [])

  const fetchAttendanceStatus = async () => {
    try {
      const response = await apiClient.get('/api/attendance/current')
      if (response.data.success) {
        setAttendanceStatus(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch attendance status:', error)
    }
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(position)
        },
        (error) => {
          console.error('Error getting location:', error)
        }
      )
    }
  }

  const handleClockIn = () => {
    setShowLocationModal(true)
  }

  const handleLocationClockInSuccess = (data: any) => {
    setAttendanceStatus(data)
    fetchAttendanceStatus() // Refresh status
  }

  const handleClockOut = async () => {
    if (!attendanceStatus) return

    setClockingIn(true)
    try {
      const response = await apiClient.post('/api/attendance/check-out', {
        attendanceId: attendanceStatus.clockInTime, // This should be the attendance record ID
        location: location ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        } : undefined
      })

      if (response.data.success) {
        setAttendanceStatus(response.data.data)
      }
    } catch (error: any) {
      console.error('Clock out failed:', error)
      alert(error.response?.data?.message || 'Failed to clock out')
    } finally {
      setClockingIn(false)
    }
  }

  const quickActions: QuickAction[] = [
    {
      id: 'attendance',
      title: 'Attendance',
      description: 'Effortless tracking of your time on the job',
      icon: Clock,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      action: () => {
        if (attendanceStatus?.isClockedIn) {
          handleClockOut()
        } else {
          handleClockIn()
        }
      }
    },
    {
      id: 'requests',
      title: 'Send Requests',
      description: 'Need approval? Send your request instantly',
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      action: () => {
        // TODO: Navigate to requests page
        alert('Requests feature coming soon!')
      }
    },
    {
      id: 'leave',
      title: 'Leave',
      description: 'Balance your work and rest—',
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      action: () => {
        // TODO: Navigate to leave page
        alert('Leave management coming soon!')
      }
    }
  ]

  const formatTime = (date: Date) => {
    return format(date, 'HH:mm')
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{getGreeting()} 👋</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">
              {user?.firstName} {user?.lastName}
            </h1>
          </div>
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Time Tracking Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-600">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">In Time</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Timer className="w-4 h-4" />
            <span className="text-sm">Break Time</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Out Time</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-4">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <div
                  key={action.id}
                  onClick={action.action}
                  className={`${action.bgColor} rounded-xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02]`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </div>
                    <div className={`w-12 h-12 ${action.bgColor} rounded-lg flex items-center justify-center ml-4`}>
                      <Icon className={`w-6 h-6 ${action.color}`} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Clock In/Out Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-1 mb-2">
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              CURRENT TIME
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {formatTime(currentTime)}
            </div>
            <div className="text-xs text-red-500">
              {attendanceStatus?.isClockedIn ? (
                `Working since ${attendanceStatus.clockInTime ? format(new Date(attendanceStatus.clockInTime), 'HH:mm') : ''}`
              ) : (
                '00Hrs : 00Mins : 00Secs - Grace period ended'
              )}
            </div>
          </div>

          <button
            onClick={attendanceStatus?.isClockedIn ? handleClockOut : handleClockIn}
            disabled={clockingIn}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-4 rounded-xl font-semibold text-lg transition-colors"
          >
            {clockingIn ? 'Processing...' : attendanceStatus?.isClockedIn ? 'Clock Out' : 'Clock In'}
          </button>
        </div>

        {/* Location Status */}
        {location && attendanceStatus && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">
                  {attendanceStatus.isWithinGeofence ? 'Within office area' : 'Outside office area'}
                </div>
                <div className="text-sm text-gray-500">
                  {attendanceStatus.distanceFromOffice}m from office
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 lg:hidden">
        <div className="flex items-center justify-around">
          <div className="flex flex-col items-center py-2">
            <Home className="w-6 h-6 text-green-600" />
            <span className="text-xs text-green-600 mt-1">Home</span>
          </div>
          <div className="flex flex-col items-center py-2">
            <Inbox className="w-6 h-6 text-gray-400" />
            <span className="text-xs text-gray-400 mt-1">Inbox</span>
          </div>
          <div className="flex flex-col items-center py-2">
            <Settings className="w-6 h-6 text-gray-400" />
            <span className="text-xs text-gray-400 mt-1">Settings</span>
          </div>
        </div>
      </div>

      {/* Bottom padding for mobile navigation */}
      <div className="h-20 lg:hidden"></div>

      {/* Location Clock In Modal */}
      <LocationClockIn
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSuccess={handleLocationClockInSuccess}
      />
    </div>
  )
}