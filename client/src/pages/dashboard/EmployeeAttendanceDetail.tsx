import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, Filter, Calendar, BarChart3, MapPin } from 'lucide-react'
import { apiClient } from '@/lib/api'
import AttendanceDownload from '@/components/attendance/AttendanceDownload'

interface EmployeeData {
  id: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  department: string
  position: string
  creationDate: string
  status: 'Present' | 'Absent' | 'Leave'
}

interface AttendanceBreakdown extends Record<string, number> {
  present: number
  earlyDeparture: number
  leave: number
  absent: number
}

interface ClockInOutComparison extends Record<string, number> {
  onTimeClockIn: number
  missedClockIn: number
  lateClockIn: number
}

interface WorkhourDistribution extends Record<string, number> {
  standardWorkHours: number
  overtimeWorkHours: number
}

interface TabData {
  attendance: any[]
  overtime: any[]
  earlyDeparture: any[]
  leave: any[]
  multipleClockIn: any[]
}

export default function EmployeeAttendanceDetail() {
  const { employeeId } = useParams()
  const navigate = useNavigate()
  const [employee, setEmployee] = useState<EmployeeData | null>(null)
  const [attendanceBreakdown, setAttendanceBreakdown] = useState<AttendanceBreakdown>({
    present: 0,
    earlyDeparture: 0,
    leave: 0,
    absent: 0
  })
  const [clockInOutComparison, setClockInOutComparison] = useState<ClockInOutComparison>({
    onTimeClockIn: 0,
    missedClockIn: 0,
    lateClockIn: 0
  })
  const [workhourDistribution, setWorkhourDistribution] = useState<WorkhourDistribution>({
    standardWorkHours: 0,
    overtimeWorkHours: 0
  })
  const [tabData, setTabData] = useState<TabData>({
    attendance: [],
    overtime: [],
    earlyDeparture: [],
    leave: [],
    multipleClockIn: []
  })
  const [activeTab, setActiveTab] = useState<keyof TabData>('attendance')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showDownload, setShowDownload] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (employeeId) {
      fetchEmployeeData()
      fetchAttendanceData()
    }
  }, [employeeId, selectedDate])

  const fetchEmployeeData = async () => {
    try {
      const response = await apiClient.get(`/api/employees/${employeeId}`)
      if (response.data.success) {
        setEmployee(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch employee data:', error)
    }
  }

  const fetchAttendanceData = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get(`/api/attendance/employee/${employeeId}?date=${selectedDate}`)
      
      if (response.data.success) {
        const data = response.data.data
        setAttendanceBreakdown(data.breakdown || { present: 0, earlyDeparture: 0, leave: 0, absent: 0 })
        setClockInOutComparison(data.clockInOut || { onTimeClockIn: 0, missedClockIn: 0, lateClockIn: 0 })
        setWorkhourDistribution(data.workhours || { standardWorkHours: 0, overtimeWorkHours: 0 })
        setTabData(data.tabData || {
          attendance: [],
          overtime: [],
          earlyDeparture: [],
          leave: [],
          multipleClockIn: []
        })
      }
    } catch (error) {
      console.error('Failed to fetch attendance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (config: any) => {
    try {
      const response = await apiClient.post(`/api/attendance/employee/${employeeId}/export`, {
        ...config,
        date: selectedDate
      }, {
        responseType: 'blob'
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${employee?.firstName}-${employee?.lastName}-attendance.${config.format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      throw error
    }
  }

  const renderCircularChart = (data: Record<string, number>, colors: Record<string, string>, title: string) => {
    const total = Object.values(data).reduce((sum, value) => sum + value, 0)
    
    if (total === 0) {
      return (
        <div className="text-center">
          <div className="w-32 h-32 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <BarChart3 className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-500">No data available</p>
        </div>
      )
    }

    let cumulativePercentage = 0
    const segments = Object.entries(data).map(([key, value]) => {
      const percentage = (value / total) * 100
      const segment = {
        key,
        value,
        percentage,
        startAngle: cumulativePercentage * 3.6,
        endAngle: (cumulativePercentage + percentage) * 3.6,
        color: colors[key] || '#gray-400'
      }
      cumulativePercentage += percentage
      return segment
    })

    return (
      <div className="text-center">
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="8"
            />
            {segments.map((segment, index) => {
              const radius = 40
              const circumference = 2 * Math.PI * radius
              const strokeDasharray = `${(segment.percentage / 100) * circumference} ${circumference}`
              const strokeDashoffset = -((segments.slice(0, index).reduce((sum, s) => sum + s.percentage, 0) / 100) * circumference)
              
              return (
                <circle
                  key={segment.key}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="8"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300"
                />
              )
            })}
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="space-y-2">
          {Object.entries(data).map(([key]) => (
            <div key={key} className="flex items-center justify-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: colors[key] || '#gray-400' }}
              ></div>
              <span className="capitalize text-gray-700">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  /* const renderEmployeeLocationMap = () => {
    // This would integrate with Google Maps to show employee location during clock-in
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Clock-in Locations</h3>
        <div className="bg-gray-100 rounded-xl h-64 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Google Maps integration</p>
            <p className="text-sm text-gray-500">Shows employee clock-in locations</p>
          </div>
        </div>
      </div>
    )
  } */

  const tabs = [
    { key: 'attendance', label: 'Attendance' },
    { key: 'overtime', label: 'Overtime' },
    { key: 'earlyDeparture', label: 'Early Departure' },
    { key: 'leave', label: 'Leave' },
    { key: 'multipleClockIn', label: 'Multiple Clock-in' }
  ]

  const renderTabContent = () => {
    const currentData = tabData[activeTab]
    
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      )
    }

    if (!currentData || currentData.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No {activeTab} records</h3>
          <p className="text-gray-500">No {activeTab} data found for the selected period.</p>
        </div>
      )
    }

    // Render table based on active tab
    const renderTable = () => {
      switch (activeTab) {
        case 'leave':
          return (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">#</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Leave Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Start Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">End Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Duration</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Relief Officer</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Line Manager</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.leaveType || 'COMPASSIONATE'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.startDate || 'March 09, 2025'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.endDate || 'November 26, 2025'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.duration || '10 Days'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.reliefOfficer || 'Ngozi Ada'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.lineManager || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        case 'multipleClockIn':
          return (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">#</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Clock-in</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Clock-out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentData.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                        No multiple clock-in records found
                      </td>
                    </tr>
                  ) : (
                    currentData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.clockIn || '--:--'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.clockOut || '--:--'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )
        default:
          return (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Clock In</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Clock Out</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Hours</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{item.date || selectedDate}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.clockIn || '07:45 am'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.clockOut || '05:00 pm'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.hours || '10 hours'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          item.status === 'Present' ? 'bg-green-100 text-green-800' :
                          item.status === 'Late' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.status || 'Present'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      }
    }

    return renderTable()
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/dashboard/attendance')}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-gray-600">Back to Overview</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-bold">
                  {employee.firstName[0]}{employee.lastName[0]}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {employee.firstName} {employee.lastName}
                  </h1>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    employee.status === 'Present' ? 'bg-green-100 text-green-800' :
                    employee.status === 'Absent' ? 'bg-red-100 text-red-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {employee.status}
                  </span>
                </div>
                <p className="text-gray-600">Creation Date: {employee.creationDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
              />
              <button
                onClick={() => setShowDownload(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>

          {/* Employee Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-sm">
            <div>
              <span className="text-gray-600">Email Address:</span>
              <div className="font-medium text-gray-900">{employee.email}</div>
            </div>
            <div>
              <span className="text-gray-600">Phone Number:</span>
              <div className="font-medium text-gray-900">{employee.phoneNumber}</div>
            </div>
            <div>
              <span className="text-gray-600">Department:</span>
              <div className="font-medium text-gray-900">{employee.department}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        {/* Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
            {renderCircularChart(
              attendanceBreakdown,
              {
                present: '#0F5D5D',
                earlyDeparture: '#3B82F6',
                leave: '#F59E0B',
                absent: '#EF4444'
              },
              'Attendance Breakdown'
            )}
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
            {renderCircularChart(
              clockInOutComparison,
              {
                onTimeClockIn: '#0F5D5D',
                missedClockIn: '#F59E0B',
                lateClockIn: '#EF4444'
              },
              'Clock-in/Clock-out Comparison'
            )}
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
            {renderCircularChart(
              workhourDistribution,
              {
                standardWorkHours: '#0F5D5D',
                overtimeWorkHours: '#EF4444'
              },
              'Workhour Distribution'
            )}
          </div>

          {/* Employee Location Map */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Tracking</h3>
            <div className="bg-gray-100 rounded-xl h-32 flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Last Clock-in</div>
              <div className="font-medium text-gray-900">Head Office</div>
              <div className="text-xs text-gray-500">6.428804, 3.443709</div>
            </div>
          </div>
        </div>

        {/* Tabs and Content */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as keyof TabData)}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {tabs.find(tab => tab.key === activeTab)?.label} Summary
              </h3>
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200">
                <Filter className="w-4 h-4" />
                Filter
              </button>
            </div>

            {renderTabContent()}

            {/* Pagination */}
            {tabData[activeTab]?.length > 0 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  {tabData[activeTab].length} records
                </p>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900">
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm bg-primary text-white rounded">Page 1</span>
                  <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900">
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Download Modal */}
      <AttendanceDownload
        isOpen={showDownload}
        onClose={() => setShowDownload(false)}
        onDownload={handleDownload}
      />
    </div>
  )
}