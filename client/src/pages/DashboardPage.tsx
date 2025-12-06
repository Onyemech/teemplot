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
  Bell,
  UserPlus,
  MapPin,
  Award
} from 'lucide-react';
import { useUser } from '@/contexts/UserContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface DashboardStats {
  totalEmployees?: number;
  activeEmployees?: number;
  presentToday?: number;
  absentToday?: number;
  lateToday?: number;
  onLeave?: number;
  pendingTasks?: number;
  completedTasks?: number;
  pendingLeaveRequests?: number;
  pendingTaskReviews?: number;
  averageAttendanceRate?: number;
  averageTaskCompletionRate?: number;
  myTasks?: {
    pending: number;
    inProgress: number;
    awaitingReview: number;
    completed: number;
  };
  attendance?: {
    presentDays: number;
    absentDays: number;
    lateDays: number;
    attendanceRate: number;
  };
  leave?: {
    available: number;
    used: number;
    pending: number;
  };
  performance?: {
    taskCompletionRate: number;
    averageRating: number;
    totalPoints: number;
  };
}

interface AttendanceStatus {
  isClockedIn: boolean;
  clockInTime: string | null;
  totalHoursToday: number;
  isWithinGeofence: boolean;
  distanceFromOffice: number;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingIn] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const companyName = currentUser?.companyName || 'Your Company';
  const userName = currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : 'User';
  const userRole = currentUser?.role || 'staff';
  const isAdmin = userRole === 'owner' || userRole === 'admin';

  useEffect(() => {
    fetchDashboardData();
    if (!isAdmin) {
      getCurrentLocation();
    }
  }, [isAdmin]);

  const fetchDashboardData = async () => {
    try {
      if (isAdmin) {
        // Fetch admin stats
        const statsResponse = await fetch(`${API_URL}/api/dashboard/stats`, {
          credentials: 'include'
        });
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats(statsData.data);
        }
      } else {
        // Fetch employee stats
        const statsResponse = await fetch(`${API_URL}/api/dashboard/employee-stats`, {
          credentials: 'include'
        });
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats(statsData.data);
        }

        // Fetch attendance status
        const attendanceResponse = await fetch(`${API_URL}/api/attendance/status`, {
          credentials: 'include'
        });
        const attendanceData = await attendanceResponse.json();
        if (attendanceData.success) {
          setAttendanceStatus(attendanceData.data);
        }
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
        (error) => console.error('Error getting location:', error)
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
      const response = await fetch(`${API_URL}/api/attendance/clock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
      const response = await fetch(`${API_URL}/api/attendance/clock-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
              <p className="text-sm text-gray-600 mt-1">
                Welcome back, {userName}! 
                <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                  isAdmin ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                }`}>
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
        {/* Staff: Clock In/Out Card */}
        {!isAdmin && (
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
                className="bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-blue-50 font-semibold text-lg transition-colors disabled:opacity-50"
              >
                {clockingIn ? 'Processing...' : attendanceStatus?.isClockedIn ? 'Clock Out' : 'Clock In'}
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isAdmin ? (
            <>
              {/* Admin Stats */}
              <div className="bg-white rounded-xl shadow-md hover:shadow-lg border border-gray-100 p-6 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Employees</p>
                    <p className="text-3xl font-bold text-primary mt-2">{stats?.totalEmployees || 0}</p>
                    <p className="text-xs text-success mt-1 font-medium">{stats?.activeEmployees || 0} active</p>
                  </div>
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4 rounded-xl">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md hover:shadow-lg border border-gray-100 p-6 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Present Today</p>
                    <p className="text-3xl font-bold text-success mt-2">{stats?.presentToday || 0}</p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">
                      {stats?.absentToday || 0} absent, {stats?.lateToday || 0} late
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-success/10 to-success/5 p-4 rounded-xl">
                    <Clock className="h-8 w-8 text-success" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md hover:shadow-lg border border-gray-100 p-6 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Tasks</p>
                    <p className="text-3xl font-bold text-info mt-2">{stats?.pendingTasks || 0}</p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">{stats?.completedTasks || 0} completed</p>
                  </div>
                  <div className="bg-gradient-to-br from-info/10 to-info/5 p-4 rounded-xl">
                    <CheckSquare className="h-8 w-8 text-info" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md hover:shadow-lg border border-gray-100 p-6 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
                    <p className="text-3xl font-bold text-accent mt-2">
                      {(stats?.pendingLeaveRequests || 0) + (stats?.pendingTaskReviews || 0)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">
                      {stats?.pendingLeaveRequests || 0} leave, {stats?.pendingTaskReviews || 0} tasks
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-accent/10 to-accent/5 p-4 rounded-xl">
                    <AlertTriangle className="h-8 w-8 text-accent" />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Staff Stats */}
              <div className="bg-white rounded-xl shadow-md hover:shadow-lg border border-gray-100 p-6 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">My Tasks</h3>
                  <div className="bg-gradient-to-br from-info/10 to-info/5 p-3 rounded-lg">
                    <CheckSquare className="h-5 w-5 text-info" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-info mb-2">{stats?.myTasks?.inProgress || 0}</p>
                <p className="text-xs text-gray-500 font-medium">
                  {stats?.myTasks?.pending || 0} pending, {stats?.myTasks?.awaitingReview || 0} in review
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-md hover:shadow-lg border border-gray-100 p-6 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Attendance</h3>
                  <div className="bg-gradient-to-br from-success/10 to-success/5 p-3 rounded-lg">
                    <Clock className="h-5 w-5 text-success" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-success mb-2">{stats?.attendance?.attendanceRate || 0}%</p>
                <p className="text-xs text-gray-500 font-medium">
                  {stats?.attendance?.presentDays || 0} present, {stats?.attendance?.absentDays || 0} absent
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-md hover:shadow-lg border border-gray-100 p-6 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Leave Balance</h3>
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-3 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-primary mb-2">{stats?.leave?.available || 0}</p>
                <p className="text-xs text-gray-500 font-medium">
                  {stats?.leave?.used || 0} used, {stats?.leave?.pending || 0} pending
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-md hover:shadow-lg border border-gray-100 p-6 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Performance</h3>
                  <div className="bg-gradient-to-br from-accent/10 to-accent/5 p-3 rounded-lg">
                    <Award className="h-5 w-5 text-accent" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-accent mb-2">
                  {stats?.performance?.averageRating?.toFixed(1) || '0.0'}
                </p>
                <p className="text-xs text-gray-500 font-medium">{stats?.performance?.totalPoints || 0} points earned</p>
              </div>
            </>
          )}
        </div>

        {/* Quick Actions for Admin */}
        {isAdmin && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => navigate('/dashboard/employees')}
                className="group flex flex-col items-center p-5 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary hover:bg-gradient-to-br hover:from-primary/5 hover:to-primary/10 transition-all duration-300 hover:shadow-md"
              >
                <div className="bg-primary/10 p-3 rounded-lg mb-3 group-hover:bg-primary/20 transition-colors">
                  <UserPlus className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-gray-900">Manage Employees</span>
              </button>

              <button
                onClick={() => navigate('/tasks/create')}
                className="group flex flex-col items-center p-5 rounded-xl border-2 border-dashed border-gray-200 hover:border-info hover:bg-gradient-to-br hover:from-info/5 hover:to-info/10 transition-all duration-300 hover:shadow-md"
              >
                <div className="bg-info/10 p-3 rounded-lg mb-3 group-hover:bg-info/20 transition-colors">
                  <CheckSquare className="h-6 w-6 text-info" />
                </div>
                <span className="text-sm font-medium text-gray-900">Create Task</span>
              </button>

              <button
                onClick={() => navigate('/dashboard/attendance')}
                className="group flex flex-col items-center p-5 rounded-xl border-2 border-dashed border-gray-200 hover:border-success hover:bg-gradient-to-br hover:from-success/5 hover:to-success/10 transition-all duration-300 hover:shadow-md"
              >
                <div className="bg-success/10 p-3 rounded-lg mb-3 group-hover:bg-success/20 transition-colors">
                  <Clock className="h-6 w-6 text-success" />
                </div>
                <span className="text-sm font-medium text-gray-900">View Attendance</span>
              </button>

              <button
                onClick={() => navigate('/reports')}
                className="group flex flex-col items-center p-5 rounded-xl border-2 border-dashed border-gray-200 hover:border-accent hover:bg-gradient-to-br hover:from-accent/5 hover:to-accent/10 transition-all duration-300 hover:shadow-md"
              >
                <div className="bg-accent/10 p-3 rounded-lg mb-3 group-hover:bg-accent/20 transition-colors">
                  <TrendingUp className="h-6 w-6 text-accent" />
                </div>
                <span className="text-sm font-medium text-gray-900">Reports</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
