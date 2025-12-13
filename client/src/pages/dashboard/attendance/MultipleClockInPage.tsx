import { useState, useEffect } from 'react'
import { Search, Trash2, Check, X } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'

interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  department: string
  position: string
  avatar?: string
}

interface DeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  employeeName: string
}

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
}

function DeleteModal({ isOpen, onClose, onConfirm, employeeName }: DeleteModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove employee?</h3>
        <p className="text-gray-600 mb-6">
          Are you sure you want to remove {employeeName} from multiple clock-in?
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}

function SuccessModal({ isOpen, onClose }: SuccessModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Employee successfully removed</h3>
        
        <button
          onClick={onClose}
          className="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200 mt-4"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default function MultipleClockInPage() {
  const toast = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set())
  const [addedEmployees, setAddedEmployees] = useState<Employee[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('All Departments')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; employee: Employee | null }>({
    isOpen: false,
    employee: null
  })
  const [successModal, setSuccessModal] = useState(false)

  useEffect(() => {
    fetchEmployees()
    fetchMultipleClockInEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const response = await apiClient.get('/api/employees')
      if (response.data.success) {
        setEmployees(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMultipleClockInEmployees = async () => {
    try {
      const response = await apiClient.get('/api/attendance/multiple-clockin/employees')
      if (response.data.success) {
        setAddedEmployees(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch multiple clock-in employees:', error)
    }
  }

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = 
      employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesDepartment = departmentFilter === 'All Departments' || employee.department === departmentFilter
    
    // Don't show employees that are already added
    const notAlreadyAdded = !addedEmployees.some(added => added.id === employee.id)
    
    return matchesSearch && matchesDepartment && notAlreadyAdded
  })

  const departments = ['All Departments', ...Array.from(new Set(employees.map(emp => emp.department)))]

  const handleEmployeeSelect = (employeeId: string) => {
    const newSelected = new Set(selectedEmployees)
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId)
    } else {
      newSelected.add(employeeId)
    }
    setSelectedEmployees(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedEmployees.size === filteredEmployees.length) {
      setSelectedEmployees(new Set())
    } else {
      setSelectedEmployees(new Set(filteredEmployees.map(emp => emp.id)))
    }
  }

  const handleDeselectAll = () => {
    setSelectedEmployees(new Set())
  }

  const handleAddEmployees = async () => {
    if (selectedEmployees.size === 0) {
      toast.error('Please select at least one employee')
      return
    }

    setSaving(true)
    try {
      const employeesToAdd = employees.filter(emp => selectedEmployees.has(emp.id))
      const response = await apiClient.post('/api/attendance/multiple-clockin/employees', {
        employeeIds: Array.from(selectedEmployees)
      })

      if (response.data.success) {
        setAddedEmployees([...addedEmployees, ...employeesToAdd])
        setSelectedEmployees(new Set())
        toast.success(`${employeesToAdd.length} employee(s) added to multiple clock-in`)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add employees')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveEmployee = (employee: Employee) => {
    setDeleteModal({ isOpen: true, employee })
  }

  const confirmRemoveEmployee = async () => {
    if (!deleteModal.employee) return

    try {
      const response = await apiClient.delete(`/api/attendance/multiple-clockin/employees/${deleteModal.employee.id}`)
      
      if (response.data.success) {
        setAddedEmployees(addedEmployees.filter(emp => emp.id !== deleteModal.employee!.id))
        setDeleteModal({ isOpen: false, employee: null })
        setSuccessModal(true)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove employee')
      setDeleteModal({ isOpen: false, employee: null })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded-xl w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded-xl w-96"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage Multiple Clock-in</h1>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Employee Selection */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Multiple Clock-in</h2>
            <p className="text-gray-600 text-sm">You can add specific employees to the multiple clock-in feature</p>
          </div>

          {/* Search and Filter */}
          <div className="space-y-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by employee"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
              />
            </div>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Employee Selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium text-gray-900">Employee(s)</h3>
                <p className="text-sm text-gray-500">Select one or multiple</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  Select All
                </button>
                {selectedEmployees.size > 0 && (
                  <button
                    onClick={handleDeselectAll}
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Deselect All
                  </button>
                )}
              </div>
            </div>

            {/* Employee List */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {filteredEmployees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No employees available</p>
                </div>
              ) : (
                filteredEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    onClick={() => handleEmployeeSelect(employee.id)}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
                  >
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.has(employee.id)}
                        onChange={() => {}}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        selectedEmployees.has(employee.id)
                          ? 'bg-orange-500 border-orange-500'
                          : 'border-gray-300 bg-white'
                      }`}>
                        {selectedEmployees.has(employee.id) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {employee.firstName} {employee.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{employee.department}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add Button */}
          <button
            onClick={handleAddEmployees}
            disabled={selectedEmployees.size === 0 || saving}
            className="w-full px-6 py-3 bg-primary hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200"
          >
            {saving ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Adding...
              </div>
            ) : (
              'Add'
            )}
          </button>
        </div>

        {/* Right Column - Added Employees */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Added Employees ({addedEmployees.length})
            </h2>
            <p className="text-gray-600 text-sm">List of employees enabled for multiple clock-in</p>
          </div>

          {/* Search Added Employees */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
            />
          </div>

          {/* Added Employees List */}
          {addedEmployees.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Employees Enabled Yet</h3>
              <p className="text-gray-500 text-sm">Added employees enabled for multiple clock-in will be saved here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {addedEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-orange-500 rounded border-2 border-orange-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {employee.firstName} {employee.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{employee.department}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleRemoveEmployee(employee)}
                    className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, employee: null })}
        onConfirm={confirmRemoveEmployee}
        employeeName={deleteModal.employee ? `${deleteModal.employee.firstName} ${deleteModal.employee.lastName}` : ''}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={successModal}
        onClose={() => setSuccessModal(false)}
      />
    </div>
  )
}