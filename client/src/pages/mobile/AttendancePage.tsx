import { useState, useEffect } from 'react'
import { ArrowLeft, Search, Filter, Check, X, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'

interface AttendanceRecord {
  id: string
  date: string
  clockInTime: string | null
  clockOutTime: string | null
  status: 'present' | 'late' | 'absent'
  location: 'remote' | 'onsite' | null
  duration?: string
}

interface AttendanceStats {
  present: number
  late: number
  absent: number
}

interface FilterModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (filter: string) => void
  currentFilter: string
}

function FilterModal({ isOpen, onClose, onApply, currentFilter }: FilterModalProps) {
  const [selectedFilter, setSelectedFilter] = useState(currentFilter)

  if (!isOpen) return null

  const filters = [
    { value: 'all', label: 'All' },
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_3_months', label: 'Last 3 Months' }
  ]

  const handleApply = () => {
    onApply(selectedFilter)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900">Date</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>

          <div className="space-y-2 mb-6">
            {filters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setSelectedFilter(filter.value)}
                className={`w-full p-4 text-left rounded-xl transition-colors ${
                  selectedFilter === filter.value
                    ? 'bg-primary/10 border-2 border-primary text-primary'
                    : 'bg-gray-50 border-2 border-transparent text-gray-900 hover:bg-gray-100'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleApply}
            className="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200"
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AttendancePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<AttendanceStats>({ present: 0, late: 0, absent: 0 })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [currentFilter, setCurrentFilter] = useState('all')

  useEffect(() => {
    fetchAttendanceData()
  }, [currentFilter])

  const fetchAttendanceData = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get(`/api/attendance/my-records?filter=${currentFilter}`)
      if (response.data.success) {
        setRecords(response.data.data.records)
        setStats(response.data.data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error)
      toast.error('Failed to load attendance data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <Check className="w-4 h-4 text-green-600" />
      case 'late':
        return <Clock className="w-4 h-4 text-orange-600" />
      case 'absent':
        return <X className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'text-green-600 bg-green-50'
      case 'late':
        return 'text-orange-600 bg-orange-50'
      case 'absent':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const filteredRecords = records.filter(record =>
    searchTerm === '' || 
    formatDate(record.date).toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.status.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Attendance</h1>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search using keywords"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowFilterModal(true)}
            className="p-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Check className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-sm text-gray-600 mb-1">Present</div>
            <div className="text-xl font-bold text-gray-900">{stats.present}</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Clock className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-sm text-gray-600 mb-1">Late</div>
            <div className="text-xl font-bold text-gray-900">{stats.late}</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <X className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-sm text-gray-600 mb-1">Absent</div>
            <div className="text-xl font-bold text-gray-900">{stats.absent}</div>
          </div>
        </div>

        {/* Attendance Records */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No attendance history yet</h3>
            <p className="text-gray-500 text-sm">Your attendance history will be displayed here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Clear Filter */}
            {currentFilter !== 'all' && (
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentFilter('all')}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Clear filter
                </button>
                <span className="text-sm text-gray-600">
                  Status: {currentFilter.replace('_', ' ')}
                </span>
              </div>
            )}

            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {record.clockInTime || '09:00 am'} - {record.clockOutTime || '05:00pm'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {record.location === 'remote' ? 'Remote' : 'Onsite'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(record.date)}
                    </div>
                  </div>

                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                    {getStatusIcon(record.status)}
                    <span className="capitalize">{record.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter Modal */}
      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={setCurrentFilter}
        currentFilter={currentFilter}
      />
    </div>
  )
}