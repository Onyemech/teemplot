import { useState, useEffect } from 'react'
import { Users, Search, Plus, X, CheckCircle } from 'lucide-react'
import { apiClient } from '@/lib/api'
import AnimatedCheckmark from '@/components/ui/AnimatedCheckmark'

interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  position: string
  department: string
  isEnabled: boolean
}

interface Department {
  id: string
  name: string
}

export default function MultipleClockInSetup() {
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
        apiClient.get('/api/employees'),
        apiClient.get('/api/departments')
      ])

      if (employeesRes.data.success) {
        setEmployees(employeesRes.data.data.map((emp: any) => ({
          ...emp,
          isEnabled: false
        })))
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
      employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesDepartment = selectedDepartment === 'all' || employee.department === selectedDepartment

    return matchesSearch && matchesDepartment
  })

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    )
  }

  const handleSelectAll = () => {
    const allFilteredIds = filteredEmployees.map(emp => emp.id)
    setSelectedEmployees(prev => {
      const hasAll = allFilteredIds.every(id => prev.includes(id))
      if (hasAll) {
        return prev.filter(id => !allFilteredIds.includes(id))
      } else {
        return [...new Set([...prev, ...allFilteredIds])]
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
        setShowSuccessModal(true)
        setSelectedEmployees([])
      }
    } catch (error: any) {
      console.error('Failed to enable multiple clock-in:', error)
      alert(error.response?.data?.message || 'Failed to enable multiple clock-in')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveEmployee = (employeeId: string) => {
    setSelectedEmployees(prev => prev.filter(id => id !== employeeId))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
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
          <div className="bg-white rounded-xl border border-gray-200 p-6">
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
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  className="text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  {filteredEmployees.length > 0 && filteredEmployees.every(emp => selectedEmployees.includes(emp.id))
                    ? 'Deselect All'
                    : 'Select All'
                  }
                </button>
              </div>
            </div>

            {/* Employee List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredEmployees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No employees found</p>
                </div>
              ) : (
                filteredEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedEmployees.includes(employee.id)
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleEmployeeToggle(employee.id)}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      selectedEmployees.includes(employee.id) ? 'bg-green-600' : 'bg-orange-500'
                    }`}>
                      <span className="text-white text-sm font-medium">
                        {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {employee.firstName} {employee.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {employee.position} • {employee.department}
                      </div>
                    </div>
                    {selectedEmployees.includes(employee.id) && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Side - Added Employees */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Added Employees ({selectedEmployees.length})</h2>
              <p className="text-sm text-gray-600">
                List of employees enabled for multiple clock-in
              </p>
            </div>

            {selectedEmployees.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">No Employees Enabled Yet</h3>
                <p className="text-sm">Select employees from the left to enable multiple clock-in</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto mb-6">
                {selectedEmployees.map((employeeId) => {
                  const employee = employees.find(emp => emp.id === employeeId)
                  if (!employee) return null

                  return (
                    <div
                      key={employee.id}
                      className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
                    >
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee.position}
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
              </div>
            )}

            {/* Add Button */}
            {selectedEmployees.length > 0 && (
              <button
                onClick={handleAdd}
                disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
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
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md text-center">
            <div className="mx-auto mb-6">
              <AnimatedCheckmark isVisible={showSuccessModal} size="xl" color="green" withBackground={true} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Multiple Clock-in Added</h3>
            <p className="text-gray-600 mb-8">
              Multiple clock-in successfully added for the employees
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  )
}