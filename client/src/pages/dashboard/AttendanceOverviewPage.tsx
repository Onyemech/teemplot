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
  Clock as ClockIcon,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useFeatureAccess } from '@/hooks/useFeatureAccess'
import { useUser } from '@/contexts/UserContext'
import { format } from 'date-fns'
import MobileAttendancePage from '../mobile/AttendancePage'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import StatCard from '@/components/dashboard/StatCard'
import AttendanceDonutChart from '@/components/dashboard/AttendanceDonutChart'
import { apiClient } from '@/lib/api'

interface AttendanceStats {
  totalEmployees: number
  totalClockIn: number
  earlyClockIn: number
  lateClockIn: number
  absent: number
  earlyDeparture: number
  onLeave: number
  presentToday: number
  lateToday: number
  absentToday: number
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
  date: string
  // Additional details for expanded view
  device?: string
  ipAddress?: string
  workHours?: string
  overtime?: string
  lateBy?: string
}

export default function AttendanceOverviewPage() {
  const navigate = useNavigate()
  const { user } = useUser()
  const { hasAccess } = useFeatureAccess()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage] = useState(10)
  const [loading, setLoading] = useState(true)
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  // Data State
  const [stats, setStats] = useState<AttendanceStats>({
    totalEmployees: 0,
    totalClockIn: 0,
    earlyClockIn: 0,
    lateClockIn: 0,
    absent: 0,
    earlyDeparture: 0,
    onLeave: 0,
    presentToday: 0,
    lateToday: 0,
    absentToday: 0
  })
  const [records, setRecords] = useState<AttendanceRecord[]>([])

  // Download Modal State
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [downloadPeriod, setDownloadPeriod] = useState('This Week')
  const [downloadFormat, setDownloadFormat] = useState<'csv' | 'pdf'>('csv')
  const [isDownloading, setIsDownloading] = useState(false)

  // Filter State
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [filterDepartment, setFilterDepartment] = useState('All Departments')
  const [filterPeriod, setFilterPeriod] = useState('Today')

  useEffect(() => {
    if (!hasAccess('attendance')) {
      navigate('/dashboard')
      return
    }
    fetchData()
  }, [selectedDate, filterPeriod])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch Dashboard Stats
      const statsRes = await apiClient.get('/api/dashboard/stats')
      if (statsRes.data.success) {
        const d = statsRes.data.data
        setStats({
          totalEmployees: d.employeeStats?.total || 0,
          totalClockIn: d.attendanceStats?.presentToday || 0,
          earlyClockIn: 0, // Not currently provided by API
          lateClockIn: d.attendanceStats?.lateToday || 0,
          absent: d.attendanceStats?.absentToday || 0,
          earlyDeparture: 0, // Not currently provided
          onLeave: 0, // Not currently provided
          presentToday: d.attendanceStats?.presentToday || 0,
          lateToday: d.attendanceStats?.lateToday || 0,
          absentToday: d.attendanceStats?.absentToday || 0,
        })
      }

      // Fetch Attendance Records
      // In a real scenario, we would pass query params for date/filter
      const recordsRes = await apiClient.get('/api/attendance')
      if (recordsRes.data.success) {
        // Transform API data to frontend model
        const mappedRecords: AttendanceRecord[] = recordsRes.data.data.map((r: any) => ({
          id: r.id,
          employeeId: r.user_id,
          employeeName: `${r.user?.first_name || 'Unknown'} ${r.user?.last_name || ''}`,
          department: r.user?.department || 'General',
          clockInTime: r.clock_in ? format(new Date(r.clock_in), 'hh:mm a') : null,
          clockOutTime: r.clock_out ? format(new Date(r.clock_out), 'hh:mm a') : null,
          duration: r.duration_minutes ? `${Math.floor(r.duration_minutes / 60)}h ${r.duration_minutes % 60}m` : '--',
          status: r.status === 'late' ? 'late_arrival' : (r.status || 'absent'),
          location: r.location_type || 'onsite',
          date: r.date,
          device: r.device_info?.userAgent || 'Unknown Device',
          ipAddress: r.ip_address || 'Unknown IP',
          workHours: '9:00 AM - 5:00 PM', // Placeholder or from settings
          overtime: r.overtime_minutes ? `${Math.floor(r.overtime_minutes / 60)}h ${r.overtime_minutes % 60}m` : '0h 0m',
          lateBy: r.late_minutes ? `${r.late_minutes} mins` : '0 mins'
        }))
        setRecords(mappedRecords)
      }

    } catch (error) {
      console.error('Failed to fetch attendance data:', error)
    } finally {
      setLoading(false)
    }
  }

  // If user is an employee, show their personal attendance page
  if (user?.role === 'employee') {
    return <MobileAttendancePage />
  }

  const uniqueDepartments = ['All Departments', ...new Set(records.map(r => r.department))]

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.department.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesDepartment = 
      filterDepartment === 'All Departments' || 
      record.department === filterDepartment

    return matchesSearch && matchesDepartment
  })

  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage)
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  )

  const toggleRow = (id: string) => {
    if (expandedRowId === id) {
      setExpandedRowId(null)
    } else {
      setExpandedRowId(id)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      present: { 
        bg: 'bg-green-100', 
        text: 'text-green-700', 
        label: 'Present', 
        icon: <Check className="w-3 h-3" /> 
      },
      late_arrival: { 
        bg: 'bg-orange-100', 
        text: 'text-orange-700', 
        label: 'Late Arrival', 
        icon: <ClockIcon className="w-3 h-3" /> 
      },
      early_departure: { 
        bg: 'bg-blue-100', 
        text: 'text-blue-700', 
        label: 'Early Departure', 
        icon: <Zap className="w-3 h-3" /> 
      },
      on_leave: { 
        bg: 'bg-purple-100', 
        text: 'text-purple-700', 
        label: 'On Leave', 
        icon: <Calendar className="w-3 h-3" />
      },
      absent: { 
        bg: 'bg-red-100', 
        text: 'text-red-700', 
        label: 'Absent', 
        icon: <X className="w-3 h-3" /> 
      }
    }
    const badge = badges[status as keyof typeof badges] || badges.absent
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {badge.icon}
        {badge.label}
      </span>
    )
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    await new Promise(resolve => setTimeout(resolve, 1500)) // Simulating
    setIsDownloading(false)
    setIsDownloadModalOpen(false)
    setIsSuccessModalOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F5D5D]"></div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-50 p-3 md:p-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Overview</h1>
          <p className="text-sm text-gray-500">Track and manage employee attendance</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Date Navigation */}
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
            <button className="p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-500" />
            </button>
            <span className="text-sm md:text-base text-gray-700 font-medium min-w-[140px] text-center">
              {format(selectedDate, 'EEE, MMM dd, yyyy')}
            </span>
            <button className="p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-gray-500" />
            </button>
          </div>

          <button
            onClick={() => navigate('/dashboard/employees')}
            className="w-full sm:w-auto bg-[#0F5D5D] hover:bg-[#0a4545] text-white px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Employee</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Charts + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left: Donut Chart */}
        <div className="lg:col-span-1">
          <AttendanceDonutChart 
            present={stats.presentToday}
            late={stats.lateToday}
            absent={stats.absentToday}
            onLeave={stats.onLeave}
          />
        </div>

        {/* Right: Stats Cards */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3 h-fit">
          <StatCard 
            label="Total Employees" 
            value={stats.totalEmployees} 
            icon={Users}
            iconColorClass="text-[#0F5D5D]"
          />
          <StatCard 
            label="Present Today" 
            value={stats.presentToday} 
            icon={CheckCircle}
            iconColorClass="text-green-600"
          />
          <StatCard 
            label="Late Arrival" 
            value={stats.lateToday} 
            icon={ClockIcon}
            iconColorClass="text-orange-600"
          />
          <StatCard 
            label="Absent" 
            value={stats.absentToday} 
            icon={X}
            iconColorClass="text-red-600"
          />
          <StatCard 
            label="On Leave" 
            value={stats.onLeave} 
            icon={Calendar}
            iconColorClass="text-purple-600"
          />
           <StatCard 
            label="Avg. Work Hours" 
            value="8h 12m" 
            icon={ClockIcon}
            iconColorClass="text-blue-600"
          />
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent bg-white shadow-sm"
            />
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setIsFilterModalOpen(true)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 shadow-sm"
            >
                <Filter className="w-4 h-4" />
                <span>Filter</span>
            </button>
            <button 
                onClick={() => setIsDownloadModalOpen(true)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 shadow-sm"
            >
                <Download className="w-4 h-4" />
                <span>Download</span>
            </button>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {paginatedRecords.length === 0 ? (
             <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">No attendance records found</p>
             </div>
        ) : (
            paginatedRecords.map((record) => (
                <div key={record.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div 
                      className="p-3 md:p-4 flex flex-col gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleRow(record.id)}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 rounded-full bg-[#0F5D5D] flex items-center justify-center text-white font-bold text-sm">
                                    {record.employeeName.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-sm">{record.employeeName}</h3>
                                    <p className="text-xs text-gray-500">{record.department}</p>
                                </div>
                            </div>
                            {getStatusBadge(record.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="text-xs text-gray-500">Clock In</span>
                                <p className="font-medium text-gray-900">{record.clockInTime || '--:--'}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500">Clock Out</span>
                                <p className="font-medium text-gray-900">{record.clockOutTime || '--:--'}</p>
                            </div>
                        </div>

                        <div className="flex justify-center pt-1">
                          {expandedRowId === record.id ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                    </div>

                    {/* Expanded Details Mobile */}
                    {expandedRowId === record.id && (
                      <div className="px-4 pb-4 pt-0 bg-gray-50/50 border-t border-gray-100 space-y-3">
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <span className="text-xs text-gray-500 block">Work Hours</span>
                            <span className="text-sm font-medium text-gray-900">{record.workHours}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 block">Overtime</span>
                            <span className="text-sm font-medium text-green-600">{record.overtime}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 block">Late By</span>
                            <span className="text-sm font-medium text-orange-600">{record.lateBy}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 block">Location</span>
                            <span className="text-sm font-medium text-gray-900 capitalize">{record.location}</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            Device: {record.device}
                          </p>
                        </div>
                      </div>
                    )}
                </div>
            ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Clock-in</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Clock-out</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 text-sm">
                    No attendance records found
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record) => (
                  <>
                    <tr 
                      key={record.id} 
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${expandedRowId === record.id ? 'bg-gray-50' : ''}`}
                      onClick={() => toggleRow(record.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-[#0F5D5D] flex items-center justify-center">
                              <span className="text-white font-medium text-xs">
                                {record.employeeName.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{record.employeeName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{record.department}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${record.status === 'late_arrival' ? 'text-orange-600 font-medium' : 'text-gray-900'}`}>
                          {record.clockInTime || '--:--'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${record.status === 'early_departure' ? 'text-blue-600 font-medium' : 'text-gray-900'}`}>
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
                        {expandedRowId === record.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </td>
                    </tr>
                    
                    {/* Expanded Row Desktop */}
                    {expandedRowId === record.id && (
                      <tr className="bg-gray-50/50">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Info className="w-4 h-4 text-primary" />
                              Attendance Details
                            </h4>
                            <div className="grid grid-cols-4 gap-6">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Scheduled Work Hours</p>
                                <p className="text-sm font-medium text-gray-900">{record.workHours}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Overtime Duration</p>
                                <p className="text-sm font-medium text-green-600">{record.overtime}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Late By</p>
                                <p className="text-sm font-medium text-orange-600">{record.lateBy}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Device / IP</p>
                                <p className="text-sm font-medium text-gray-900 truncate" title={record.device}>
                                  {record.device}
                                </p>
                                <p className="text-xs text-gray-400">{record.ipAddress}</p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

       {/* Pagination */}
       <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {Math.min((currentPage - 1) * recordsPerPage + 1, filteredRecords.length)} to {Math.min(currentPage * recordsPerPage, filteredRecords.length)} of {filteredRecords.length}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          )}
        </div>

      {/* Modals (Download/Filter/Success) are the same as before... */}
      {/* ... keeping them for brevity if unchanged, but I'll include the closing tags to ensure the file is valid ... */}
      {/* (Actually, I should include them to be safe) */}
      
      {/* Filter Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900">Filter Attendance</h2>
                    <button onClick={() => setIsFilterModalOpen(false)}><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Department</label>
                        <Select
                            options={uniqueDepartments.map(dept => ({ value: dept, label: dept }))}
                            value={filterDepartment}
                            onChange={setFilterDepartment}
                            fullWidth
                        />
                    </div>
                    <div className="flex gap-3 mt-8">
                        <Button variant="outline" fullWidth onClick={() => setFilterDepartment('All Departments')}>Reset</Button>
                        <Button fullWidth onClick={() => setIsFilterModalOpen(false)}>Apply</Button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Download Modal */}
      {isDownloadModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900">Download Report</h2>
                    <button onClick={() => setIsDownloadModalOpen(false)}><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Format</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setDownloadFormat('csv')} className={`p-3 rounded-xl border-2 ${downloadFormat === 'csv' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>CSV</button>
                            <button onClick={() => setDownloadFormat('pdf')} className={`p-3 rounded-xl border-2 ${downloadFormat === 'pdf' ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>PDF</button>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                        <Button variant="outline" fullWidth onClick={() => setIsDownloadModalOpen(false)}>Cancel</Button>
                        <Button fullWidth loading={isDownloading} onClick={handleDownload}>Download</Button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Success Modal */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-sm p-8 shadow-xl text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Success</h2>
                <Button fullWidth onClick={() => setIsSuccessModalOpen(false)}>Close</Button>
            </div>
        </div>
      )}
    </div>
  )
}
