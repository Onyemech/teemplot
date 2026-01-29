import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  LogOut,
  Send,
  Scale,
  Coffee,
  AlertTriangle,
  CheckCircle,
  Fingerprint
} from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import StatCard from '@/components/dashboard/StatCard';
import LocationVerificationModal from '@/components/dashboard/LocationVerificationModal';
import { apiClient } from '@/lib/api';
import { permissionManager, type PermissionError } from '@/utils/PermissionManager';
import PermissionModal from '@/components/common/PermissionModal';
import { Skeleton } from '@/components/ui/Skeleton';

interface AttendanceStatus {
  isClockedIn: boolean;
  clockInTime: string | null;
  clockOutTime: string | null;
  totalHoursToday: number;
  isWithinGeofence: boolean;
  distanceFromOffice: number;
  status?: string;
  breaks?: any[];
}

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus | null>(null);
  const [stats, setStats] = useState<{ present: number; late: number; absent: number } | null>(null);
  const [loading, setLoading] = useState(true); // Initial data load
  const [loadingAction, setLoadingAction] = useState<string | null>(null); // 'clockIn', 'clockOut', 'startBreak', 'endBreak'
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showEarlyClockOutModal, setShowEarlyClockOutModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [earlyReason, setEarlyReason] = useState('');
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [biometricAction, setBiometricAction] = useState<'in' | 'out'>('in');
  const [biometricRequired, setBiometricRequired] = useState(false);
  const [showLocationVerification, setShowLocationVerification] = useState(false);
  const [biometricProof, setBiometricProof] = useState<string | null>(null);
  const [companyTimezone, setCompanyTimezone] = useState<string | undefined>(undefined);

  // Permission States
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionError, setPermissionError] = useState<PermissionError | undefined>();

  // Get user data securely from context (uses httpOnly cookies)
  const { user: currentUser } = useUser();
  const userName = currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : 'User';

  // Helper to check if any action is in progress
  const isActionLoading = !!loadingAction;

  useEffect(() => {
    fetchDashboardData();
    getCurrentLocation();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch attendance status
      const attendanceResponse = await apiClient.get('/api/attendance/status');
      const attendanceData = attendanceResponse.data;

      if (attendanceData.success) {
        setAttendanceStatus(attendanceData.data);
        if (attendanceData.data.requiresLocationVerification) {
          setShowLocationVerification(true);
        }
      }

      // Fetch employee stats
      const statsResponse = await apiClient.get('/api/dashboard/employee-stats');
      const statsData = statsResponse.data;

      if (statsData.success) {
        setStats(statsData.data);
      } else {
        // Fallback mock data if API fails or not implemented yet
        setStats({ present: 12, late: 5, absent: 2 });
      }

      // Fetch company settings to check if biometrics are required
      const settingsResponse = await apiClient.get('/api/company-settings');
      if (settingsResponse.data.success) {
        setBiometricRequired(settingsResponse.data.data.biometrics_required || false);
        setCompanyTimezone(settingsResponse.data.data.timezone);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      // Fallback mock data
      setStats({ present: 12, late: 5, absent: 2 });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    const result = await permissionManager.requestLocation({
      timeout: 10000,
      retries: 1
    });

    if (result.success) {
      setLocation({
        latitude: result.latitude!,
        longitude: result.longitude!
      });
    } else {
      console.warn('Location retrieval failed:', result.error);
      // We don't necessarily show the modal here on initial load, 
      // but we should if the user tries to clock in/out (handled there).
    }
  };

  const getBiometricProof = async (): Promise<string | null> => {
    if (!window.PublicKeyCredential) {
      alert('Biometrics not supported on this device');
      return null;
    }

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const publicKey: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        userVerification: 'required',
      };

      const credential = await navigator.credentials.get({ publicKey });

      if (!credential) return null;

      return btoa(credential.id);
    } catch (err: any) {
      console.error('Biometric error:', err);
      alert('Biometric verification failed');
      return null;
    }
  };

  const handleBiometricVerify = async () => {
    const proof = await getBiometricProof();
    if (proof) {
      setBiometricProof(proof);
      setShowBiometricModal(false);
      if (biometricAction === 'in') {
        performClockIn(proof);
      } else {
        proceedToClockOut(proof);
      }
    }
  };

  const handleClockIn = async () => {
    // If we don't have location yet, try to get it again explicitly
    if (!location) {
      const result = await permissionManager.requestLocation({ retries: 2 });

      if (result.success) {
        setLocation({
          latitude: result.latitude!,
          longitude: result.longitude!
        });
        // Continue flow
      } else {
        // Show permission modal logic
        if (result.error?.needsManualEnable) {
          setPermissionError(result.error);
          setShowPermissionModal(true);
          return;
        }
        alert(result.error?.userMessage || 'Location required to clock in');
        return;
      }
    }

    // Check if biometrics are required by company settings
    if (biometricRequired) {
      setBiometricAction('in');
      setShowBiometricModal(true);
      return;
    }

    performClockIn();
  };

  const performClockIn = async (biometricsProof?: string) => {
    if (loadingAction) return; // Deduplicate
    setLoadingAction('clockIn');
    try {
      const body: any = { location };
      if (biometricsProof) {
        body.biometricsProof = biometricsProof;
      }

      const response = await apiClient.post('/api/attendance/check-in', body);

      const data = response.data;

      if (data.success) {
        setAttendanceStatus(data.data);
        alert('Clocked in successfully!');
      } else {
        alert(data.message || 'Failed to clock in');
      }
    } catch (error: any) {
      console.error('Clock in error:', error);
      alert(error.response?.data?.message || 'Failed to clock in. Please try again.');
    } finally {
      setLoadingAction(null);
      setBiometricProof(null); // Reset proof
    }
  };

  const initiateClockOut = () => {
    // Check if biometrics are required
    if (biometricRequired) {
      setBiometricAction('out');
      setShowBiometricModal(true);
      return;
    }

    proceedToClockOut();
  };

  const handleLocationVerify = async (loc: { latitude: number; longitude: number }) => {
    try {
      const response = await apiClient.post('/api/attendance/verify-location', {
        location: loc
      });

      if (response.data.success) {
        setShowLocationVerification(false);
        // Refresh status
        fetchDashboardData();
      } else {
        alert(response.data.message || 'Verification failed');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Verification failed');
    }
  };

  const proceedToClockOut = (proof?: string) => {
    // Check if early (e.g. before 5 PM)
    const now = new Date();
    if (now.getHours() < 17) {
      setShowEarlyClockOutModal(true);
    } else {
      confirmClockOut(proof);
    }
  };

  const confirmClockOut = async (passedProof?: string) => {
    if (loadingAction) return; // Deduplicate

    if (!location) {
      const result = await permissionManager.requestLocation({ retries: 2 });
      if (result.success) {
        setLocation({ latitude: result.latitude!, longitude: result.longitude! });
      } else {
        if (result.error?.needsManualEnable) {
          setPermissionError(result.error);
          setShowPermissionModal(true);
          return;
        }
        alert(result.error?.userMessage || 'Location required to clock out');
        return;
      }
    }

    const proof = passedProof || biometricProof;

    setLoadingAction('clockOut');
    try {
      // Get current attendance ID first
      const currentRes = await apiClient.get('/api/attendance/current');
      if (!currentRes.data.success || !currentRes.data.data) {
        alert('No active attendance found. Please clock in first.');
        setLoadingAction(null);
        return;
      }

      const attendanceId = currentRes.data.data.id;

      const body: any = {
        attendanceId,
        location,
        reason: earlyReason // Send reason if provided
      };
      if (proof) {
        body.biometricsProof = proof;
      }

      const response = await apiClient.post('/api/attendance/check-out', body);

      const data = response.data;

      if (data.success) {
        setAttendanceStatus(data.data);
        setShowEarlyClockOutModal(false);
        setShowSuccessModal(true);
      } else {
        alert(data.message || 'Failed to clock out');
      }
    } catch (error: any) {
      console.error('Clock out error:', error);
      alert(error.response?.data?.message || 'Failed to clock out. Please try again.');
    } finally {
      setLoadingAction(null);
      setBiometricProof(null); // Reset proof
    }
  };

  const handleStartBreak = async () => {
    if (loadingAction) return;
    if (!attendanceStatus?.isClockedIn) {
      alert('You must be clocked in to take a break');
      return;
    }
    setLoadingAction('startBreak');
    try {
      const res = await apiClient.post('/api/attendance/break/start');
      if (res.data.success) {
        await fetchDashboardData();
        alert('Break started');
      } else {
        alert(res.data.message);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start break');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEndBreak = async () => {
    if (loadingAction) return;
    setLoadingAction('endBreak');
    try {
      const res = await apiClient.post('/api/attendance/break/end');
      if (res.data.success) {
        await fetchDashboardData();
        alert('Break ended');
      } else {
        alert(res.data.message);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to end break');
    } finally {
      setLoadingAction(null);
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24 md:pb-0">
        {/* Top Section Skeleton */}
        <div className="bg-white p-6 pb-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-6 w-48" />
            </div>
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>

          {/* Stats Overview Skeleton */}
          <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-3 md:gap-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>

          {/* Status Pills Skeleton */}
          <div className="flex items-center space-x-3 overflow-hidden py-2">
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
          </div>
        </div>

        {/* Quick Actions Skeleton */}
        <div className="p-6 space-y-4">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>

        {/* Bottom Actions Skeleton */}
        <div className="fixed bottom-[5.5rem] left-4 right-4 md:static md:mt-6">
          <div className="flex space-x-4">
            <Skeleton className="flex-1 h-14 rounded-xl" />
            <Skeleton className="flex-1 h-14 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-0">
      {/* Top Section */}
      <div className="bg-white p-6 pb-2">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-gray-500 font-medium">Good Morning ☀️</p>
            <h1 className="text-xl font-bold text-gray-900 mt-1">{userName}</h1>
          </div>
          {/* Avatar */}
          <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden border-2 border-white shadow-sm">
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-[#0F5D5D] text-white font-bold text-lg">
                {userName.charAt(0)}
              </div>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-3 md:gap-3">
          <StatCard label="Present" value={stats?.present || 0} />
          <StatCard label="Late" value={stats?.late || 0} />
          <StatCard label="Absent" value={stats?.absent || 0} />
        </div>

        {/* Status Pills - Horizontal Scroll */}
        <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar py-2 -mx-6 px-6">
          <div onClick={() => !attendanceStatus?.clockInTime && handleClockIn()} className={`flex items-center space-x-2 px-4 py-2 bg-white border border-gray-100 rounded-full shadow-sm whitespace-nowrap min-w-fit ${!attendanceStatus?.clockInTime ? 'cursor-pointer active:scale-95' : ''}`}>
            <Clock className="h-4 w-4 text-[#0F5D5D]" />
            <span className="text-sm font-semibold text-gray-700">
              {attendanceStatus?.clockInTime
                ? new Date(attendanceStatus.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: companyTimezone })
                : 'Clock In'}
            </span>
          </div>
          <div
            onClick={() => attendanceStatus?.status === 'on_break' ? handleEndBreak() : handleStartBreak()}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-100 rounded-full shadow-sm whitespace-nowrap min-w-fit cursor-pointer active:scale-95"
          >
            <span className={`h-4 w-1 rounded-full ${attendanceStatus?.status === 'on_break' ? 'bg-orange-500' : 'bg-blue-500'}`}></span>
            <span className="text-sm font-semibold text-gray-700">
              {attendanceStatus?.status === 'on_break' ? 'End Break' : 'Take Break'}
            </span>
          </div>

          {attendanceStatus?.isClockedIn && (
            <div className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-100 rounded-full shadow-sm whitespace-nowrap min-w-fit">
              <div className={`h-2 w-2 rounded-full ${attendanceStatus.isWithinGeofence ? 'bg-green-500' : 'bg-purple-500'}`}></div>
              <span className="text-sm font-semibold text-gray-700">
                {attendanceStatus.isWithinGeofence ? 'On-site' : 'Remote'}
              </span>
            </div>
          )}

          <div onClick={() => attendanceStatus?.isClockedIn && !attendanceStatus?.clockOutTime && initiateClockOut()} className={`flex items-center space-x-2 px-4 py-2 bg-white border border-gray-100 rounded-full shadow-sm whitespace-nowrap min-w-fit ${attendanceStatus?.isClockedIn && !attendanceStatus?.clockOutTime ? 'cursor-pointer active:scale-95' : ''}`}>
            <LogOut className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-gray-700">
              {attendanceStatus?.clockOutTime
                ? new Date(attendanceStatus.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: companyTimezone })
                : 'Clock Out'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions - Scrollable Container */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="p-6 space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 pl-1">Quick Actions</h2>

          {/* Attendance Card */}
          <div
            onClick={() => navigate('/dashboard/attendance')}
            className="bg-[#d2f9e580] p-5 rounded-2xl flex items-center justify-between cursor-pointer active:scale-95 transition-all duration-200 border border-transparent active:border-[#2E7D32]/20"
          >
            <div>
              <h3 className="font-bold text-[#034a3f] text-lg">Attendance</h3>
              <p className="text-[11px] text-[#034a3f]/70 mt-1 font-medium">Effortless tracking of your time on the job</p>
            </div>
            <div className="bg-white p-3 rounded-full shadow-sm">
              <Clock className="h-6 w-6 text-[#034a3f]" />
            </div>
          </div>

          {/* Send Requests Card */}
          <div
            onClick={() => navigate('/dashboard/requests')}
            className="bg-[#ffece380] p-5 rounded-2xl flex items-center justify-between cursor-pointer active:scale-95 transition-all duration-200 border border-transparent active:border-[#E65100]/20"
          >
            <div>
              <h3 className="font-bold text-[#E65100] text-lg">Send Requests</h3>
              <p className="text-[11px] text-[#E65100]/70 mt-1 font-medium">Need approval? Send your request instantly</p>
            </div>
            <div className="bg-white p-3 rounded-full shadow-sm">
              <Send className="h-6 w-6 text-[#E65100]" />
            </div>
          </div>

          {/* Leave/Balance Card */}
          <div
            onClick={() => navigate('/dashboard/leave')}
            className="bg-[#dbe5fd80] p-5 rounded-2xl flex items-center justify-between cursor-pointer active:scale-95 transition-all duration-200 border border-transparent active:border-[#1565C0]/20"
          >
            <div>
              <h3 className="font-bold text-[#1565C0] text-lg">Leave</h3>
              <p className="text-[11px] text-[#1565C0]/70 mt-1 font-medium">Balance your work and rest—start with a leave request</p>
            </div>
            <div className="bg-white p-3 rounded-full shadow-sm">
              <Scale className="h-6 w-6 text-[#1565C0]" />
            </div>
          </div>
        </div>
      </div>

      {/* Current Time / Actions - Fixed Bottom Card */}
      <div className="fixed bottom-[5.5rem] left-4 right-4 bg-white rounded-2xl shadow-xl border border-gray-100 p-5 z-10 md:static md:shadow-none md:border-0 md:bg-transparent md:p-0 md:mt-6">
        <div className="text-center mb-5 md:hidden">
          <div className="flex items-center justify-center flex-col">
            <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mb-1">Current Time</p>
            <h2 className="text-4xl font-black text-gray-900 tabular-nums tracking-tight">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: companyTimezone })}
            </h2>
            <p className="text-xs text-gray-400 mt-2 font-medium">
              09Hrs : 28Mins : 52Secs until close out
            </p>
          </div>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={attendanceStatus?.status === 'on_break' ? handleEndBreak : handleStartBreak}
            disabled={isActionLoading}
            className={`flex-1 bg-[#0F5D5D] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-teal-900/20 hover:bg-[#0a4545] active:bg-[#083838] transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed`}
          >
            {loadingAction === 'startBreak' || loadingAction === 'endBreak' ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Coffee className="h-5 w-5" />
            )}
            <span>
              {attendanceStatus?.status === 'on_break'
                ? (loadingAction === 'endBreak' ? 'Ending...' : 'End Break')
                : (loadingAction === 'startBreak' ? 'Starting...' : 'Take Break')}
            </span>
          </button>
          <button
            onClick={attendanceStatus?.isClockedIn ? initiateClockOut : handleClockIn}
            disabled={isActionLoading}
            className={`flex-1 bg-white border-2 font-bold py-3.5 px-4 rounded-xl shadow-sm hover:bg-gray-50 active:bg-gray-100 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed ${attendanceStatus?.isClockedIn
              ? 'border-red-100 text-red-500'
              : 'border-green-100 text-green-600'
              }`}
          >
            {(loadingAction === 'clockIn' || loadingAction === 'clockOut') ? (
              <div className={`animate-spin rounded-full h-5 w-5 border-b-2 ${attendanceStatus?.isClockedIn ? 'border-red-500' : 'border-green-600'}`}></div>
            ) : (
              attendanceStatus?.isClockedIn ? <LogOut className="h-5 w-5" /> : <Clock className="h-5 w-5" />
            )}
            <span>
              {attendanceStatus?.isClockedIn
                ? (loadingAction === 'clockOut' ? 'Clocking Out...' : 'Clock Out')
                : (loadingAction === 'clockIn' ? 'Clocking In...' : 'Clock In')}
            </span>
          </button>
        </div>
      </div>

      {/* Early Clock Out Modal */}
      {showEarlyClockOutModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mb-2">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">You're Clocking Out Early</h3>
              <p className="text-sm text-gray-500">
                You are about to clock out before the official closing time. This will be recorded as an early departure.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 ml-1">Reason for early clock out</label>
              <textarea
                value={earlyReason}
                onChange={(e) => setEarlyReason(e.target.value)}
                placeholder="Please state your reason..."
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[100px] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowEarlyClockOutModal(false)}
                className="py-3 px-4 rounded-xl border border-gray-200 font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmClockOut()}
                className="py-3 px-4 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
              >
                Clock Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Clock Out Successful</h3>
              <p className="text-sm text-gray-500">
                You have successfully clocked out for the day. See you tomorrow!
              </p>
            </div>

            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3.5 px-4 rounded-xl bg-[#0F5D5D] text-white font-bold hover:bg-[#0a4545] transition-colors shadow-lg shadow-teal-900/20"
            >
              Go Home
            </button>
          </div>
        </div>
      )}

      {/* Biometric Verification Modal */}
      {showBiometricModal && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 space-y-6 animate-in fade-in zoom-in duration-200 flex flex-col items-center">
            <div className="h-20 w-20 bg-teal-50 rounded-full flex items-center justify-center animate-pulse">
              <Fingerprint className="h-10 w-10 text-[#0F5D5D]" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-gray-900">Biometric Verification</h3>
              <p className="text-sm text-gray-500">
                Please verify your identity to {biometricAction === 'in' ? 'clock in' : 'clock out'}.
              </p>
            </div>

            <div className="w-full space-y-3 pt-4">
              <button
                onClick={handleBiometricVerify}
                className="w-full py-3.5 px-4 rounded-xl bg-[#0F5D5D] text-white font-bold hover:bg-[#0a4545] transition-colors shadow-lg shadow-teal-900/20 flex items-center justify-center gap-2"
              >
                <Fingerprint className="h-5 w-5" />
                <span>Scan Fingerprint</span>
              </button>

              <button
                onClick={() => setShowBiometricModal(false)}
                className="w-full py-3.5 px-4 rounded-xl border border-gray-200 font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Verification Modal */}
      <LocationVerificationModal
        isOpen={showLocationVerification}
        onVerify={handleLocationVerify}
      />

      <PermissionModal
        isOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        type="location"
        error={permissionError}
      />
    </div>
  );
}
