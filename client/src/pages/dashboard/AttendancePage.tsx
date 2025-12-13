import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Download, Users, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { apiClient } from '@/lib/api'
import AttendanceFilters from '@/components/attendance/AttendanceFilters'
import AttendanceDownload from '@/components/attendance/AttendanceDownload'
import InviteEmployeeCard from '@/components/dashboard/InviteEmployeeCard'

interface AttendanceRecord {
  id: string
  employeeName: string
  department: string
  clockInTime: string
  clockOutTime?: string
  status: 'present' | 'absent' | 'late' | 'early-departure'
  hoursWorked?: number
  avatar?: string
}

interface AttendanceStats {
  totalEmployees: number
  totalClockIn: number
  earlyClockIn: number
  lateClockIn: number
  absent: number
  earlyDeparture: number
  leave: number
}

export default function AttendancePage() {
  const navigate = useNavigate()
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<AttendanceStats>({
    totalEmployees: 0,
    totalClockIn: 0,
    earlyClockIn: 0,
    lateClockIn: 0,
    absent: 0,
    earlyDeparture: 0,
    leave: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showDownload, setShowDownload] = useState(false)
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    fetchAttendanceData()
    fetchDepartments()
    fetchEmployees()
  }, [currentDate])

  const fetchAttendanceData = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get(`/api/attendance/company/${currentDate}`)
      
      if (response.data.success) {
        setAttendanceData(response.data.data)
        calculateStats(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch attendance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await apiClient.get('/api/departments')
      if (response.data.success) {
        setDepartments(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error)
    }
  }

  const fetchEmployees = async () => {
    try {
      const response = await apiClient.get('/api/employees')
      if (response.data.success) {
        setEmployees(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error)
    }
  }

  const calculateStats = (data: AttendanceRecord[]) => {
    const stats = {
      totalEmployees: data.length,
      totalClockIn: data.filter(r => r.status === 'present').length,
      earlyClockIn: data.filter(r => r.clockInTime && new Date(r.clockInTime).getHours() < 8).length,
      lateClockIn: data.filter(r => r.status === 'late').length,
      absent: data.filter(r => r.status === 'absent').length,
      earlyDeparture: data.filter(r => r.status === 'early-departure').length,
      leave: 0 // This would come from leave management
    }
    setStats(stats)
  }

  const handleFilter = (filters: any) => {
    // Apply filters to attendance data
    console.log('Applying filters:', filters)
    // Implementation would filter the data based on the filters
  }

  const handleDownload = async (config: any) => {
    try {
      const response = await apiClient.post('/api/attendance/export', {
        ...config,
        date: currentDate
      }, {
        responseType: 'blob'
      })

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `attendance-${currentDate}.${config.format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      throw error
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'late':
        return <Clock className="w-4 h-4 text-orange-600" />
      case 'absent':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'early-departure':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      default:
        return null
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present':
        return 'Present'
      case 'late':
        return 'Late'
      case 'absent':
        return 'Absent'
      case 'early-departure':
        return 'Early Departure'
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800'
      case 'late':
        return 'bg-orange-100 text-orange-800'
      case 'absent':
        return 'bg-red-100 text-red-800'
      case 'early-departure':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredData = attendanceData.filter(record =>
    record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.department.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
              <p className="text-gray-600 mt-1">Track and manage employee attendance</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
              />
              <InviteEmployeeCard variant="button" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-7 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all duration-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</div>
              <div className="text-sm text-gray-600">Total Employees</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all duration-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totalClockIn}</div>
              <div className="text-sm text-gray-600">Total Clock In</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all duration-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.earlyClockIn}</div>
              <div className="text-sm text-gray-600">Early Clock In</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all duration-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.lateClockIn}</div>
              <div className="text-sm text-gray-600">Late Clock In</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all duration-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.absent}</div>
              <div className="text-sm text-gray-600">Absent</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all duration-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.earlyDeparture}</div>
              <div className="text-sm text-gray-600">Early Departure</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all duration-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.leave}</div>
              <div className="text-sm text-gray-600">Leave</div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Table Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <h2 className="text-xl font-bold text-gray-900">All Attendance</h2>
              
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm w-64"
                  />
                </div>

                {/* Filter Button */}
                <button
                  onClick={() => setShowFilters(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <Filter className="w-4 h-4" />
                  Filter
                </button>

                {/* Download Button */}
                <button
                  onClick={() => setShowDownload(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">#</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Employee Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Department</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Clock In</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Clock Out</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Hours</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-gray-500 mt-2">Loading attendance data...</p>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No attendance records found</p>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((record, index) => (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {record.employeeName.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{record.employeeName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{record.department}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {record.clockInTime ? new Date(record.clockInTime).toLocaleTimeString() : '--:--'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {record.clockOutTime ? new Date(record.clockOutTime).toLocaleTimeString() : '--:--'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {record.hoursWorked ? `${record.hoursWorked} hours` : '--'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(record.status)}
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                            {getStatusText(record.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => navigate(`/dashboard/attendance/employee/${record.id}`)}
                          className="text-primary hover:text-primary/80 text-sm font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {filteredData.length} records
              </p>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900">
                  Previous
                </button>
                <span className="px-3 py-1 text-sm bg-primary text-white rounded">1</span>
                <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900">
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AttendanceFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleFilter}
        departments={departments}
        employees={employees}
      />

      <AttendanceDownload
        isOpen={showDownload}
        onClose={() => setShowDownload(false)}
        onDownload={handleDownload}
      />
    </div>
  )
}