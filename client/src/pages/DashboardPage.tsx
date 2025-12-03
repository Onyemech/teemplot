import { useState } from 'react'
import { 
  Users, 
  Clock,
  Calendar,
  CheckCircle,
  UserCheck,
  UserX,
  ClipboardList,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'

interface DashboardStats {
  totalEmployees: number
  presentToday: number
  absentToday: number
  lateToday: number
  onLeaveToday: number
  pendingLeaveRequests: number
  pendingTasks: number
  completedTasksThisWeek: number
}

interface RecentActivity {
  id: string
  type: 'attendance' | 'leave' | 'task'
  employeeName: string
  employeeAvatar?: string
  action: string
  timestamp: string
  status?: string
}

interface LeaveRequest {
  id: string
  employeeName: string
  employeeAvatar?: string
  leaveType: string
  startDate: string
  endDate: string
  status: 'pending' | 'approved' | 'rejected'
  reason: string
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats] = useState<DashboardStats>({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    onLeaveToday: 0,
    pendingLeaveRequests: 0,
    pendingTasks: 0,
    completedTasksThisWeek: 0
  })
  const [recentActivity] = useState<RecentActivity[]>([])
  const [pendingLeaves] = useState<LeaveRequest[]>([])
  const [loading] = useState(false)

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy')
  }

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'hh:mm a')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const statCards = [
    {
      label: 'Total Employees',
      value: stats?.totalEmployees || 0,
      icon: Users,
      color: 'bg-[#0F5D5D]',
      trend: null,
      onClick: () => navigate('/dashboard/employees')
    },
    {
      label: 'Present Today',
      value: stats?.presentToday || 0,
      icon: UserCheck,
      color: 'bg-green-500',
      trend: null,
      onClick: () => navigate('/dashboard/attendance')
    },
    {
      label: 'Absent Today',
      value: stats?.absentToday || 0,
      icon: UserX,
      color: 'bg-red-500',
      trend: null,
      onClick: () => navigate('/dashboard/attendance')
    },
    {
      label: 'Late Arrivals',
      value: stats?.lateToday || 0,
      icon: Clock,
      color: 'bg-orange-500',
      trend: null,
      onClick: () => navigate('/dashboard/attendance')
    },
    {
      label: 'On Leave',
      value: stats?.onLeaveToday || 0,
      icon: Calendar,
      color: 'bg-blue-500',
      trend: null,
      onClick: () => navigate('/dashboard/leave')
    },
    {
      label: 'Pending Leave Requests',
      value: stats?.pendingLeaveRequests || 0,
      icon: AlertCircle,
      color: 'bg-yellow-500',
      trend: null,
      onClick: () => navigate('/dashboard/leave')
    },
    {
      label: 'Pending Tasks',
      value: stats?.pendingTasks || 0,
      icon: ClipboardList,
      color: 'bg-purple-500',
      trend: null,
      onClick: () => navigate('/dashboard/tasks')
    },
    {
      label: 'Tasks Completed (Week)',
      value: stats?.completedTasksThisWeek || 0,
      icon: CheckCircle,
      color: 'bg-emerald-500',
      trend: '+12%',
      onClick: () => navigate('/dashboard/tasks')
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          HR Dashboard
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          {format(new Date(), 'EEEE, MMMM dd, yyyy')} • Welcome back!
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <button
              key={index}
              onClick={stat.onClick}
              className="bg-white rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 text-left group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${stat.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                {stat.trend && (
                  <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {stat.trend}
                  </span>
                )}
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                {stat.value}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">{stat.label}</p>
            </button>
          )
        })}
      </div>

      {/* Recent Activity & Pending Leave Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Recent Activity</h2>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm sm:text-base text-gray-500">No recent activity</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Employee activities will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {recentActivity.map((activity) => (
                <div 
                  key={activity.id} 
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                >
                  {activity.employeeAvatar ? (
                    <img
                      src={activity.employeeAvatar}
                      alt={activity.employeeName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#0F5D5D] flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-medium text-sm">
                        {activity.employeeName.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.employeeName}</span> {activity.action}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{formatTime(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Leave Requests */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Pending Leave Requests</h2>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          
          {pendingLeaves.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm sm:text-base text-gray-500">No pending requests</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Leave requests will appear here for approval
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {pendingLeaves.map((leave) => (
                <div 
                  key={leave.id} 
                  className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-start gap-3 mb-3">
                    {leave.employeeAvatar ? (
                      <img
                        src={leave.employeeAvatar}
                        alt={leave.employeeName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#0F5D5D] flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-medium text-sm">
                          {leave.employeeName.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm sm:text-base text-gray-900">
                        {leave.employeeName}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">
                        {leave.leaveType} • {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-3 line-clamp-2">{leave.reason}</p>
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors">
                      Approve
                    </button>
                    <button className="flex-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors">
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 sm:mt-8 bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <button 
            onClick={() => navigate('/dashboard/employees')}
            className="flex flex-col items-center justify-center p-3 sm:p-4 bg-[#0F5D5D]/10 hover:bg-[#0F5D5D]/20 rounded-lg transition-colors group"
          >
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-[#0F5D5D] mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs sm:text-sm font-medium text-[#0F5D5D]">Manage Employees</span>
          </button>
          <button 
            onClick={() => navigate('/dashboard/attendance')}
            className="flex flex-col items-center justify-center p-3 sm:p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
          >
            <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs sm:text-sm font-medium text-green-900">View Attendance</span>
          </button>
          <button 
            onClick={() => navigate('/dashboard/leave')}
            className="flex flex-col items-center justify-center p-3 sm:p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
          >
            <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs sm:text-sm font-medium text-blue-900">Leave Management</span>
          </button>
          <button 
            onClick={() => navigate('/dashboard/tasks')}
            className="flex flex-col items-center justify-center p-3 sm:p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
          >
            <ClipboardList className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs sm:text-sm font-medium text-purple-900">Task Management</span>
          </button>
        </div>
      </div>
    </div>
  )
}
