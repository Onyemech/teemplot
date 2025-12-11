import { useState } from 'react'
import { Bell, Search, Filter, CheckCircle, Clock, Calendar, FileText, AlertTriangle, X, ChevronDown } from 'lucide-react'
import { useNotifications } from '@/contexts/NotificationContext'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'

interface FilterState {
  status: 'all' | 'unread' | 'read'
  type: 'all' | 'attendance' | 'leave' | 'task' | 'system'
  timeRange: 'all' | 'today' | 'yesterday' | 'week' | 'month'
}

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead, removeNotification } = useNotifications()
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    type: 'all',
    timeRange: 'all'
  })

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'attendance':
        return <Clock className="w-5 h-5 text-blue-600" />
      case 'leave':
        return <Calendar className="w-5 h-5 text-green-600" />
      case 'task':
        return <FileText className="w-5 h-5 text-purple-600" />
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'warning':
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />
      default:
        return <Bell className="w-5 h-5 text-gray-600" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'attendance':
        return 'bg-blue-50 border-l-blue-500'
      case 'leave':
        return 'bg-green-50 border-l-green-500'
      case 'task':
        return 'bg-purple-50 border-l-purple-500'
      case 'success':
        return 'bg-green-50 border-l-green-500'
      case 'warning':
        return 'bg-orange-50 border-l-orange-500'
      case 'error':
        return 'bg-red-50 border-l-red-500'
      default:
        return 'bg-gray-50 border-l-gray-500'
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    // Search filter
    if (searchTerm && !notification.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !notification.message.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }

    // Status filter
    if (filters.status === 'read' && !notification.isRead) return false
    if (filters.status === 'unread' && notification.isRead) return false

    // Type filter
    if (filters.type !== 'all' && notification.type !== filters.type) return false

    // Time range filter
    const notificationDate = new Date(notification.createdAt)
    const now = new Date()
    
    switch (filters.timeRange) {
      case 'today':
        if (!isToday(notificationDate)) return false
        break
      case 'yesterday':
        if (!isYesterday(notificationDate)) return false
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        if (notificationDate < weekAgo) return false
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        if (notificationDate < monthAgo) return false
        break
    }

    return true
  })

  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = new Date(notification.createdAt)
    let groupKey: string

    if (isToday(date)) {
      groupKey = 'Today'
    } else if (isYesterday(date)) {
      groupKey = 'Yesterday'
    } else {
      groupKey = format(date, 'MMMM dd, yyyy')
    }

    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(notification)
    return groups
  }, {} as Record<string, typeof notifications>)

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      markAsRead(notification.id)
    }
    
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl
    }
  }

  const resetFilters = () => {
    setFilters({
      status: 'all',
      type: 'all',
      timeRange: 'all'
    })
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <div className="h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Notifications</h1>
              <p className="text-gray-600 mt-1">Receive all your notifications here</p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-100 shadow-md hover:shadow-lg transition-all duration-200 font-medium text-gray-900"
            >
              <Filter className="w-5 h-5" />
              <span>Filter</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter</h3>
              
              <div className="space-y-6">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Status
                    </div>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'all', label: 'All' },
                      { value: 'unread', label: 'Unread' },
                      { value: 'read', label: 'Read' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFilters(prev => ({ ...prev, status: option.value as any }))}
                        className={`px-4 py-2 rounded-xl border-2 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md ${
                          filters.status === option.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Type
                    </div>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { value: 'all', label: 'All' },
                      { value: 'attendance', label: 'Attendance' },
                      { value: 'leave', label: 'Leave' },
                      { value: 'task', label: 'Task' },
                      { value: 'system', label: 'System' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFilters(prev => ({ ...prev, type: option.value as any }))}
                        className={`px-4 py-2 rounded-xl border-2 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md ${
                          filters.type === option.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Time Range
                    </div>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { value: 'all', label: 'All Time' },
                      { value: 'today', label: 'Today' },
                      { value: 'yesterday', label: 'Yesterday' },
                      { value: 'week', label: 'This Week' },
                      { value: 'month', label: 'This Month' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFilters(prev => ({ ...prev, timeRange: option.value as any }))}
                        className={`px-4 py-2 rounded-xl border-2 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md ${
                          filters.timeRange === option.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={resetFilters}
                  className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  Reset filter
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowFilters(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-900 rounded-xl hover:bg-gray-100 shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
        {Object.keys(groupedNotifications).length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications found</h3>
            <p className="text-gray-500">
              {searchTerm || filters.status !== 'all' || filters.type !== 'all' || filters.timeRange !== 'all'
                ? 'Try adjusting your search or filters'
                : 'You\'ll see notifications here when they arrive'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedNotifications).map(([dateGroup, groupNotifications]) => (
              <div key={dateGroup}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{dateGroup}</h2>
                <div className="space-y-3">
                  {groupNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`bg-white rounded-xl border-l-4 border border-gray-100 p-6 cursor-pointer shadow-lg hover:shadow-xl transition-all duration-200 ${
                        getNotificationColor(notification.type)
                      } ${!notification.isRead ? 'shadow-xl' : ''}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className={`text-sm font-semibold text-gray-900 mb-1 ${
                                !notification.isRead ? 'font-bold' : ''
                              }`}>
                                {notification.title}
                              </h3>
                              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
                                {notification.actionUrl && (
                                  <span className="text-green-600 font-medium">• View Details</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeNotification(notification.id)
                                }}
                                className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded-lg"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}