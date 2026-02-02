import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Search, Fingerprint, Loader2, Coffee, Calendar, Clock, MapPin } from 'lucide-react'
import MobileBottomNav from '@/components/dashboard/MobileBottomNav'
import PermissionModal from '@/components/common/PermissionModal'
import { apiClient } from '@/lib/api'
import { useToast } from '@/contexts/ToastContext'
import { permissionManager, type PermissionError, PermissionState } from '@/utils/PermissionManager'
import { format, subDays, startOfMonth, startOfDay, endOfDay, isSameDay } from 'date-fns'

interface AttendanceRecord {
  id: string
  date: string
  checkIn: string
  checkOut: string
  location: string
  status: string
  type: string
  duration: string
  breakDuration: string
}

interface CompanySettings {
  biometrics_required: boolean
  breaks_enabled: boolean
  [key: string]: any
}

export default function MobileAttendancePage() {
  const navigate = useNavigate()
  // const { hasRole } = useUser()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<'single' | 'multiple'>('single')
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([])
  const [todayStatus, setTodayStatus] = useState<any>(null)
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [loadingAction, setLoadingAction] = useState<'checkIn' | 'checkOut' | 'startBreak' | 'endBreak' | null>(null)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [permissionError, setPermissionError] = useState<PermissionError | undefined>()

  // Filter States
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [dateFilter, setDateFilter] = useState<'7days' | '30days' | 'month'>('7days')

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [activeTab, selectedDate, dateFilter])

  const fetchSettings = async () => {
    setSettingsLoading(true)
    try {
      // Fetch company settings
      const settingsRes = await apiClient.get('/api/company-settings')
      if (settingsRes.data.success) {
        setCompanySettings(settingsRes.data.data)
      }

      // Fetch today's status
      const statusRes = await apiClient.get('/api/attendance/status')
      if (statusRes.data.success) {
        setTodayStatus(statusRes.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setSettingsLoading(false)
    }
  }

  const fetchHistory = async () => {
    setHistoryLoading(true)
    try {
      // Calculate Date Range based on params
      let startDate: Date
      let endDate: Date

      if (activeTab === 'single') {
        startDate = startOfDay(selectedDate)
        endDate = endOfDay(selectedDate)
      } else {
        endDate = endOfDay(new Date())
        if (dateFilter === '7days') startDate = subDays(new Date(), 7)
        else if (dateFilter === '30days') startDate = subDays(new Date(), 30)
        else startDate = startOfMonth(new Date()) // month
      }

      const params = new URLSearchParams()
      params.append('startDate', startDate.toISOString())
      params.append('endDate', endDate.toISOString())

      // Fetch history
      const historyRes = await apiClient.get(`/api/attendance/history?${params.toString()}`)

      if (historyRes.data.success) {
        const mappedHistory = historyRes.data.data.map((record: any) => ({
          id: record.id,
          date: new Date(record.clock_in_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
          checkIn: new Date(record.clock_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          checkOut: record.clock_out_time ? new Date(record.clock_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
          status: record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : 'Absent',
          location: record.location_address || 'Office',
          type: record.location_type === 'remote' ? 'Remote' : 'Office',
          duration: record.duration_minutes ? `${Math.floor(record.duration_minutes / 60)}h ${record.duration_minutes % 60}m` : '-',
          breakDuration: record.total_break_minutes ? `${Math.floor(record.total_break_minutes)}m` : '0m'
        }))
        setAttendanceHistory(mappedHistory)
      }
    } catch (error) {
      console.error('Failed to fetch attendance history:', error)
      toast.error('Failed to load attendance history')
    } finally {
      setHistoryLoading(false)
    }
  }

  // Background location heartbeat for auto attendance
  useEffect(() => {
    let interval: number | undefined

    const sendHeartbeat = async () => {
      try {
        const perm = await permissionManager.checkLocationPermission()
        if (perm !== PermissionState.GRANTED) {
          return
        }

        const loc = await permissionManager.requestLocation({ timeout: 8000, retries: 0 })
        if (!loc.success) {
          return
        }

        await apiClient.post('/api/location/update', {
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          permissionState: perm
        })
      } catch {
        // Silently ignore heartbeat errors
      }
    }

    // Send immediately and then every minute
    sendHeartbeat()
    interval = window.setInterval(sendHeartbeat, 60_000)

    return () => {
      if (interval) window.clearInterval(interval)
    }
  }, [])

  const getBiometricProof = async (): Promise<string | null> => {
    if (!window.PublicKeyCredential) {
      toast.error('Biometrics not supported on this device')
      return null
    }

    try {
      // In a real implementation, we would fetch a challenge from the server
      // const options = await apiClient.post('/webauthn/authenticate/options', ...)

      // For now, we simulate the interaction to ensure user intent
      // We use a dummy challenge just to trigger the OS dialog
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const publicKey: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        userVerification: 'required', // This forces biometric prompt (e.g. TouchID/FaceID)
      };

      const credential = await navigator.credentials.get({ publicKey });

      if (!credential) return null;

      // We return a proof string. In a real flow, this would be the assertion.
      // Since the backend currently just checks truthiness, we send a base64 string of the ID.
      return btoa(credential.id);
    } catch (err: any) {
      console.error('Biometric error:', err)
      toast.error('Biometric verification failed')
      return null
    }
  }

  const handleCheckIn = async () => {
    setLoadingAction('checkIn')
    try {
      let biometricsProof: string | undefined

      if (companySettings?.biometrics_required) {
        const proof = await getBiometricProof()
        if (!proof) {
          setLoadingAction(null)
          return
        }
        biometricsProof = proof
      }

      // Get location using PermissionManager for robust error handling
      let location
      const locationResult = await permissionManager.requestLocation({
        timeout: 15000,
        retries: 2
      })

      if (locationResult.success) {
        location = {
          latitude: locationResult.latitude!,
          longitude: locationResult.longitude!
        }
      } else if (locationResult.error) {
        // Show permission modal if permission was denied
        if (locationResult.error.needsManualEnable) {
          setPermissionError(locationResult.error)
          setShowPermissionModal(true)
          setLoadingAction(null)
          return
        }
        // For other errors (timeout, unavailable), show toast but allow proceeding
        toast.warning(locationResult.error.userMessage)
      }

      const res = await apiClient.post('/api/attendance/check-in', {
        location,
        biometricsProof
      })

      if (res.data.success) {
        toast.success(res.data.message)
        setTodayStatus((prev: any) => ({
          ...(prev || {}),
          isClockedIn: true,
          status: res.data.data?.status || 'present',
          clockInTime: res.data.data?.clockInTime || new Date().toISOString(),
          clockOutTime: null
        }))
        await fetchSettings()
        await fetchHistory()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Check-in failed')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleCheckOut = async () => {
    setLoadingAction('checkOut')
    try {
      // We need the current attendance ID for check-out
      const currentRes = await apiClient.get('/api/attendance/current')
      if (!currentRes.data.success || !currentRes.data.data) {
        toast.error('No active attendance found')
        setLoadingAction(null)
        return
      }

      const attendanceId = currentRes.data.data.id
      let biometricsProof: string | undefined

      if (companySettings?.biometrics_required) {
        const proof = await getBiometricProof()
        if (!proof) {
          setLoadingAction(null)
          return
        }
        biometricsProof = proof
      }

      // Get location using PermissionManager
      let location
      const locationResult = await permissionManager.requestLocation({
        timeout: 15000,
        retries: 2
      })

      if (locationResult.success) {
        location = {
          latitude: locationResult.latitude!,
          longitude: locationResult.longitude!
        }
      } else if (locationResult.error) {
        // Show permission modal if permission  was denied
        if (locationResult.error.needsManualEnable) {
          setPermissionError(locationResult.error)
          setShowPermissionModal(true)
          setLoadingAction(null)
          return
        }
        // For other errors, show toast but allow proceeding
        toast.warning(locationResult.error.userMessage)
      }

      const res = await apiClient.post('/api/attendance/check-out', {
        attendanceId,
        location,
        biometricsProof
      })

      if (res.data.success) {
        toast.success(res.data.message)
        setTodayStatus((prev: any) => ({
          ...(prev || {}),
          isClockedIn: false,
          status: res.data.data?.status || 'present',
          clockOutTime: res.data.data?.clockOutTime || new Date().toISOString()
        }))
        await fetchSettings()
        await fetchHistory()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Check-out failed')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleStartBreak = async () => {
    setLoadingAction('startBreak')
    try {
      const res = await apiClient.post('/api/attendance/break/start', {})
      if (res.data.success) {
        toast.success(res.data.message)
        fetchSettings()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start break')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleEndBreak = async () => {
    setLoadingAction('endBreak')
    try {
      const res = await apiClient.post('/api/attendance/break/end', {})
      if (res.data.success) {
        toast.success(res.data.message)
        fetchSettings()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to end break')
    } finally {
      setLoadingAction(null)
    }
  }

  if (settingsLoading && !todayStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F8F8]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F5D5D]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F6F8F8] pb-24">
      {/* Header */}
      <div className="bg-white px-4 pt-8 pb-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full active:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-[#1F2937]" />
          </button>
          <h1 className="text-lg font-bold text-[#1F2937]">Attendance</h1>
          <button className="p-2 -mr-2 rounded-full active:bg-gray-100 transition-colors">
            <Search className="w-6 h-6 text-[#1F2937]" />
          </button>
        </div>

        {/* Action Area */}
        <div className="mb-4 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#0F5D5D] to-[#0a3f3f] rounded-2xl shadow-lg text-white">
          <div className="text-center mb-3">
            <p className="text-xs opacity-80 mb-0.5">{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <h2 className="text-2xl font-bold">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h2>
          </div>

          {todayStatus?.isClockedIn ? (
            <button
              onClick={handleCheckOut}
              disabled={loadingAction !== null}
              className="w-full py-2.5 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loadingAction === 'checkOut' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />}
              <span>Check Out</span>
            </button>
          ) : (
            <button
              onClick={handleCheckIn}
              disabled={loadingAction !== null}
              className="w-full py-2.5 bg-white text-[#0F5D5D] font-bold rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 active:bg-gray-100 disabled:opacity-50"
            >
              {loadingAction === 'checkIn' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />}
              <span>Check In</span>
            </button>
          )}

          {todayStatus?.isClockedIn && companySettings?.breaks_enabled && (
            <div className="mt-2 w-full">
              {todayStatus?.status === 'on_break' ? (
                <button
                  onClick={handleEndBreak}
                  disabled={loadingAction !== null}
                  className="w-full py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {loadingAction === 'endBreak' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coffee className="w-4 h-4" />}
                  <span className="text-sm">End Break</span>
                </button>
              ) : (
                <button
                  onClick={handleStartBreak}
                  disabled={loadingAction !== null}
                  className="w-full py-2 bg-[#E8F5E9] text-[#1B5E20] hover:bg-[#C8E6C9] font-bold rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {loadingAction === 'startBreak' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coffee className="w-4 h-4" />}
                  <span className="text-sm">Start Break</span>
                </button>
              )}
            </div>
          )}

          {companySettings?.biometrics_required && (
            <p className="mt-2 text-xs opacity-70 flex items-center">
              <Fingerprint className="w-3 h-3 mr-1" />
              Biometric verification required
            </p>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-[#E8F5E9] rounded-2xl p-3 flex flex-col items-center justify-center space-y-1">
            <span className="text-2xl font-bold text-[#1B5E20]">
              {attendanceHistory.filter(r => r.status === 'Present').length}
            </span>
            <span className="text-[10px] font-medium text-[#2E7D32]">Present</span>
          </div>
          <div className="bg-[#FFF3E0] rounded-2xl p-3 flex flex-col items-center justify-center space-y-1">
            <span className="text-2xl font-bold text-[#E65100]">
              {attendanceHistory.filter(r => r.status === 'Late').length}
            </span>
            <span className="text-[10px] font-medium text-[#EF6C00]">Late</span>
          </div>
          <div className="bg-[#FFEBEE] rounded-2xl p-3 flex flex-col items-center justify-center space-y-1">
            <span className="text-2xl font-bold text-[#C62828]">
              {attendanceHistory.filter(r => r.status === 'Absent').length}
            </span>
            <span className="text-[10px] font-medium text-[#D32F2F]">Absent</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-[#F3F4F6] rounded-xl relative">
          <button
            onClick={() => setActiveTab('single')}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 z-10 ${activeTab === 'single'
              ? 'bg-white text-[#0F5D5D] shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Single Attendance
          </button>
          <button
            onClick={() => setActiveTab('multiple')}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 z-10 ${activeTab === 'multiple'
              ? 'bg-white text-[#0F5D5D] shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Multiple Attendance
          </button>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="px-6 mb-4">
        {activeTab === 'single' ? (
          <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
            <button
              onClick={() => setSelectedDate(d => subDays(d, 1))}
              className="p-2 hover:bg-gray-50 rounded-lg text-gray-500"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#0F5D5D]" />
              <span className="font-semibold text-gray-700">{format(selectedDate, 'EEE, MMM d, yyyy')}</span>
            </div>
            <button
              onClick={() => setSelectedDate(d => new Date(d.setDate(d.getDate() + 1)))}
              disabled={isSameDay(selectedDate, new Date())}
              className={`p-2 rounded-lg text-gray-500 ${isSameDay(selectedDate, new Date()) ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-50'}`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {[
              { id: '7days', label: 'Last 7 Days' },
              { id: '30days', label: 'Last 30 Days' },
              { id: 'month', label: 'This Month' }
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setDateFilter(filter.id as any)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition-all ${dateFilter === filter.id
                  ? 'bg-[#0F5D5D] text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200'
                  }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List Content */}
      <div className="px-6 pb-4 space-y-3">
        {historyLoading ? (
          <div className="text-center py-10 bg-white rounded-2xl">
            <Loader2 className="w-6 h-6 animate-spin text-[#0F5D5D] mx-auto" />
            <p className="text-sm text-gray-500 mt-2">Loading attendance...</p>
          </div>
        ) : attendanceHistory.length > 0 ? (
          attendanceHistory.map((record) => (
            <div key={record.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-900">{record.date}</span>
                  <span className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {record.type}
                  </span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${record.status === 'Present' ? 'bg-green-50 text-green-700' :
                  record.status === 'Late' ? 'bg-orange-50 text-orange-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                  {record.status}
                </span>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 block mb-1">Check In</span>
                  <span className="text-sm font-bold text-gray-900 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#0F5D5D]" />
                    {record.checkIn}
                  </span>
                </div>
                <div className="h-8 w-px bg-gray-200 mx-2"></div>
                <div>
                  <span className="text-[10px] text-gray-400 block mb-1">Check Out</span>
                  <span className="text-sm font-bold text-gray-900">
                    {record.checkOut}
                  </span>
                </div>
                <div className="h-8 w-px bg-gray-200 mx-1"></div>
                <div>
                  <span className="text-[10px] text-gray-400 block mb-1">Break</span>
                  <span className="text-xs font-bold text-orange-600">
                    {record.breakDuration}
                  </span>
                </div>
                <div className="h-8 w-px bg-gray-200 mx-1"></div>
                <div>
                  <span className="text-[10px] text-gray-400 block mb-1">Duration</span>
                  <span className="text-xs font-bold text-gray-700">
                    {record.duration}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
            <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm font-medium">No records found</p>
            <p className="text-xs text-gray-400 mt-1">Try changing the filter date</p>
          </div>
        )}
      </div>

      {/* Permission Modal */}
      <PermissionModal
        isOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        type="location"
        error={permissionError}
        allowSkip={true}
        onSkip={() => {
          toast.info('You can clock in/out without location, but it may be required by your company.')
        }}
      />

      {/* Mobile Bottom Nav */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  )
}
