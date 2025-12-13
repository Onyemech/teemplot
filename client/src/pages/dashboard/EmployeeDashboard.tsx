import { useState, useEffect } from 'react'
import { 
  Clock, 
  MapPin, 
  Calendar, 
  User, 
  Bell, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Award,
  TrendingUp,
  Target,
  BarChart3,
  Timer,
  Home,
  Inbox
} from 'lucide-react'
import { useUser } from '@/contexts/UserContext'
import { apiClient } from '@/lib/api'
import { useToast } from '@/contexts/ToastContext'
import { format } from 'date-fns'
import LocationClockIn from '@/components/attendance/LocationClockIn'
import MultipleClockingTabs from '@/components/attendance/MultipleClockingTabs'

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

interface LeaveBalance {
  annual: number
  sick: number
  personal: number
  used: number
  total: number
}

interface TaskData {
  assigned: number
  completed: number
  pending: number
  overdue: number
}

interface PerformanceData {
  attendanceRate: number
  punctualityScore: number
  taskCompletionRate: number
  rating: 'Excellent' | 'Good' | 'Average' | 'Needs Improvement'
}

interface RecentActivity {
  id: string
  type: 'clock_in' | 'clock_out' | 'leave_request' | 'task_assigned' | 'task_completed'
  message: string
  timestamp: string
}

type TabType = 'overview' | 'attendance' | 'leaves' | 'tasks' | 'performance'

export default function EmployeeDashboard() {
  const { user } = useUser()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [location, setLocation] = useState<GeolocationPosition | null>(null)
  const [clockingIn, setClockingIn] = useState(false)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [multipleClockingEnabled, setMultipleClockingEnabled] = useState(false)
  
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance>({
    annual: 15,
    sick: 5,
    personal: 3,
    used: 7,
    total: 23
  })
  const [taskData, setTaskData] = useState<TaskData>({
    assigned: 12,
    completed: 8,
    pending: 3,
    overdue: 1
  })
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    attendanceRate: 95,
    punctualityScore: 88,
    taskCompletionRate: 92,
    rating: 'Excellent'
  })
  const [recentActivity] = useState<RecentActivity[]>([
    {
      id: '1',
      type: 'clock_in',
      message: 'Clocked in at Head Office',
      timestamp: '2 hours ago'
    },
    {
      id: '2',
      type: 'task_completed',
      message: 'Completed task: Update user interface',
      timestamp: '1 day ago'
    },
    {
      id: '3',
      type: 'leave_request',
      message: 'Leave request approved for Dec 25-26',
      timestamp: '2 days ago'
    }
  ])

  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchEmployeeData()
    getCurrentLocation()
    checkMultipleClockingStatus()
  }, [])

  const fetchEmployeeData = async () => {
    try {
      // Fetch all employee-specific data
      const [attendanceResponse, leaveData, tasks, performance] = await Promise.all([
        apiClient.get('/api/attendance/current'),
        apiClient.get('/api/leaves/my-balance'),
        apiClient.get('/api/tasks/my-tasks'),
        apiClient.get('/api/performance/my-stats')
      ])

      if (attendanceResponse.data.success) {
        setAttendanceStatus(attendanceResponse.data.data)
      }
      if (leaveData.data.success) {
        setLeaveBalance(leaveData.data.data)
      }
      if (tasks.data.success) {
        setTaskData(tasks.data.data)
      }
      if (performance.data.success) {
        setPerformanceData(performance.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch employee data:', error)
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
    fetchEmployeeData() // Refresh all data
    toast.success('Clocked in successfully!')
  }

  const handleClockOut = async () => {
    if (!attendanceStatus) return

    setClockingIn(true)
    try {
      const response = await apiClient.post('/api/attendance/check-out', {
        attendanceId: attendanceStatus.clockInTime,
        location: location ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        } : undefined
      })

      if (response.data.success) {
        setAttendanceStatus(response.data.data)
        toast.success('Clocked out successfully!')
      }
    } catch (error: any) {
      console.error('Clock out failed:', error)
      toast.error(error.response?.data?.message || 'Failed to clock out')
    } finally {
      setClockingIn(false)
    }
  }

  const checkMultipleClockingStatus = async () => {
    try {
      const response = await apiClient.get('/api/employees/me/multiple-clocking-status')
      if (response.data.success) {
        setMultipleClockingEnabled(response.data.data.enabled || false)
      }
    } catch (error) {
      console.error('Failed to check multiple clocking status:', error)
      // Default to false if API fails
      setMultipleClockingEnabled(false)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'clock_in':
      case 'clock_out':
        return <Clock className="w-4 h-4 text-primary" />
      case 'leave_request':
        return <Calendar className="w-4 h-4 text-orange-500" />
      case 'task_assigned':
        return <Target className="w-4 h-4 text-blue-500" />
      case 'task_completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const formatTime = (date: Date) => {
    return format(date, 'HH:mm')
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'leaves', label: 'Leaves', icon: Calendar },
    { id: 'tasks', label: 'Tasks', icon: Target },
    { id: 'performance', label: 'Performance', icon: Award }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Clock In/Out Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Time Tracking</h2>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>Head Office</span>
                </div>
              </div>

              <div className="text-center mb-6">
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
                className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 shadow-md hover:shadow-lg ${
                  attendanceStatus?.isClockedIn
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-primary hover:bg-primary/90 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {clockingIn ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processing...
                  </div>
                ) : attendanceStatus?.isClockedIn ? (
                  'Clock Out'
                ) : (
                  'Clock In'
                )}
              </button>
            </div>

            {/* Location Status */}
            {location && attendanceStatus && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all duration-200">
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

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{leaveBalance.total - leaveBalance.used}</div>
                    <div className="text-sm text-gray-600">Leave Days Left</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{taskData.completed}</div>
                    <div className="text-sm text-gray-600">Tasks Completed</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{performanceData.attendanceRate}%</div>
                    <div className="text-sm text-gray-600">Attendance Rate</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Award className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">{performanceData.rating}</div>
                    <div className="text-sm text-gray-600">Performance</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                    <div className="flex-shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'attendance':
        return (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Attendance History</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-600">22</div>
                  <div className="text-sm text-green-600">Present Days</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-xl">
                  <div className="text-2xl font-bold text-red-600">1</div>
                  <div className="text-sm text-red-600">Absent Days</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-xl">
                  <div className="text-2xl font-bold text-orange-600">2</div>
                  <div className="text-sm text-orange-600">Late Arrivals</div>
                </div>
              </div>
              
              {/* Multiple Clocking Section */}
              <div className="mb-6">
                <MultipleClockingTabs 
                  employeeId={user?.id}
                  isEnabled={multipleClockingEnabled}
                />
              </div>
              
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Additional attendance records will be displayed here</p>
              </div>
            </div>
          </div>
        )

      case 'leaves':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Leave Balance</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600">{leaveBalance.annual}</div>
                  <div className="text-sm text-blue-600">Annual Leave</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-600">{leaveBalance.sick}</div>
                  <div className="text-sm text-green-600">Sick Leave</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-xl">
                  <div className="text-2xl font-bold text-orange-600">{leaveBalance.personal}</div>
                  <div className="text-sm text-orange-600">Personal Leave</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Leave Requests</h2>
                <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200">
                  Request Leave
                </button>
              </div>
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No leave requests found</p>
              </div>
            </div>
          </div>
        )

      case 'tasks':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all duration-200">
                <div className="text-2xl font-bold text-gray-900">{taskData.assigned}</div>
                <div className="text-sm text-gray-600">Total Assigned</div>
              </div>
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all duration-200">
                <div className="text-2xl font-bold text-green-600">{taskData.completed}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all duration-200">
                <div className="text-2xl font-bold text-orange-600">{taskData.pending}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all duration-200">
                <div className="text-2xl font-bold text-red-600">{taskData.overdue}</div>
                <div className="text-sm text-gray-600">Overdue</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">My Tasks</h2>
              <div className="text-center py-8 text-gray-500">
                <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Task list will be displayed here</p>
              </div>
            </div>
          </div>
        )

      case 'performance':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Attendance Rate</h3>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div className="text-3xl font-bold text-green-600 mb-2">{performanceData.attendanceRate}%</div>
                <div className="text-sm text-gray-600">This month</div>
              </div>

              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Punctuality</h3>
                  <Clock className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-3xl font-bold text-blue-600 mb-2">{performanceData.punctualityScore}%</div>
                <div className="text-sm text-gray-600">On-time arrivals</div>
              </div>

              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Task Completion</h3>
                  <Target className="w-5 h-5 text-purple-500" />
                </div>
                <div className="text-3xl font-bold text-purple-600 mb-2">{performanceData.taskCompletionRate}%</div>
                <div className="text-sm text-gray-600">Success rate</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Rating</h2>
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-10 h-10 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-600 mb-2">{performanceData.rating}</div>
                <p className="text-gray-600">Keep up the great work!</p>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{getGreeting()} 👋</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-gray-600 text-sm">
            {user?.role} • {user?.companyName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </button>
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
        </div>
      </div>

      {/* Time Tracking Status */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
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

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {renderTabContent()}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-xl transition-colors">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Request Leave</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-xl transition-colors">
                <User className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">View Profile</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-xl transition-colors">
                <Clock className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">View Timesheet</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-xl transition-colors">
                <FileText className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Download Reports</span>
              </button>
            </div>
          </div>

          {/* Today's Schedule */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Schedule</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Work Hours</span>
                <span className="font-medium">9:00 AM - 5:00 PM</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Break Time</span>
                <span className="font-medium">12:00 PM - 1:00 PM</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Location</span>
                <span className="font-medium">Head Office</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Department</span>
                <span className="font-medium">{user?.role || 'Employee'}</span>
              </div>
            </div>
          </div>
        </div>
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