import { useEffect, useState } from 'react'
import { 
  Download,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  Zap,
  X,
  Clock as ClockIcon
} from 'lucide-react'
import { useFeatureAccess } from '@/hooks/useFeatureAccess'
import { format } from 'date-fns'
import InviteEmployeeCard from '@/components/dashboard/InviteEmployeeCard'
import AttendanceSetupPrompt from '@/components/dashboard/AttendanceSetupPrompt'
import { useUser } from '@/contexts/UserContext'
import { apiClient } from '@/lib/api'

interface AttendanceStats {
  totalEmployees: number
  totalClockIn: number
  earlyClockIn: number
  lateClockIn: number
  absent: number
  earlyDeparture: number
  onLeave: number
}

interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  employeeAvatar?: string
  department: string
  clockInTime: string | null
  clockOutTime: string | null
  duration: string
  status: 'present' | 'late_arrival' | 'early_departure' | 'on_leave' | 'absent'
  location: 'onsite' | 'remote' | null
}

// Sample data matching the verification checklist exactly
const SAMPLE_DATA: AttendanceRecord[] = [
  {
    id: '1',
    employeeId: '1',
    employeeName: 'Daniel Osonuga',
    department: 'Product Design',
    clockInTime: '07:45 am',
    clockOutTime: '05:45 pm',
    duration: '10 hours',
    status: 'present',
    location: 'onsite'
  },
  {
    id: '2',
    employeeId: '2',
    employeeName: 'Abimbola Malik',
    department: 'Business & Marketing',
    clockInTime: '09:02 am',
    clockOutTime: '03:45 pm',
    duration: '10 hours',
    status: 'early_departure',
    location: 'onsite'
  },
  {
    id: '3',
    employeeId: '3',
    employeeName: 'Ben Olewuezi',
    department: 'Risk Enterprise',
    clockInTime: null,
    clockOutTime: null,
    duration: '--',
    status: 'on_leave',
    location: null
  },
  {
    id: '4',
    employeeId: '4',
    employeeName: 'Titilayo Akande',
    department: 'Solutions Delivery',
    clockInTime: '07:45 am',
    clockOutTime: '05:45 pm',
    duration: '10 hours',
    status: 'present',
    location: 'remote'
  },
  {
    id: '5',
    employeeId: '5',
    employeeName: 'Nonso Ibidun',
    department: 'Customer Experience',
    clockInTime: '07:45 am',
    clockOutTime: '04:45 pm',
    duration: '10 hours',
    status: 'early_departure',
    location: 'onsite'
  },
  {
    id: '6',
    employeeId: '6',
    employeeName: 'Chucks Ebinum',
    department: 'Software Testing',
    clockInTime: null,
    clockOutTime: null,
    duration: '--',
    status: 'absent',
    location: null
  },
  {
    id: '7',
    employeeId: '7',
    employeeName: 'Nike Adesanoye',
    department: 'Human Resources',
    clockInTime: '07:45 am',
    clockOutTime: '05:45 pm',
    duration: '10 hours',
    status: 'present',
    location: 'remote'
  },
  {
    id: '8',
    employeeId: '8',
    employeeName: 'Tokunbo Oyenubi',
    department: 'Product Management',
    clockInTime: '08:58 am',
    clockOutTime: '05:45 pm',
    duration: '10 hours',
    status: 'late_arrival',
    location: 'onsite'
  },
  {
    id: '9',
    employeeId: '9',
    employeeName: 'Steven Oyebode',
    department: 'Product Design',
    clockInTime: '07:45 am',
    clockOutTime: '05:45 pm',
    duration: '10 hours',
    status: 'present',
    location: 'onsite'
  },
  {
    id: '10',
    employeeId: '10',
    employeeName: 'Mariam Lawal',
    department: 'Software Testing',
    clockInTime: null,
    clockOutTime: null,
    duration: '--',
    status: 'absent',
    location: null
  }
]

export default function AttendanceOverviewPage() {
  const { hasAccess } = useFeatureAccess()
  const { user } = useUser()
  const [selectedDate] = useState(new Date(2025, 2, 10)) // March 10, 2025 - Monday
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [, setAttendanceSetupCompleted] = useState(false)
  const [showSetupPrompt, setShowSetupPrompt] = useState(false)
  const recordsPerPage = 10

  // Use sample data for now - will be replaced with real API calls
  const records = SAMPLE_DATA
  const stats: AttendanceStats = {
    totalEmployees: 10,
    totalClockIn: 8,
    earlyClockIn: 6,
    lateClockIn: 2,
    absent: 2,
    earlyDeparture: 1,
    onLeave: 1
  }

  const loading = false

  useEffect(() => {
    if (!hasAccess('attendance')) {
      // Don't redirect - let FeatureGate handle this
      return
    }
    checkAttendanceSetup()
  }, [])

  const checkAttendanceSetup = async () => {
    try {
      const response = await apiClient.get('/api/company-settings/attendance-setup-status')
      if (response.data.success) {
        const isCompleted = response.data.data.attendanceSetupCompleted
        setAttendanceSetupCompleted(isCompleted)
        
        // Show setup prompt for new users (admins/owners only)
        if (!isCompleted && (user?.role === 'admin' || user?.role === 'owner')) {
          setShowSetupPrompt(true)
        }
      }
    } catch (error) {
      console.error('Failed to check attendance setup status:', error)
      // For new companies, assume setup is not completed
      if (user?.role === 'admin' || user?.role === 'owner') {
        setShowSetupPrompt(true)
      }
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      present: { 
        bg: 'bg-success/20', 
        text: 'text-success', 
        label: 'Present', 
        icon: <Check className="w-3 h-3" /> 
      },
      late_arrival: { 
        bg: 'bg-warning/20', 
        text: 'text-warning', 
        label: 'Late Arrival', 
        icon: <ClockIcon className="w-3 h-3" /> 
      },
      early_departure: { 
        bg: 'bg-info/20', 
        text: 'text-info', 
        label: 'Early Departure', 
        icon: <Zap className="w-3 h-3" /> 
      },
      on_leave: { 
        bg: 'bg-warning/20', 
        text: 'text-warning', 
        label: 'On Leave', 
        icon: <span className="text-xs">🍃</span>
      },
      absent: { 
        bg: 'bg-error/20', 
        text: 'text-error', 
        label: 'Absent', 
        icon: <X className="w-3 h-3" /> 
      }
    }
    const badge = badges[status as keyof typeof badges] || badges.absent
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.icon}
        {badge.label}
      </span>
    )
  }

  const filteredRecords = records.filter(record =>
    record.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.department.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage)
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  )



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Setup Prompt for New Users */}
      {showSetupPrompt && (
        <AttendanceSetupPrompt onDismiss={() => setShowSetupPrompt(false)} />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Attendance Overview</h1>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-gray-600 min-w-[200px] text-center font-medium">
              {format(selectedDate, 'EEEE, MMM dd, yyyy')}
            </span>
            <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Invite Employee Button */}
          <InviteEmployeeCard 
            variant="compact"
            className="w-full sm:w-auto justify-center"
          />
        </div>
      </div>

      {/* Stats Cards - Properly balanced grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
        <StatCard label="Total Employees" value={stats.totalEmployees} />
        <StatCard label="Total Clock in" value={stats.totalClockIn} />
        <StatCard label="Early Clock in" value={stats.earlyClockIn} />
        <StatCard label="Late Clock in" value={stats.lateClockIn} />
        <StatCard label="Absent" value={stats.absent} />
        <StatCard label="Early Departure" value={stats.earlyDeparture} />
        <StatCard label="Leave" value={stats.onLeave} />
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Table Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">All Attendance</h2>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 pl-9 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                />
              </div>

              {/* Filter & Export */}
              <div className="flex gap-3">
                <button className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200">
                  <Filter className="w-4 h-4" />
                  <span>Filter</span>
                </button>
                <button className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200">
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>
        </div>

          {/* Table Content - Horizontal scroll on mobile */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input type="checkbox" className="rounded border-gray-300" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clock-in Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clock-out Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500 text-sm">
                      No attendance records found
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((record, index) => (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input type="checkbox" className="rounded border-gray-300" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-500 mr-3">{index + 1}.</span>
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {record.employeeName.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {record.employeeName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{record.department}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${
                          record.status === 'late_arrival' ? 'text-red-600 font-medium' : 'text-gray-900'
                        }`}>
                          {record.clockInTime || '--:--'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${
                          record.status === 'early_departure' ? 'text-red-600 font-medium' : 'text-gray-900'
                        }`}>
                          {record.clockOutTime || '--:--'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{record.duration}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(record.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {record.location ? (record.location === 'onsite' ? 'Onsite' : 'Remote') : '--'}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
          </table>
        </div>

          {/* Footer with Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {filteredRecords.length} records
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 hover:bg-gray-100 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <span className="text-sm text-gray-600 px-3">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 hover:bg-gray-100 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

// StatCard Component - Following design system rules
interface StatCardProps {
  label: string
  value: number
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
      <div className="text-sm text-gray-600 mb-2">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  )
}