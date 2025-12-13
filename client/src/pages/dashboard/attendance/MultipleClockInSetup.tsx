import { useState, useEffect } from 'react'
import { Users, Search, Plus, X, CheckCircle } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { useToast } from '@/contexts/ToastContext'
import SuccessModal from '@/components/ui/SuccessModal'


interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  position: string
  department: string
  multiple_clockin_enabled: boolean
  enabled_at?: string
}

interface Department {
  id: string
  name: string
}

export default function MultipleClockInSetup() {
  const toast = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [employeesRes, departmentsRes] = await Promise.all([
        apiClient.get('/api/attendance/multiple-clockin'),
        apiClient.get('/api/departments')
      ])

      if (employeesRes.data.success) {
        setEmployees(employeesRes.data.data)
      }

      if (departmentsRes.data.success) {
        setDepartments(departmentsRes.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = 
      employee.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesDepartment = selectedDepartment === 'all' || employee.department === selectedDepartment

    return matchesSearch && matchesDepartment
  })

  // Separate enabled and available employees
  const enabledEmployees = employees.filter(emp => emp.multiple_clockin_enabled)
  const availableEmployees = filteredEmployees.filter(emp => !emp.multiple_clockin_enabled)

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    )
  }

  const handleSelectAll = () => {
    const allAvailableIds = availableEmployees.map(emp => emp.id)
    setSelectedEmployees(prev => {
      const hasAll = allAvailableIds.every(id => prev.includes(id))
      if (hasAll) {
        return prev.filter(id => !allAvailableIds.includes(id))
      } else {
        return [...new Set([...prev, ...allAvailableIds])]
      }
    })
  }

  const handleAdd = async () => {
    setSaving(true)
    try {
      const response = await apiClient.post('/api/attendance/multiple-clockin', {
        employeeIds: selectedEmployees
      })

      if (response.data.success) {
        toast.success(`Multiple clock-in enabled for ${selectedEmployees.length} employee(s)`)
        setShowSuccessModal(true)
        setSelectedEmployees([])
        // Refresh the data to show updated status
        fetchData()
      }
    } catch (error: any) {
      console.error('Failed to enable multiple clock-in:', error)
      toast.error(error.response?.data?.message || 'Failed to enable multiple clock-in')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (employeeIds: string[]) => {
    try {
      const response = await apiClient.delete('/api/attendance/multiple-clockin', {
        data: { employeeIds }
      })

      if (response.data.success) {
        toast.success(`Multiple clock-in disabled for ${employeeIds.length} employee(s)`)
        // Refresh the data to show updated status
        fetchData()
      }
    } catch (error: any) {
      console.error('Failed to disable multiple clock-in:', error)
      toast.error(error.response?.data?.message || 'Failed to disable multiple clock-in')
    }
  }

  const handleRemoveEmployee = (employeeId: string) => {
    setSelectedEmployees(prev => prev.filter(id => id !== employeeId))
  }

  if (loading) {
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
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Manage Multiple Clock-in</h1>
          <p className="text-gray-600 mt-1">You can add specific employees to the multiple clock-in feature</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Employee Selection */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Multiple Clock-in</h2>
              <p className="text-sm text-gray-600 mb-4">
                You can add specific employees to the multiple clock-in feature
              </p>

              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by employee"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                  />
                </div>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                >
                  <option value="all">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>

              {/* Select All */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-700">Employee(s)</span>
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-primary hover:text-primary/80 font-medium"
                >
                  {availableEmployees.length > 0 && availableEmployees.every(emp => selectedEmployees.includes(emp.id))
                    ? 'Deselect All'
                    : 'Select All'
                  }
                </button>
              </div>
            </div>

            {/* Employee List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {availableEmployees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No available employees found</p>
                </div>
              ) : (
                availableEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all shadow-sm hover:shadow-md ${
                      selectedEmployees.includes(employee.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleEmployeeToggle(employee.id)}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      selectedEmployees.includes(employee.id) ? 'bg-primary' : 'bg-orange-500'
                    }`}>
                      <span className="text-white text-sm font-medium">
                        {employee.first_name.charAt(0)}{employee.last_name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {employee.first_name} {employee.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {employee.position} • {employee.department}
                      </div>
                    </div>
                    {selectedEmployees.includes(employee.id) && (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Side - Added Employees */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Enabled Employees ({enabledEmployees.length + selectedEmployees.length})</h2>
              <p className="text-sm text-gray-600">
                List of employees enabled for multiple clock-in
              </p>
            </div>

            {/* Show currently enabled employees */}
            <div className="space-y-3 max-h-96 overflow-y-auto mb-6">
              {enabledEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl shadow-sm"
                >
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {employee.first_name.charAt(0)}{employee.last_name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {employee.first_name} {employee.last_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {employee.position} • Enabled {employee.enabled_at ? new Date(employee.enabled_at).toLocaleDateString() : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove([employee.id])}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="Disable multiple clock-in"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Show selected employees to be added */}
              {selectedEmployees.map((employeeId) => {
                const employee = employees.find(emp => emp.id === employeeId)
                if (!employee) return null

                return (
                  <div
                    key={employee.id}
                    className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-xl shadow-sm"
                  >
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {employee.first_name.charAt(0)}{employee.last_name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {employee.first_name} {employee.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {employee.position} • Pending
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveEmployee(employee.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}

              {enabledEmployees.length === 0 && selectedEmployees.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">No Employees Enabled Yet</h3>
                  <p className="text-sm">Select employees from the left to enable multiple clock-in</p>
                </div>
              )}
            </div>

            {/* Add Button */}
            {selectedEmployees.length > 0 && (
              <button
                onClick={handleAdd}
                disabled={saving}
                className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-white py-3 px-6 rounded-xl font-medium flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-200"
                onBlur={(e) => e.target.blur()}
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Add ({selectedEmployees.length})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Multiple Clock-in Added!"
        message="Multiple clock-in has been successfully enabled for the selected employees. They can now clock in and out multiple times per day."
        checkmarkSize="xl"
        actions={
          <div className="space-y-3">
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200"
            >
              Continue
            </button>
            <button
              onClick={() => {
                setShowSuccessModal(false)
                window.location.reload()
              }}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200"
            >
              Refresh Page
            </button>
          </div>
        }
      />
    </div>
  )
}