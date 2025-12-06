import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  CheckSquare,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Settings,
  FileText,
  DollarSign,
  Bell
} from 'lucide-react';
import { useUser } from '@/contexts/UserContext';

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onLeave: number;
  pendingTasks: number;
  completedTasks: number;
  pendingLeaveRequests: number;
  pendingTaskReviews: number;
  averageAttendanceRate: number;
  averageTaskCompletionRate: number;
}

interface RecentActivity {
  id: string;
  type: 'attendance' | 'task' | 'leave' | 'alert';
  message: string;
  timestamp: string;
  user: string;
}

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);

  // Get user data securely from context (uses httpOnly cookies)
  const { user: currentUser } = useUser();
  const companyName = currentUser?.companyName || 'Your Company';
  const userName = currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : 'User';
  const userRole = currentUser?.role || 'owner';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch dashboard stats
      const statsResponse = await fetch('/api/dashboard/stats', {
        credentials: 'include' // Use httpOnly cookies
      });
      const statsData = await statsResponse.json();
      
      if (statsData.success) {
        setStats(statsData.data);
        setTrialDaysLeft(statsData.data.trialDaysLeft);
      }

      // Fetch recent activity
      const activityResponse = await fetch('/api/dashboard/recent-activity', {
        credentials: 'include' // Use httpOnly cookies
      });
      const activityData = await activityResponse.json();
      
      if (activityData.success) {
        setRecentActivity(activityData.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{companyName}</h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome back, {userName}! 
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                </span>
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/notifications')}
                className="relative p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              >
                <Bell className="h-6 w-6" />
                {stats && (stats.pendingLeaveRequests + stats.pendingTaskReviews) > 0 && (
                  <span className="absolute top-0 right-0 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {stats.pendingLeaveRequests + stats.pendingTaskReviews}
                  </span>
                )}
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              >
                <Settings className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Trial Banner */}
        {trialDaysLeft !== null && trialDaysLeft > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Trial Period: {trialDaysLeft} days remaining
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Upgrade to continue using all features after your trial ends
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/subscription/upgrade')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Employees */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalEmployees || 0}</p>
                <p className="text-xs text-green-600 mt-1">
                  {stats?.activeEmployees || 0} active
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Attendance Today */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Present Today</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.presentToday || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.absentToday || 0} absent, {stats?.lateToday || 0} late
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Tasks */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Tasks</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.pendingTasks || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.completedTasks || 0} completed
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <CheckSquare className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Pending Reviews */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Reviews</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {(stats?.pendingLeaveRequests || 0) + (stats?.pendingTaskReviews || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.pendingLeaveRequests || 0} leave, {stats?.pendingTaskReviews || 0} tasks
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Performance Metrics */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Overview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Attendance Rate</span>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.averageAttendanceRate || 0}%
                  </p>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${stats?.averageAttendanceRate || 0}%` }}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Task Completion</span>
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.averageTaskCompletionRate || 0}%
                  </p>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${stats?.averageTaskCompletionRate || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => navigate('/dashboard/employees')}
                  className="flex flex-col items-center p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <Users className="h-6 w-6 text-gray-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Manage Employees</span>
                </button>

                <button
                  onClick={() => navigate('/tasks/create')}
                  className="flex flex-col items-center p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-500 hover:bg-purple-50 transition-colors"
                >
                  <CheckSquare className="h-6 w-6 text-gray-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Create Task</span>
                </button>

                <button
                  onClick={() => navigate('/reports')}
                  className="flex flex-col items-center p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-green-500 hover:bg-green-50 transition-colors"
                >
                  <FileText className="h-6 w-6 text-gray-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">View Reports</span>
                </button>

                <button
                  onClick={() => navigate('/settings')}
                  className="flex flex-col items-center p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="h-6 w-6 text-gray-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Settings</span>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-0">
                      <div className={`p-2 rounded-lg ${
                        activity.type === 'attendance' ? 'bg-green-100' :
                        activity.type === 'task' ? 'bg-purple-100' :
                        activity.type === 'leave' ? 'bg-blue-100' :
                        'bg-red-100'
                      }`}>
                        {activity.type === 'attendance' && <Clock className="h-4 w-4 text-green-600" />}
                        {activity.type === 'task' && <CheckSquare className="h-4 w-4 text-purple-600" />}
                        {activity.type === 'leave' && <Calendar className="h-4 w-4 text-blue-600" />}
                        {activity.type === 'alert' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{activity.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* On Leave Today */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">On Leave Today</h3>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <p className="text-4xl font-bold text-gray-900">{stats?.onLeave || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">employees</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/leave/calendar')}
                className="w-full mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View Leave Calendar →
              </button>
            </div>

            {/* Pending Approvals */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Pending Approvals</h3>
              <div className="space-y-3">
                {stats && stats.pendingLeaveRequests > 0 && (
                  <button
                    onClick={() => navigate('/leave/requests')}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-900">Leave Requests</span>
                    </div>
                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {stats.pendingLeaveRequests}
                    </span>
                  </button>
                )}

                {stats && stats.pendingTaskReviews > 0 && (
                  <button
                    onClick={() => navigate('/tasks/reviews')}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <CheckSquare className="h-5 w-5 text-purple-600" />
                      <span className="text-sm font-medium text-gray-900">Task Reviews</span>
                    </div>
                    <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {stats.pendingTaskReviews}
                    </span>
                  </button>
                )}

                {(!stats || (stats.pendingLeaveRequests === 0 && stats.pendingTaskReviews === 0)) && (
                  <p className="text-sm text-gray-500 text-center py-4">No pending approvals</p>
                )}
              </div>
            </div>

            {/* Subscription Info */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-sm p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Subscription</h3>
                <DollarSign className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold mb-1">
                {trialDaysLeft !== null && trialDaysLeft > 0 ? 'Trial' : 'Gold Plan'}
              </p>
              <p className="text-sm opacity-90 mb-4">
                {trialDaysLeft !== null && trialDaysLeft > 0 
                  ? `${trialDaysLeft} days remaining`
                  : 'Active subscription'
                }
              </p>
              <button
                onClick={() => navigate('/subscription')}
                className="w-full bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 text-sm font-medium transition-colors"
              >
                Manage Subscription
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
