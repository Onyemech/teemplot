import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  CheckSquare,
  Calendar,
  AlertTriangle,
  Settings,
  FileText,
  DollarSign
} from 'lucide-react';
// import { useUser } from '@/contexts/UserContext';
import StatCard from '@/components/dashboard/StatCard';

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

import { buildApiUrl } from '@/utils/apiHelpers';

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  // const [loading, setLoading] = useState(true);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);

  // Get user data securely from context (uses httpOnly cookies)
  // const { user: currentUser } = useUser();
  // const companyName = currentUser?.companyName || 'Your Company';
  // const userName = currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : 'User';
  // const userRole = currentUser?.role || 'owner';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch dashboard stats
      const statsResponse = await fetch(buildApiUrl('/dashboard/stats'), {
        credentials: 'include' // Use httpOnly cookies
      });
      const statsData = await statsResponse.json();

      if (statsData.success) {
        setStats(statsData.data);
        setTrialDaysLeft(statsData.data.trialDaysLeft);
      }

      // Fetch recent activity
      const activityResponse = await fetch(buildApiUrl('/dashboard/recent-activity'), {
        credentials: 'include' // Use httpOnly cookies
      });
      const activityData = await activityResponse.json();

      if (activityData.success) {
        setRecentActivity(activityData.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      // setLoading(false);
    }
  };



  return (
    <div className="h-full bg-gray-50 p-3 md:p-6 pb-20 md:pb-6">
      {/* Header - Removed duplicate mobile header since DashboardLayout now handles it */}

      <div className="space-y-6">

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-4 md:gap-3 md:mb-8 [&>*:nth-last-child(1):nth-child(odd)]:col-span-2 md:[&>*:nth-last-child(1):nth-child(odd)]:col-span-1">
          <StatCard
            label="Total Employees"
            value={stats?.totalEmployees || 0}
            subtext={<span className="text-xs text-green-600 font-medium">{stats?.activeEmployees || 0} active</span>}
            icon={Users}
            iconColorClass="text-blue-600"
          />
          <StatCard
            label="Present Today"
            value={stats?.presentToday || 0}
            subtext={<span className="text-xs text-gray-500">{stats?.averageAttendanceRate || 0}% rate</span>}
            icon={CheckSquare}
            iconColorClass="text-green-600"
          />
          <StatCard
            label="On Leave"
            value={stats?.onLeave || 0}
            subtext={<span className="text-xs text-orange-600">{stats?.pendingLeaveRequests || 0} pending</span>}
            icon={Calendar}
            iconColorClass="text-orange-600"
          />
          <StatCard
            label="Late Today"
            value={stats?.lateToday || 0}
            subtext={<span className="text-xs text-red-600">Needs attention</span>}
            icon={Clock}
            iconColorClass="text-red-600"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Subscription Quick View - Balanced at top of main area */}
            <div className="bg-gradient-to-r from-[#0F5D5D] to-[#0a4545] rounded-xl shadow-lg p-5 text-white flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <div className="flex items-center gap-4 relative z-10 text-center md:text-left">
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {trialDaysLeft !== null && trialDaysLeft > 0 ? 'Trial Plan Active' : 'Gold Plan Active'}
                  </h3>
                  <p className="text-sm text-white/80">
                    {trialDaysLeft !== null && trialDaysLeft > 0
                      ? `${trialDaysLeft} days remaining in your trial`
                      : 'You have full access to all enterprise features'
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/subscription')}
                className="bg-white text-[#0F5D5D] px-6 py-2.5 rounded-lg hover:bg-white/90 text-sm font-bold transition-all shadow-md active:scale-95 relative z-10 whitespace-nowrap"
              >
                Manage Plan
              </button>
            </div>


            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 [&>*:nth-last-child(1):nth-child(odd)]:col-span-2 md:[&>*:nth-last-child(1):nth-child(odd)]:col-span-1">
                <button
                  onClick={() => navigate('/dashboard/employees')}
                  className="flex flex-col items-center p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-[#E8F5E9] hover:border-[#0F5D5D]/20 transition-all active:scale-95"
                >
                  <Users className="h-6 w-6 text-gray-600 mb-2" />
                  <span className="text-xs font-semibold text-gray-900 text-center">Manage Employees</span>
                </button>

                <button
                  onClick={() => navigate('/tasks/create')}
                  className="flex flex-col items-center p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-purple-50 hover:border-purple-200 transition-all active:scale-95"
                >
                  <CheckSquare className="h-6 w-6 text-gray-600 mb-2" />
                  <span className="text-xs font-semibold text-gray-900 text-center">Create Task</span>
                </button>

                <button
                  onClick={() => navigate('/reports')}
                  className="flex flex-col items-center p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 transition-all active:scale-95"
                >
                  <FileText className="h-6 w-6 text-gray-600 mb-2" />
                  <span className="text-xs font-semibold text-gray-900 text-center">View Reports</span>
                </button>

                <button
                  onClick={() => navigate('/settings')}
                  className="flex flex-col items-center p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-all active:scale-95"
                >
                  <Settings className="h-6 w-6 text-gray-600 mb-2" />
                  <span className="text-xs font-semibold text-gray-900 text-center">Settings</span>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${activity.type === 'attendance' ? 'bg-green-100' :
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
                        <p className="text-sm text-gray-900 font-medium">{activity.message}</p>
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

          {/* Right Column - Sidebar Widgets */}
          <div className="lg:col-span-1 space-y-6">
            {/* On Leave Today - Hidden on mobile as requested */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">On Leave Today</h3>
              <div className="flex items-center justify-center py-4">
                <div className="text-center">
                  <p className="text-5xl font-black text-gray-900 tracking-tighter">{stats?.onLeave || 0}</p>
                  <p className="text-sm text-gray-500 mt-2 font-medium">employees</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/leave/calendar')}
                className="w-full mt-2 text-sm bg-gray-50 text-gray-700 py-2.5 rounded-lg hover:bg-gray-100 font-medium transition-colors"
              >
                View Leave Calendar
              </button>
            </div>

            {/* Pending Approvals */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Pending Approvals</h3>
              <div className="space-y-3">
                {stats && stats.pendingLeaveRequests > 0 && (
                  <button
                    onClick={() => navigate('/leave/requests')}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-900">Leave Requests</span>
                    </div>
                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full group-hover:scale-110 transition-transform">
                      {stats.pendingLeaveRequests}
                    </span>
                  </button>
                )}

                {stats && stats.pendingTaskReviews > 0 && (
                  <button
                    onClick={() => navigate('/tasks/reviews')}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <CheckSquare className="h-5 w-5 text-purple-600" />
                      <span className="text-sm font-medium text-gray-900">Task Reviews</span>
                    </div>
                    <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full group-hover:scale-110 transition-transform">
                      {stats.pendingTaskReviews}
                    </span>
                  </button>
                )}

                {(!stats || (stats.pendingLeaveRequests === 0 && stats.pendingTaskReviews === 0)) && (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <CheckSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No pending approvals</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
