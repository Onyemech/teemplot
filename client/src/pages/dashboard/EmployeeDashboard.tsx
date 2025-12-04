import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckSquare,
  Calendar,
  MapPin,
  TrendingUp,
  Award,
  Bell,
  User
} from 'lucide-react';

interface AttendanceStatus {
  isClockedIn: boolean;
  clockInTime: string | null;
  clockOutTime: string | null;
  totalHoursToday: number;
  isWithinGeofence: boolean;
  distanceFromOffice: number;
}

interface EmployeeStats {
  myTasks: {
    pending: number;
    inProgress: number;
    awaitingReview: number;
    completed: number;
  };
  attendance: {
    presentDays: number;
    absentDays: number;
    lateDays: number;
    attendanceRate: number;
  };
  leave: {
    available: number;
    used: number;
    pending: number;
  };
  performance: {
    taskCompletionRate: number;
    averageRating: number;
    totalPoints: number;
  };
}

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus | null>(null);
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingIn] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Get company info
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const companyName = user?.companyName || 'Your Company';
  const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Employee';

  useEffect(() => {
    fetchDashboardData();
    getCurrentLocation();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch attendance status
      const attendanceResponse = await fetch('/api/attendance/status', {
        credentials: 'include' // Use httpOnly cookies
      });
      const attendanceData = await attendanceResponse.json();
      
      if (attendanceData.success) {
        setAttendanceStatus(attendanceData.data);
      }

      // Fetch employee stats
      const statsResponse = await fetch('/api/dashboard/employee-stats', {
        credentials: 'include' // Use httpOnly cookies
      });
      const statsData = await statsResponse.json();
      
      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const handleClockIn = async () => {
    if (!location) {
      alert('Please enable location services to clock in');
      return;
    }

    setClockingIn(true);
    try {
      const response = await fetch('/api/attendance/clock-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Use httpOnly cookies
        body: JSON.stringify({ location })
      });

      const data = await response.json();
      
      if (data.success) {
        setAttendanceStatus(data.data);
        alert('Clocked in successfully!');
      } else {
        alert(data.message || 'Failed to clock in');
      }
    } catch (error) {
      console.error('Clock in error:', error);
      alert('Failed to clock in. Please try again.');
    } finally {
      setClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    if (!location) {
      alert('Please enable location services to clock out');
      return;
    }

    setClockingIn(true);
    try {
      const response = await fetch('/api/attendance/clock-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Use httpOnly cookies
        body: JSON.stringify({ location })
      });

      const data = await response.json();
      
      if (data.success) {
        setAttendanceStatus(data.data);
        alert('Clocked out successfully!');
      } else {
        alert(data.message || 'Failed to clock out');
      }
    } catch (error) {
      console.error('Clock out error:', error);
      alert('Failed to clock out. Please try again.');
    } finally {
      setClockingIn(false);
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
              <p className="text-sm text-gray-600 mt-1">Welcome back, {userName}!</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/notifications')}
                className="relative p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              >
                <Bell className="h-6 w-6" />
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              >
                <User className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Clock In/Out Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-lg p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {attendanceStatus?.isClockedIn ? 'You are clocked in' : 'Ready to start your day?'}
              </h2>
              {attendanceStatus?.isClockedIn && attendanceStatus.clockInTime && (
                <p className="text-blue-100 mb-4">
                  Clocked in at {new Date(attendanceStatus.clockInTime).toLocaleTimeString()}
                </p>
              )}
              {attendanceStatus?.isClockedIn && (
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>{attendanceStatus.totalHoursToday.toFixed(1)} hours today</span>
                  </div>
                  {location && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {attendanceStatus.isWithinGeofence 
                          ? 'Within office area' 
                          : `${attendanceStatus.distanceFromOffice}m from office`
                        }
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={attendanceStatus?.isClockedIn ? handleClockOut : handleClockIn}
              disabled={clockingIn}
              className="bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-blue-50 font-semibold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {clockingIn ? 'Processing...' : attendanceStatus?.isClockedIn ? 'Clock Out' : 'Clock In'}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* My Tasks */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">My Tasks</h3>
              <CheckSquare className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">
              {stats?.myTasks.inProgress || 0}
            </p>
            <p className="text-xs text-gray-500">
              {stats?.myTasks.pending || 0} pending, {stats?.myTasks.awaitingReview || 0} in review
            </p>
            <button
              onClick={() => navigate('/tasks')}
              className="mt-4 w-full text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              View All Tasks →
            </button>
          </div>

          {/* Attendance */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Attendance</h3>
              <Clock className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">
              {stats?.attendance.attendanceRate || 0}%
            </p>
            <p className="text-xs text-gray-500">
              {stats?.attendance.presentDays || 0} present, {stats?.attendance.absentDays || 0} absent
            </p>
            <button
              onClick={() => navigate('/attendance/history')}
              className="mt-4 w-full text-sm text-green-600 hover:text-green-700 font-medium"
            >
              View History →
            </button>
          </div>

          {/* Leave Balance */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Leave Balance</h3>
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">
              {stats?.leave.available || 0}
            </p>
            <p className="text-xs text-gray-500">
              {stats?.leave.used || 0} used, {stats?.leave.pending || 0} pending
            </p>
            <button
              onClick={() => navigate('/leave/request')}
              className="mt-4 w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Request Leave →
            </button>
          </div>

          {/* Performance */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Performance</h3>
              <Award className="h-5 w-5 text-yellow-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">
              {stats?.performance.averageRating.toFixed(1) || '0.0'}
            </p>
            <p className="text-xs text-gray-500">
              {stats?.performance.totalPoints || 0} points earned
            </p>
            <button
              onClick={() => navigate('/performance')}
              className="mt-4 w-full text-sm text-yellow-600 hover:text-yellow-700 font-medium"
            >
              View Details →
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* My Tasks List */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">My Active Tasks</h2>
              <button
                onClick={() => navigate('/tasks')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-500 text-center py-8">
                Your active tasks will appear here
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/leave/request')}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">Request Leave</span>
                </button>

                <button
                  onClick={() => navigate('/attendance/history')}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
                >
                  <Clock className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">View Attendance</span>
                </button>

                <button
                  onClick={() => navigate('/tasks')}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors"
                >
                  <CheckSquare className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-900">My Tasks</span>
                </button>

                <button
                  onClick={() => navigate('/performance')}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors"
                >
                  <TrendingUp className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm font-medium text-gray-900">Performance</span>
                </button>
              </div>
            </div>

            {/* Performance Chart */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">This Month</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-600">Task Completion</span>
                    <span className="text-xs font-medium text-gray-900">
                      {stats?.performance.taskCompletionRate || 0}%
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${stats?.performance.taskCompletionRate || 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-600">Attendance Rate</span>
                    <span className="text-xs font-medium text-gray-900">
                      {stats?.attendance.attendanceRate || 0}%
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${stats?.attendance.attendanceRate || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
