import { useState, useEffect } from 'react'
import { 
  Users, 
  Calendar, 
  CheckCircle, 
  FileText,
  Bell,
  Home,
  Inbox,
  Settings,
  DollarSign
} from 'lucide-react'
import { useUser } from '@/contexts/UserContext'
import { useFeatureAccess } from '@/hooks/useFeatureAccess'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'

interface DashboardStats {
  totalEmployees: number
  pendingLeaveRequests: number
  pendingTasks: number
  attendanceToday: {
    present: number
    late: number
    absent: number
  }
}

interface LeaveRequest {
  id: string
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  days: number
}

interface TaskAssignment {
  id: string
  employeeName: string
  title: string
  description: string
  dueDate: string
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'completed'
}

interface NotificationCount {
  total: number
  unread: number
}

export default function ManagerDashboard() {
  const { user } = useUser()
  const { hasAccess } = useFeatureAccess()
  const toast = useToast()
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    pendingLeaveRequests: 0,
    pendingTasks: 0,
    attendanceToday: { present: 0, late: 0, absent: 0 }
  })
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [tasks, setTasks] = useState<TaskAssignment[]>([])
  const [notifications, setNotifications] = useState<NotificationCount>({ total: 0, unread: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'leave' | 'tasks'>('overview')

  useEffect(() => {
    fetchDashboardData()
    fetchNotificationCount()
    
    // Set up real-time notification updates
    const interval = setInterval(fetchNotificationCount, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [statsRes, leaveRes, tasksRes] = await Promise.all([
        apiClient.get('/api/managers/dashboard-stats'),
        apiClient.get('/api/managers/leave-requests'),
        hasAccess('tasks') ? apiClient.get('/api/managers/task-assignments') : Promise.resolve({ data: { success: true, data: [] } })
      ])

      if (statsRes.data.success) {
        setStats(statsRes.data.data)
      }

      if (leaveRes.data.success) {
        setLeaveRequests(leaveRes.data.data)
      }

      if (tasksRes.data.success) {
        setTasks(tasksRes.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchNotificationCount = async () => {
    try {
      const response = await apiClient.get('/api/notifications/count')
      if (response.data.success) {
        setNotifications(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch notification count:', error)
    }
  }

  const handleLeaveAction = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const response = await apiClient.patch(`/api/managers/leave-requests/${requestId}`, {
        status: action === 'approve' ? 'approved' : 'rejected'
      })

      if (response.data.success) {
        setLeaveRequests(prev => 
          prev.map(req => 
            req.id === requestId 
              ? { ...req, status: action === 'approve' ? 'approved' : 'rejected' }
              : req
          )
        )
        toast.success(`Leave request ${action}d successfully`)
        fetchDashboardData() // Refresh stats
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${action} leave request`)
    }
  }

  const handleTaskAction = async (taskId: string, action: 'assign' | 'complete') => {
    try {
      const response = await apiClient.patch(`/api/managers/tasks/${taskId}`, {
        status: action === 'assign' ? 'in_progress' : 'completed'
      })

      if (response.data.success) {
        setTasks(prev => 
          prev.map(task => 
            task.id === taskId 
              ? { ...task, status: action === 'assign' ? 'in_progress' : 'completed' }
              : task
          )
        )
        toast.success(`Task ${action}ed successfully`)
        fetchDashboardData() // Refresh stats
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${action} task`)
    }
  }

  const getBottomNavItems = () => {
    const baseItems = [
      { id: 'home', label: 'Home', icon: Home, active: true },
      { 
        id: 'inbox', 
        label: 'Inbox', 
        icon: Inbox, 
        badge: notifications.unread > 0 ? notifications.unread : undefined 
      },
      { id: 'settings', label: 'Settings', icon: Settings }
    ]

    // Add Tasks for Gold plan, Leave for Silver and Gold
    if (hasAccess('tasks')) {
      // Gold plan - has both Leave and Tasks
      return [
        baseItems[0],
        { id: 'leave', label: 'Leave', icon: Calendar },
        { id: 'tasks', label: 'Tasks', icon: DollarSign },
        baseItems[1],
        baseItems[2]
      ]
    } else if (hasAccess('leave')) {
      // Silver plan - has Leave only
      return [
        baseItems[0],
        { id: 'leave', label: 'Leave', icon: Calendar },
        baseItems[1],
        baseItems[2]
      ]
    } else {
      // Trial plan - basic features only
      return baseItems
    }
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</div>
              <div className="text-sm text-gray-600">Team Members</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.pendingLeaveRequests}</div>
              <div className="text-sm text-gray-600">Leave Requests</div>
            </div>
          </div>
        </div>

        {hasAccess('tasks') && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.pendingTasks}</div>
                <div className="text-sm text-gray-600">Pending Tasks</div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.attendanceToday.present}</div>
              <div className="text-sm text-gray-600">Present Today</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {leaveRequests.slice(0, 3).map((request) => (
            <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-orange-600" />
                <div>
                  <div className="font-medium text-gray-900">{request.employeeName}</div>
                  <div className="text-sm text-gray-600">Leave request - {request.days} days</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleLeaveAction(request.id, 'approve')}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleLeaveAction(request.id, 'reject')}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderLeaveManagement = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Leave Requests</h2>
        <div className="space-y-4">
          {leaveRequests.map((request) => (
            <div key={request.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-gray-900">{request.employeeName}</h3>
                  <p className="text-sm text-gray-600">{request.leaveType}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  request.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                  request.status === 'approved' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>
              </div>
              
              <div className="text-sm text-gray-600 mb-3">
                <p><strong>Duration:</strong> {request.startDate} to {request.endDate} ({request.days} days)</p>
                <p><strong>Reason:</strong> {request.reason}</p>
              </div>

              {request.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleLeaveAction(request.id, 'approve')}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleLeaveAction(request.id, 'reject')}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderTaskManagement = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Task Management</h2>
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-gray-900">{task.title}</h3>
                  <p className="text-sm text-gray-600">Assigned to: {task.employeeName}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  task.priority === 'high' ? 'bg-red-100 text-red-800' :
                  task.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                </span>
              </div>
              
              <div className="text-sm text-gray-600 mb-3">
                <p><strong>Description:</strong> {task.description}</p>
                <p><strong>Due Date:</strong> {task.dueDate}</p>
              </div>

              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  task.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                  task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {task.status.replace('_', ' ').charAt(0).toUpperCase() + task.status.replace('_', ' ').slice(1)}
                </span>

                {task.status === 'pending' && (
                  <button
                    onClick={() => handleTaskAction(task.id, 'assign')}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    Assign Task
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Manager Dashboard
            </h1>
            <p className="text-gray-600 text-sm">
              {user?.firstName} {user?.lastName} • {user?.companyName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
              <Bell className="w-5 h-5 text-gray-600" />
              {notifications.unread > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notifications.unread > 9 ? '9+' : notifications.unread}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 px-4">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('leave')}
            className={`py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'leave'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Leave Management
          </button>
          {hasAccess('tasks') && (
            <button
              onClick={() => setActiveTab('tasks')}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'tasks'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Task Management
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'leave' && renderLeaveManagement()}
        {activeTab === 'tasks' && hasAccess('tasks') && renderTaskManagement()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-around">
          {getBottomNavItems().map((item) => (
            <div key={item.id} className="flex flex-col items-center py-2 relative">
              <item.icon className={`w-6 h-6 ${item.active ? 'text-primary' : 'text-gray-400'}`} />
              <span className={`text-xs mt-1 ${item.active ? 'text-primary' : 'text-gray-400'}`}>
                {item.label}
              </span>
              {item.badge && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}