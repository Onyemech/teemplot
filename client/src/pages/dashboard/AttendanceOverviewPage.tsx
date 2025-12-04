import { useEffect, useState } from 'react'
import { 
  Download,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Check,
  Zap,
  X,
  Clock as ClockIcon
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useFeatureAccess } from '@/hooks/useFeatureAccess'
import { format } from 'date-fns'

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
  const navigate = useNavigate()
  const { hasAccess } = useFeatureAccess()
  const [selectedDate] = useState(new Date(2025, 2, 10)) // March 10, 2025 - Monday
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
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
      navigate('/dashboard')
      return
    }
  }, [])

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
    <div className="h-full bg-background p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Attendance Overview</h1>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-muted rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
            </button>
            <span className="text-sm md:text-base text-muted-foreground min-w-[160px] md:min-w-[200px] text-center">
              {format(selectedDate, 'EEE, MMM dd, yyyy')}
            </span>
            <button className="p-2 hover:bg-muted rounded-lg transition-colors">
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Invite Employee Button */}
          <button
            onClick={() => navigate('/dashboard/employees')}
            className="bg-primary hover:bg-primary-dark text-primary-foreground px-3 md:px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors text-sm md:text-base w-full sm:w-auto justify-center"
          >
            <UserPlus className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">Invite Employee</span>
            <span className="sm:hidden">Invite</span>
          </button>
        </div>
      </div>

      {/* Stats Cards - Horizontal Scroll on Mobile, Grid on Desktop */}
      <div className="grid grid-cols-2 md:flex gap-3 md:gap-4 mb-6 md:overflow-x-auto">
        <StatCard label="Total Employees" value={stats.totalEmployees} />
        <StatCard label="Total Clock in" value={stats.totalClockIn} />
        <StatCard label="Early Clock in" value={stats.earlyClockIn} />
        <StatCard label="Late Clock in" value={stats.lateClockIn} />
        <StatCard label="Absent" value={stats.absent} />
        <StatCard label="Early Departure" value={stats.earlyDeparture} />
        <StatCard label="Leave" value={stats.onLeave} />
      </div>

      {/* Attendance Table */}
      <div className="bg-card rounded-md border shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="p-4 md:p-6 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-base md:text-lg font-semibold text-foreground">All Attendance</h2>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3">
              {/* Search */}
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-48 md:w-64 pl-9 pr-4 py-2 border border-input rounded-md text-sm focus:ring-2 focus:ring-ring focus:border-transparent bg-background"
                />
              </div>

              {/* Filter & Export */}
              <div className="flex gap-2">
                <button className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2 border rounded-md hover:bg-muted transition-colors text-sm">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="hidden sm:inline">Filter</span>
                </button>
                <button className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2 border rounded-md hover:bg-muted transition-colors text-sm">
                  <Download className="w-4 h-4 text-muted-foreground" />
                  <span className="hidden sm:inline">Download</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table Content - Horizontal scroll on mobile */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-muted border-b">
              <tr>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <input type="checkbox" className="rounded border-input" />
                </th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Employee Name
                </th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Department
                </th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Clock-in
                </th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Clock-out
                </th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Location
                </th>
              </tr>
            </thead>
            <tbody className="bg-background divide-y divide-border">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 md:px-6 py-12 text-center text-muted-foreground text-sm">
                    No attendance records found
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record, index) => (
                  <tr key={record.id} className={`hover:bg-muted/50 transition-colors ${index % 2 === 1 ? 'bg-background/50' : ''}`}>
                    <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                      <input type="checkbox" className="rounded border-input" />
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm text-muted-foreground mr-3">{index + 1}.</span>
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {record.employeeName.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-bold text-foreground">
                            {record.employeeName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">{record.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${
                        record.status === 'late_arrival' ? 'text-error font-medium' : 'text-foreground'
                      }`}>
                        {record.clockInTime || '--:--'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${
                        record.status === 'early_departure' ? 'text-error font-medium' : 'text-foreground'
                      }`}>
                        {record.clockOutTime || '--:--'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">{record.duration}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(record.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-muted-foreground">
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
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {filteredRecords.length} records
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1 hover:bg-muted rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1 hover:bg-muted rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// StatCard Component - Minimal design matching verification checklist
interface StatCardProps {
  label: string
  value: number
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="bg-card rounded-md p-4 border shadow-sm min-w-[140px]">
      <div className="text-sm text-muted-foreground mb-1">{label}</div>
      <div className="text-3xl font-bold text-foreground">{value}</div>
    </div>
  )
}