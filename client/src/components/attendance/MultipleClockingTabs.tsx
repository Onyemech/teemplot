import { useState, useEffect } from 'react'
import { Clock, Calendar, Filter, ChevronDown } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { useToast } from '@/contexts/ToastContext'
import { format } from 'date-fns'
import { useMultipleClockingSync } from '@/hooks/useSettingsSync'

interface ClockingRecord {
  id: string
  type: 'clock_in' | 'clock_out'
  timestamp: string
  location?: string
  notes?: string
}

interface MultipleClockingTabsProps {
  employeeId?: string
  isEnabled: boolean
}

export default function MultipleClockingTabs({ employeeId, isEnabled }: MultipleClockingTabsProps) {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<'multiple' | 'single'>('multiple')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [clockingRecords, setClockingRecords] = useState<ClockingRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [currentlyEnabled, setCurrentlyEnabled] = useState(isEnabled)

  // Sync multiple clocking settings changes
  useMultipleClockingSync((data) => {
    if (data.employeeId === employeeId || !employeeId) {
      setCurrentlyEnabled(data.enabled)
      toast.info('Multiple clocking settings have been updated')
      fetchClockingRecords() // Refresh records
    }
  })

  useEffect(() => {
    setCurrentlyEnabled(isEnabled)
  }, [isEnabled])

  useEffect(() => {
    if (currentlyEnabled) {
      fetchClockingRecords()
    }
  }, [selectedDate, activeTab, currentlyEnabled])

  const fetchClockingRecords = async () => {
    if (!currentlyEnabled) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams({
        date: format(selectedDate, 'yyyy-MM-dd'),
        type: activeTab === 'multiple' ? 'multiple' : 'single'
      })
      
      if (employeeId) {
        params.append('employeeId', employeeId)
      }

      const response = await apiClient.get(`/api/attendance/clocking-records?${params}`)
      if (response.data.success) {
        setClockingRecords(response.data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch clocking records:', error)
      toast.error('Failed to load clocking records')
    } finally {
      setLoading(false)
    }
  }

  const handleClockAction = async (type: 'clock_in' | 'clock_out') => {
    try {
      const response = await apiClient.post('/api/attendance/clock', {
        type,
        timestamp: new Date().toISOString(),
        multiple_clocking: activeTab === 'multiple'
      })

      if (response.data.success) {
        toast.success(`Successfully clocked ${type === 'clock_in' ? 'in' : 'out'}`)
        fetchClockingRecords()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to clock ${type === 'clock_in' ? 'in' : 'out'}`)
    }
  }

  if (!currentlyEnabled) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Multiple Clocking Disabled</h3>
          <p className="text-sm text-gray-500 mb-4">Contact your admin to enable multiple clocking feature</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl text-sm text-gray-600">
            <Filter className="w-4 h-4" />
            Feature Not Available
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200">
      {/* Mobile-First Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('multiple')}
          className={`flex-1 px-4 py-4 text-sm font-medium transition-all duration-200 rounded-tl-xl ${
            activeTab === 'multiple'
              ? 'text-primary border-b-2 border-primary bg-primary/10'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Multiple Clock</span>
            <span className="sm:hidden">Multiple</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('single')}
          className={`flex-1 px-4 py-4 text-sm font-medium transition-all duration-200 rounded-tr-xl ${
            activeTab === 'single'
              ? 'text-primary border-b-2 border-primary bg-primary/10'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Single Clock</span>
            <span className="sm:hidden">Single</span>
          </div>
        </button>
      </div>

      {/* Date Filter - Mobile Optimized */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Date Filter</span>
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">{format(selectedDate, 'MMM dd, yyyy')}</span>
              <span className="sm:hidden">{format(selectedDate, 'MMM dd')}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showDatePicker && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 z-10">
                <input
                  type="date"
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    setSelectedDate(new Date(e.target.value))
                    setShowDatePicker(false)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clock Action Buttons - Mobile First */}
      {activeTab === 'multiple' && (
        <div className="p-4 border-b border-gray-100">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleClockAction('clock_in')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Clock In</span>
              <span className="sm:hidden">In</span>
            </button>
            <button
              onClick={() => handleClockAction('clock_out')}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Clock Out</span>
              <span className="sm:hidden">Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Records List - Mobile Optimized */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : clockingRecords.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No Records Found</h3>
            <p className="text-sm text-gray-500">
              No {activeTab} clocking records for {format(selectedDate, 'MMM dd, yyyy')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {activeTab === 'multiple' ? 'Multiple' : 'Single'} Clocking Records
            </h4>
            {clockingRecords.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    record.type === 'clock_in' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm font-medium text-gray-900">
                    {record.type === 'clock_in' ? 'Clock In' : 'Clock Out'}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(record.timestamp), 'HH:mm')}
                  </p>
                  {record.location && (
                    <p className="text-xs text-gray-500 truncate max-w-24">
                      {record.location}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}