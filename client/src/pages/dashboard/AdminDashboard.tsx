import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  CheckSquare,
  AlertTriangle
} from 'lucide-react';
// import { useUser } from '@/contexts/UserContext';
import { apiClient } from '@/lib/api';
import DepartmentTaskOverview from '@/components/dashboard/DepartmentTaskOverview';
import StatCard from '@/components/dashboard/StatCard';
import { UserRoles } from '@/constants/roles';

interface DashboardStats {
  teamMembers: number;
  activeTasks: number;
  pendingReviews: number;
  attendanceRate: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  // const { user } = useUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  // const [loading, setLoading] = useState(true);

  const role = UserRoles.DEPARTMENT_HEAD;

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/api/dashboard/stats');
      const data = response.data;

      if (data.success) {
        const d = data.data;
        setStats({
          teamMembers: d.totalEmployees || 0,
          activeTasks: d.pendingTasks || 0,
          pendingReviews: (d.pendingTaskReviews || 0) + (d.pendingLeaveRequests || 0),
          attendanceRate: d.averageAttendanceRate || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      // setLoading(false);
    }
  };



  return (
    <div className="h-full bg-gray-50 p-3 md:p-6 pb-20 md:pb-6">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Team Members"
            value={stats?.teamMembers || 0}
            icon={Users}
            iconColorClass="text-blue-600"
          />
          <StatCard
            label="Active Tasks"
            value={stats?.activeTasks || 0}
            icon={CheckSquare}
            iconColorClass="text-purple-600"
          />
          <StatCard
            label="Pending Reviews"
            value={stats?.pendingReviews || 0}
            icon={AlertTriangle}
            iconColorClass="text-yellow-600"
          />
          <StatCard
            label="Attendance"
            value={`${stats?.attendanceRate || 0}%`}
            icon={Clock}
            iconColorClass="text-green-600"
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Task Oversight */}
          <div className="lg:col-span-2 space-y-6">
            <DepartmentTaskOverview role={role} />
          </div>

          {/* Right Column - Quick Actions & Team */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => navigate('/dashboard/tasks/new')}
                  className="p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-all text-center"
                >
                  <CheckSquare className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <span className="text-sm font-medium">Assign Task</span>
                </button>
                <button
                  onClick={() => navigate('/dashboard/attendance')}
                  className="p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-all text-center"
                >
                  <Clock className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <span className="text-sm font-medium">Check Attendance</span>
                </button>
              </div>
            </div>

            {/* Recent Activity or Notifications could go here */}
          </div>
        </div>
      </div>
    </div>
  );
}
