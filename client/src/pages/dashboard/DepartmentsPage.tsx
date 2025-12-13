import React, { useState, useEffect } from 'react';
import { Plus, Users, User, Edit, Trash2, Building2, UserPlus } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/contexts/ToastContext';
import { apiClient } from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SuccessModal from '@/components/ui/SuccessModal';

interface Department {
  id: string;
  name: string;
  description: string;
  manager_id?: string;
  manager_name?: string;
  manager_email?: string;
  employee_count: number;
  employees?: Employee[];
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const DepartmentsPage: React.FC = () => {
  const { user } = useUser();
  const toast = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<{show: boolean, department: Department | null}>({
    show: false,
    department: null
  });
  const [showAssignModal, setShowAssignModal] = useState<{show: boolean, department: Department | null}>({
    show: false,
    department: null
  });
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [successModal, setSuccessModal] = useState<{show: boolean, title: string, message: string}>({
    show: false,
    title: '',
    message: ''
  });

  const [newDepartment, setNewDepartment] = useState({
    name: '',
    description: '',
    managerId: ''
  });

  const [assignForm, setAssignForm] = useState({
    employeeId: ''
  });

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await apiClient.get('/api/departments');
      if (response.data.success) {
        setDepartments(response.data.data);
      } else {
        toast.error('Failed to fetch departments');
      }
    } catch (error: any) {
      console.error('Failed to fetch departments:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await apiClient.get('/api/employees');
      if (response.data.success) {
        setEmployees(response.data.data);
      } else {
        toast.error('Failed to fetch employees');
      }
    } catch (error: any) {
      console.error('Failed to fetch employees:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch employees');
    }
  };

  const fetchDepartmentDetails = async (departmentId: string) => {
    try {
      const response = await apiClient.get(`/api/departments/${departmentId}`);
      if (response.data.success) {
        setSelectedDepartment(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch department details:', error);
    }
  };

  const createDepartment = async () => {
    if (creating) return;
    
    setCreating(true);
    try {
      const response = await apiClient.post('/api/departments', {
        name: newDepartment.name,
        description: newDepartment.description,
        managerId: newDepartment.managerId || null
      });

      if (response.data.success) {
        setShowCreateModal(false);
        setNewDepartment({
          name: '',
          description: '',
          managerId: ''
        });
        fetchDepartments();
        fetchEmployees(); // Refresh to update roles
        
        // Show success modal
        setSuccessModal({
          show: true,
          title: 'Department Created!',
          message: 'The department has been created successfully and is now available for employee assignment.'
        });
      } else {
        toast.error(response.data.message || 'Failed to create department');
      }
    } catch (error: any) {
      console.error('Failed to create department:', error);
      toast.error(error.response?.data?.message || 'Failed to create department');
    } finally {
      setCreating(false);
    }
  };

  const updateDepartment = async () => {
    if (!showEditModal.department || updating) return;

    setUpdating(true);
    try {
      const response = await apiClient.put(`/api/departments/${showEditModal.department.id}`, {
        name: newDepartment.name,
        description: newDepartment.description,
        managerId: newDepartment.managerId || null
      });

      if (response.data.success) {
        setShowEditModal({ show: false, department: null });
        setNewDepartment({
          name: '',
          description: '',
          managerId: ''
        });
        fetchDepartments();
        fetchEmployees(); // Refresh to update roles
        
        // Show success modal
        setSuccessModal({
          show: true,
          title: 'Department Updated!',
          message: 'The department information has been updated successfully.'
        });
      } else {
        toast.error(response.data.message || 'Failed to update department');
      }
    } catch (error: any) {
      console.error('Failed to update department:', error);
      toast.error(error.response?.data?.message || 'Failed to update department');
    } finally {
      setUpdating(false);
    }
  };

  const deleteDepartment = async (departmentId: string) => {
    if (deleting === departmentId) return;
    
    if (!confirm('Are you sure you want to delete this department? This action cannot be undone.')) {
      return;
    }

    setDeleting(departmentId);
    try {
      const response = await apiClient.delete(`/api/departments/${departmentId}`);
      if (response.data.success) {
        fetchDepartments();
        if (selectedDepartment?.id === departmentId) {
          setSelectedDepartment(null);
        }
        
        // Show success modal
        setSuccessModal({
          show: true,
          title: 'Department Deleted!',
          message: 'The department has been successfully removed from your organization.'
        });
      } else {
        toast.error(response.data.message || 'Failed to delete department');
      }
    } catch (error: any) {
      console.error('Failed to delete department:', error);
      toast.error(error.response?.data?.message || 'Failed to delete department');
    } finally {
      setDeleting(null);
    }
  };

  const assignEmployeeToDepartment = async () => {
    if (!showAssignModal.department || assigning) return;

    setAssigning(true);
    try {
      const response = await apiClient.post(`/api/departments/${showAssignModal.department.id}/assign-employee`, {
        employeeId: assignForm.employeeId
      });

      if (response.data.success) {
        toast.success('Employee assigned successfully');
        setShowAssignModal({ show: false, department: null });
        setAssignForm({ employeeId: '' });
        fetchDepartments();
        if (selectedDepartment?.id === showAssignModal.department.id) {
          fetchDepartmentDetails(showAssignModal.department.id);
        }
      } else {
        toast.error(response.data.message || 'Failed to assign employee');
      }
    } catch (error: any) {
      console.error('Failed to assign employee:', error);
      toast.error(error.response?.data?.message || 'Failed to assign employee to department');
    } finally {
      setAssigning(false);
    }
  };

  const openEditModal = (department: Department) => {
    setNewDepartment({
      name: department.name,
      description: department.description || '',
      managerId: department.manager_id || ''
    });
    setShowEditModal({ show: true, department });
  };

  // Filter employees not assigned to any department or not managers
  const availableEmployees = employees.filter(emp => 
    emp.is_active && 
    emp.role !== 'owner' && 
    emp.role !== 'admin'
  );

  // Filter employees for manager selection (not already managers of other departments)
  const availableManagers = employees.filter(emp => 
    emp.is_active && 
    emp.role !== 'owner' && 
    (emp.role !== 'department_manager' || 
     (showEditModal.department && emp.id === showEditModal.department.manager_id))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-2 md:p-3 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Department Management</h1>
          <p className="text-gray-600">Organize your team into departments with dedicated managers</p>
        </div>
        
        {['owner', 'admin'].includes(user?.role || '') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 sm:mt-0 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            Create Department
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Departments List */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {departments.map((department) => (
              <div 
                key={department.id} 
                className={`bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200 cursor-pointer ${
                  selectedDepartment?.id === department.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => fetchDepartmentDetails(department.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{department.name}</h3>
                      <p className="text-sm text-gray-600">{department.employee_count} employees</p>
                    </div>
                  </div>

                  {['owner', 'admin'].includes(user?.role || '') && (
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(department);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDepartment(department.id);
                        }}
                        disabled={deleting === department.id}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deleting === department.id ? (
                          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-red-500" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {department.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{department.description}</p>
                )}

                <div className="space-y-2">
                  {department.manager_name ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      <span>Manager: {department.manager_name}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-orange-600">
                      <User className="w-4 h-4" />
                      <span>No manager assigned</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{department.employee_count} team members</span>
                  </div>
                </div>

                {['owner', 'admin'].includes(user?.role || '') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAssignModal({ show: true, department });
                    }}
                    className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Assign Employee
                  </button>
                )}
              </div>
            ))}
          </div>

          {departments.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No departments found</h3>
              <p className="text-gray-600">Create your first department to organize your team.</p>
            </div>
          )}
        </div>

        {/* Department Details */}
        <div className="lg:col-span-1">
          {selectedDepartment ? (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 sticky top-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedDepartment.name}</h3>
                  <p className="text-sm text-gray-600">Department Details</p>
                </div>
              </div>

              {selectedDepartment.description && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600 text-sm">{selectedDepartment.description}</p>
                </div>
              )}

              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Manager</h4>
                {selectedDepartment.manager_name ? (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="font-medium text-gray-900">{selectedDepartment.manager_name}</p>
                    <p className="text-sm text-gray-600">{selectedDepartment.manager_email}</p>
                  </div>
                ) : (
                  <p className="text-orange-600 text-sm">No manager assigned</p>
                )}
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Team Members ({selectedDepartment.employees?.length || 0})</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedDepartment.employees?.map((employee) => (
                    <div key={employee.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {employee.first_name} {employee.last_name}
                          </p>
                          <p className="text-sm text-gray-600">{employee.email}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          employee.role === 'department_manager' 
                            ? 'bg-primary/10 text-primary' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {employee.role.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  )) || []}
                  
                  {(!selectedDepartment.employees || selectedDepartment.employees.length === 0) && (
                    <p className="text-gray-500 text-sm text-center py-4">No employees assigned</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 text-center">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Department</h3>
              <p className="text-gray-600 text-sm">Click on a department to view its details and team members.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Department Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Create Department</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department Name *</label>
                  <input
                    type="text"
                    value={newDepartment.name}
                    onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                    placeholder="e.g., Engineering, Sales, Marketing"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newDepartment.description}
                    onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                    placeholder="Brief description of the department"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department Manager</label>
                  <select
                    value={newDepartment.managerId}
                    onChange={(e) => setNewDepartment({ ...newDepartment, managerId: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                  >
                    <option value="">Select manager (optional)</option>
                    {availableManagers.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Selected employee will be promoted to Department Manager role
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={createDepartment}
                  disabled={!newDepartment.name || creating}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Department'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {showEditModal.show && showEditModal.department && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Edit Department</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department Name *</label>
                  <input
                    type="text"
                    value={newDepartment.name}
                    onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                    placeholder="e.g., Engineering, Sales, Marketing"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newDepartment.description}
                    onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                    placeholder="Brief description of the department"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department Manager</label>
                  <select
                    value={newDepartment.managerId}
                    onChange={(e) => setNewDepartment({ ...newDepartment, managerId: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                  >
                    <option value="">Select manager (optional)</option>
                    {availableManagers.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Changing manager will update employee roles accordingly
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditModal({ show: false, department: null })}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={updateDepartment}
                  disabled={!newDepartment.name || updating}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {updating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Department'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Employee Modal */}
      {showAssignModal.show && showAssignModal.department && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Assign Employee to {showAssignModal.department.name}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Employee *</label>
                  <select
                    value={assignForm.employeeId}
                    onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                  >
                    <option value="">Choose an employee</option>
                    {availableEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} - {emp.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAssignModal({ show: false, department: null })}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={assignEmployeeToDepartment}
                  disabled={!assignForm.employeeId || assigning}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {assigning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    'Assign Employee'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <SuccessModal
        isOpen={successModal.show}
        onClose={() => setSuccessModal({ show: false, title: '', message: '' })}
        title={successModal.title}
        message={successModal.message}
      />
    </div>
  );
};

export default DepartmentsPage;