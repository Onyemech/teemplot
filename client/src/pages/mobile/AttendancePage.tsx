import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Search, Fingerprint, Loader2 } from 'lucide-react'
import MobileBottomNav from '@/components/dashboard/MobileBottomNav'
import { apiClient } from '@/lib/api'
import { useToast } from '@/contexts/ToastContext'
// import { useUser } from '@/contexts/UserContext'

interface AttendanceRecord {
  id: string
  date: string
  checkIn: string
  checkOut: string
  status: 'Present' | 'Late' | 'Absent' | 'Leave'
  location: string
  type: 'Office' | 'Remote'
}

interface CompanySettings {
  biometrics_required: boolean
  [key: string]: any
}

export default function MobileAttendancePage() {
  const navigate = useNavigate()
  // const { hasRole } = useUser()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<'single' | 'multiple'>('single')
  const [loading, setLoading] = useState(true)
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([])
  const [todayStatus, setTodayStatus] = useState<any>(null)
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
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

      // Fetch history (mock for now or use actual endpoint if available)
      // The history endpoint exists: /attendance/history
      const historyRes = await apiClient.get('/api/attendance/history')
      if (historyRes.data.success) {
         // Map backend history to frontend model
         const mappedHistory = historyRes.data.data.map((record: any) => ({
            id: record.id,
            date: new Date(record.clock_in_time).toLocaleDateString(),
            checkIn: new Date(record.clock_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            checkOut: record.clock_out_time ? new Date(record.clock_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
            status: record.status.charAt(0).toUpperCase() + record.status.slice(1),
            location: 'Office', // Placeholder or derive from record
            type: 'Office'
         }))
         setAttendanceHistory(mappedHistory)
      }

    } catch (error) {
      console.error('Failed to fetch attendance data:', error)
      toast.error('Failed to load attendance data')
    } finally {
      setLoading(false)
    }
  }

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
    setProcessing(true)
    try {
      let biometricsProof: string | undefined

      if (companySettings?.biometrics_required) {
        const proof = await getBiometricProof()
        if (!proof) {
          setProcessing(false)
          return
        }
        biometricsProof = proof
      }

      // Get location if possible
      let location
      if ('geolocation' in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
          })
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        } catch (e) {
          console.warn('Location fetch failed', e)
        }
      }

      const res = await apiClient.post('/api/attendance/check-in', {
        location,
        biometricsProof
      })

      if (res.data.success) {
        toast.success(res.data.message)
        fetchData() // Refresh
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Check-in failed')
    } finally {
      setProcessing(false)
    }
  }

  const handleCheckOut = async () => {
    setProcessing(true)
    try {
        // We need the current attendance ID for check-out
        const currentRes = await apiClient.get('/api/attendance/current')
        if (!currentRes.data.success || !currentRes.data.data) {
            toast.error('No active attendance found')
            setProcessing(false)
            return
        }
        
        const attendanceId = currentRes.data.data.id
        let biometricsProof: string | undefined

        if (companySettings?.biometrics_required) {
            const proof = await getBiometricProof()
            if (!proof) {
            setProcessing(false)
            return
            }
            biometricsProof = proof
        }

        // Get location if possible
        let location
        if ('geolocation' in navigator) {
            try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
            })
            location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            }
            } catch (e) {
            console.warn('Location fetch failed', e)
            }
        }

        const res = await apiClient.post('/api/attendance/check-out', {
            attendanceId,
            location,
            biometricsProof
        })

        if (res.data.success) {
            toast.success(res.data.message)
            fetchData() // Refresh
        }
    } catch (error: any) {
        toast.error(error.response?.data?.message || 'Check-out failed')
    } finally {
        setProcessing(false)
    }
  }

  if (loading && !todayStatus) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-[#F6F8F8]">
              <Loader2 className="w-8 h-8 animate-spin text-[#0F5D5D]" />
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-[#F6F8F8] pb-24">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-6">
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
        <div className="mb-6 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#0F5D5D] to-[#0a3f3f] rounded-2xl shadow-lg text-white">
            <div className="text-center mb-4">
                <p className="text-sm opacity-80 mb-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                <h2 className="text-3xl font-bold">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h2>
            </div>
            
            {todayStatus?.isClockedIn ? (
                <button
                    onClick={handleCheckOut}
                    disabled={processing}
                    className="w-full py-3 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center space-x-2"
                >
                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />}
                    <span>Check Out</span>
                </button>
            ) : (
                <button
                    onClick={handleCheckIn}
                    disabled={processing}
                    className="w-full py-3 bg-white text-[#0F5D5D] font-bold rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 active:bg-gray-100"
                >
                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />}
                    <span>Check In</span>
                </button>
            )}
            
            {companySettings?.biometrics_required && (
                <p className="mt-3 text-xs opacity-70 flex items-center">
                    <Fingerprint className="w-3 h-3 mr-1" />
                    Biometric verification required
                </p>
            )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#E8F5E9] rounded-2xl p-4 flex flex-col items-center justify-center space-y-1">
            <span className="text-2xl font-bold text-[#1B5E20]">
                {attendanceHistory.filter(r => r.status === 'Present').length}
            </span>
            <span className="text-[10px] font-medium text-[#2E7D32]">Present</span>
          </div>
          <div className="bg-[#FFF3E0] rounded-2xl p-4 flex flex-col items-center justify-center space-y-1">
            <span className="text-2xl font-bold text-[#E65100]">
                {attendanceHistory.filter(r => r.status === 'Late').length}
            </span>
            <span className="text-[10px] font-medium text-[#EF6C00]">Late</span>
          </div>
          <div className="bg-[#FFEBEE] rounded-2xl p-4 flex flex-col items-center justify-center space-y-1">
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
            className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 z-10 ${
              activeTab === 'single' 
                ? 'bg-white text-[#0F5D5D] shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Single Attendance
          </button>
          <button
            onClick={() => setActiveTab('multiple')}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 z-10 ${
              activeTab === 'multiple' 
                ? 'bg-white text-[#0F5D5D] shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Multiple Attendance
          </button>
        </div>
      </div>

      {/* List Content */}
      <div className="px-6 py-4 space-y-4">
        {attendanceHistory.map((record) => (
          <div key={record.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-semibold text-gray-500">{record.date}</span>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                record.status === 'Present' ? 'bg-[#E8F5E9] text-[#1B5E20]' :
                record.status === 'Late' ? 'bg-[#FFF3E0] text-[#E65100]' :
                'bg-[#FFEBEE] text-[#C62828]'
              }`}>
                {record.status}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-bold text-gray-900">{record.checkIn}</span>
                  <span className="text-xs text-gray-400">-</span>
                  <span className="text-sm font-bold text-gray-900">{record.checkOut}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    record.type === 'Office' ? 'bg-[#0F5D5D]' : 'bg-blue-500'
                  }`} />
                  <span className="text-[10px] font-medium text-gray-500">{record.type} • {record.location}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {attendanceHistory.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
                No attendance records found
            </div>
        )}
      </div>
      
      {/* Mobile Bottom Nav */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  )
}
