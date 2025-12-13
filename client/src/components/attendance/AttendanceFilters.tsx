import { useState } from 'react'
import { Calendar, ChevronDown, Filter, X } from 'lucide-react'

interface FilterState {
  period: 'today' | 'this-week' | 'this-month' | 'this-year' | 'custom'
  startDate?: string
  endDate?: string
  department?: string
  employee?: string
  status?: 'all' | 'present' | 'absent' | 'late' | 'early-departure'
}

interface AttendanceFiltersProps {
  isOpen: boolean
  onClose: () => void
  onApply: (filters: FilterState) => void
  departments: Array<{ id: string; name: string }>
  employees: Array<{ id: string; firstName: string; lastName: string }>
}

export default function AttendanceFilters({ 
  isOpen, 
  onClose, 
  onApply, 
  departments, 
  employees 
}: AttendanceFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    period: 'today',
    status: 'all'
  })


  const periodOptions = [
    { value: 'today', label: 'Today' },
    { value: 'this-week', label: 'This Week' },
    { value: 'this-month', label: 'This Month' },
    { value: 'this-year', label: 'This Year' },
    { value: 'custom', label: 'Custom Period' }
  ]

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'present', label: 'Present' },
    { value: 'absent', label: 'Absent' },
    { value: 'late', label: 'Late Clock-in' },
    { value: 'early-departure', label: 'Early Departure' }
  ]

  const handleApply = () => {
    onApply(filters)
    onClose()
  }

  const isFormValid = filters.period !== 'custom' || (filters.startDate && filters.endDate)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Filter className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Filter</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Period Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">Period</label>
            <div className="relative">
              <select
                value={filters.period}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  period: e.target.value as FilterState['period']
                }))}
                className="w-full px-4 py-3 border-2 border-primary rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm appearance-none bg-white text-gray-900 font-medium"
              >
                {periodOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary pointer-events-none" />
            </div>
          </div>

          {/* Custom Date Range */}
          {filters.period === 'custom' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={filters.startDate || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={filters.endDate || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {/* Department Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
            <select
              value={filters.department || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value || undefined }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          {/* Employee Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
            <select
              value={filters.employee || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, employee: e.target.value || undefined }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                status: e.target.value as FilterState['status']
              }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!isFormValid}
              className={`flex-1 px-6 py-3 font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 ${
                isFormValid
                  ? 'bg-primary hover:bg-primary/90 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}