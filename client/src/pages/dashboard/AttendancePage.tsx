import { useState, useEffect } from 'react'
import { Clock, Download, Filter, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { useUser } from '@/contexts/UserContext'
import { useFeatureAccess } from '@/hooks/useFeatureAccess'
import { format, startOfWeek, endOfWeek, addDays, subDays } from 'date-fns'

interface AttendanceStats {
  totalEmployees: number
  totalClockIn: number
  earlyClockIn: number
  lateClockIn: number
  absent: number
  earlyDeparture: number
  leave: number
}

interface AttendanceRecord {
  id: string
  employeeName: string
  department: string
  clockInTime: string | null
  clockOutTime: string | null
  duration: string | null
  status: 'present' | 'absent' | 'late' | 'early_departure' | 'on_leave'
  location: string | null
}

export default function AttendancePage() {
  const { user } = useUser()
  const { hasAccess } = useFeatureAccess()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [stats, setStats] = useState<AttendanceStats>({
    totalEmployees: 0,
    totalClockIn: 0,
    earlyClockIn: 0,
    lateClockIn: 0,
    absent: 0,
    earlyDeparture: 0,
    leave: 0
  })
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const isAdmin = user?.role === 'admin' || user?.role === 'owner'

  useEffect(() => {
    if (hasAccess('attendance')) {
      fetchAttendanceData()
    }
  }, [selectedDate])

  const fetchAttendanceData = async () => {
    try {
      setLoading(true)
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      
      if (isAdmin) {
        // Admin view - get company attendance
        const response = await apiClient.get(`/api/attendance/company/${dateStr}`)
        if (response.data.success) {
          const records = response.data.data
          setAttendanceRecords(records)
          
          // Calculate stats
          const totalEmployees = records.length
          const totalClockIn = records.filter((r: any) => r.clock_in_time).length
          const earlyClockIn = records.filter((r: any) => r.is_early_arrival).length
          const lateClockIn = records.filter((r: any) => r.is_late_arrival).length
          const absent = totalEmployees - totalClockIn
          const earlyDeparture = records.filter((r: any) => r.is_early_departure).length
          const leave = 0 // TODO: Implement leave tracking
          
          setStats({
            totalEmployees,
            totalClockIn,
            earlyClockIn,
            lateClockIn,
            absent,
            earlyDeparture,
            leave
          })
        }
      } else {
        // Employee view - get personal attendance
        const response = await apiClient.get('/api/attendance/history', {
          params: {
            startDate: format(startOfWeek(selectedDate), 'yyyy-MM-dd'),
            endDate: format(endOfWeek(selectedDate), 'yyyy-MM-dd')
          }
        })
        if (response.data.success) {
          setAttendanceRecords(response.data.data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch attendance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
  }

  const filteredRecords = attendanceRecords.filter(record =>
    record.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.department?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!hasAccess('attendance')) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Attendance Not Available</h3>
          <p className="text-gray-500">Upgrade to Silver or Gold plan to access attendance tracking</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-50 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6">
        <div className="mb-4 lg:mb-0">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Attendance Overview</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Date Navigation */}
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
            <button
              onClick={() => navigateDate('prev')}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[120px] text-center">
              {format(selectedDate, 'EEEE, MMM dd, yyyy')}
            </span>
            <button
              onClick={() => navigateDate('next')}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          {isAdmin && (
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              + Invite Employee
            </button>
          )}
        </div>
      </div>

      {isAdmin ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-7 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</div>
                <div className="text-sm text-gray-500">Total Employees</div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.totalClockIn}</div>
                <div className="text-sm text-gray-500">Total Clock In</div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.earlyClockIn}</div>
                <div className="text-sm text-gray-500">Early Clock In</div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.lateClockIn}</div>
                <div className="text-sm text-gray-500">Late Clock In</div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.absent}</div>
                <div className="text-sm text-gray-500">Absent</div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.earlyDeparture}</div>
                <div className="text-sm text-gray-500">Early Departure</div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.leave}</div>
                <div className="text-sm text-gray-500">Leave</div>
              </div>
            </div>
          </div>

          {/* All Attendance Table */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-gray-900">All Attendance</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                    <Filter className="w-4 h-4" />
                    Filter
                  </button>
                  <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Employee Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Department</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Clock-in Time</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Clock-out Time</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Duration</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12">
                        <div className="text-gray-400 mb-2">
                          <Clock className="w-12 h-12 mx-auto mb-4" />
                        </div>
                        <p className="text-gray-500">No attendance to review. Once you invite employees and</p>
                        <p className="text-gray-500">they clock-in, the attendance will show here.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record) => (
                      <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">{record.employeeName}</td>
                        <td className="py-3 px-4 text-sm text-gray-500">{record.department || '-'}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {record.clockInTime ? format(new Date(record.clockInTime), 'HH:mm') : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {record.clockOutTime ? format(new Date(record.clockOutTime), 'HH:mm') : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">{record.duration || '-'}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            record.status === 'present' ? 'bg-green-100 text-green-800' :
                            record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                            record.status === 'absent' ? 'bg-red-100 text-red-800' :
                            record.status === 'early_departure' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {record.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">{record.location || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        // Employee View - Personal Attendance
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">My Attendance</h2>
            <div className="space-y-4">
              {attendanceRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">
                      {format(new Date(record.clockInTime || new Date()), 'EEEE, MMM dd')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {record.clockInTime && record.clockOutTime ? 
                        `${format(new Date(record.clockInTime), 'HH:mm')} - ${format(new Date(record.clockOutTime), 'HH:mm')}` :
                        record.clockInTime ? 
                        `Clocked in at ${format(new Date(record.clockInTime), 'HH:mm')}` :
                        'No attendance recorded'
                      }
                    </div>
                  </div>
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                    record.status === 'present' ? 'bg-green-100 text-green-800' :
                    record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                    record.status === 'absent' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {record.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}