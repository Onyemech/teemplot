import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, Settings, Trash2, X } from 'lucide-react';
import SuccessModal from '@/components/ui/SuccessModal';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/contexts/ToastContext';
import { apiClient } from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  dept_manager_status?: 'pending' | 'approved' | 'rejected';
  user_name: string;
  user_email: string;
  dept_manager_reviewed_by?: string;
  final_reviewed_by?: string;
  created_at: string;
}

interface LeaveType {
  id: string;
  name: string;
  code: string;
  annual_allocation: number;
  color: string;
}

interface LeaveBalance {
  id: string;
  allocated_days: number;
  used_days: number;
  remaining_days: number;
  leave_type_name: string;
  leave_type_color: string;
}

const LeaveManagementPage: React.FC = () => {
  const { user } = useUser();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'requests' | 'balances' | 'types'>('requests');
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState<{show: boolean, request: LeaveRequest | null, type: 'approve' | 'reject'}>({
    show: false,
    request: null,
    type: 'approve'
  });
  const [showSuccessModal, setShowSuccessModal] = useState<{show: boolean, message: string}>({
    show: false,
    message: ''
  });
  
  // CRUD modals and states
  const [showEditTypeModal, setShowEditTypeModal] = useState<{show: boolean, type: LeaveType | null}>({
    show: false,
    type: null
  });
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<{show: boolean, type: LeaveType | null}>({
    show: false,
    type: null
  });
  const [showResetBalanceModal, setShowResetBalanceModal] = useState<{show: boolean, employee: any | null, leaveType: LeaveType | null}>({
    show: false,
    employee: null,
    leaveType: null
  });
  
  // Loading states
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Forms
  const [newRequest, setNewRequest] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    halfDay: false
  });

  const [newType, setNewType] = useState({
    name: '',
    code: '',
    annualAllocation: '',
    color: '#0F5D5D'
  });

  const [balanceForm, setBalanceForm] = useState({
    userId: '',
    leaveTypeId: '',
    allocatedDays: ''
  });

  const [filters, setFilters] = useState({
    status: '',
    userId: ''
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchLeaveRequests(),
        fetchLeaveTypes(),
        fetchLeaveBalances(),
        user?.role !== 'employee' && fetchEmployees()
      ]);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const response = await apiClient.get('/api/leave/requests');
      if (response.data.success) {
        setLeaveRequests(response.data.data);
      } else {
        toast.error('Failed to fetch leave requests');
      }
    } catch (error: any) {
      console.error('Failed to fetch leave requests:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch leave requests');
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const response = await apiClient.get('/api/leave/types');
      if (response.data.success) {
        setLeaveTypes(response.data.data);
      } else {
        toast.error('Failed to fetch leave types');
      }
    } catch (error: any) {
      console.error('Failed to fetch leave types:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch leave types');
    }
  };

  const fetchLeaveBalances = async () => {
    try {
      const response = await apiClient.get('/api/leave/balances');
      if (response.data.success) {
        setLeaveBalances(response.data.data);
      } else {
        toast.error('Failed to fetch leave balances');
      }
    } catch (error: any) {
      console.error('Failed to fetch leave balances:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await apiClient.get('/api/employees');
      if (response.data.success) {
        setEmployees(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const submitLeaveRequest = async () => {
    try {
      const response = await apiClient.post('/api/leave/request', {
        leaveType: newRequest.leaveType,
        startDate: newRequest.startDate,
        endDate: newRequest.endDate,
        reason: newRequest.reason,
        halfDay: newRequest.halfDay
      });

      if (response.data.success) {
        setShowRequestModal(false);
        setNewRequest({
          leaveType: '',
          startDate: '',
          endDate: '',
          reason: '',
          halfDay: false
        });
        fetchLeaveRequests();
        setShowSuccessModal({
          show: true,
          message: 'Leave request submitted successfully'
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit leave request');
    }
  };

  const createLeaveType = async () => {
    try {
      const response = await apiClient.post('/api/leave/types', {
        name: newType.name,
        code: newType.code,
        annualAllocation: parseInt(newType.annualAllocation),
        color: newType.color
      });

      if (response.data.success) {
        setShowTypeModal(false);
        setNewType({
          name: '',
          code: '',
          annualAllocation: '',
          color: '#0F5D5D'
        });
        fetchLeaveTypes();
        setShowSuccessModal({
          show: true,
          message: 'Leave type created successfully'
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create leave type');
    }
  };

  const setLeaveBalance = async () => {
    try {
      const response = await apiClient.post('/api/leave/balances/set', {
        userId: balanceForm.userId,
        leaveTypeId: balanceForm.leaveTypeId,
        allocatedDays: parseFloat(balanceForm.allocatedDays)
      });

      if (response.data.success) {
        setShowBalanceModal(false);
        setBalanceForm({
          userId: '',
          leaveTypeId: '',
          allocatedDays: ''
        });
        fetchLeaveBalances();
        setShowSuccessModal({
          show: true,
          message: 'Leave balance updated successfully'
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update leave balance');
    }
  };

  const handleLeaveApproval = async (approved: boolean, notes: string) => {
    if (!showApprovalModal.request) return;

    try {
      const endpoint = user?.role === 'department_manager' 
        ? `/api/leave/requests/${showApprovalModal.request.id}/dept-review`
        : `/api/leave/requests/${showApprovalModal.request.id}/final-review`;

      const response = await apiClient.post(endpoint, {
        approved,
        notes
      });

      if (response.data.success) {
        setShowApprovalModal({ show: false, request: null, type: 'approve' });
        fetchLeaveRequests();
        setShowSuccessModal({
          show: true,
          message: `Leave request ${approved ? 'approved' : 'rejected'} successfully`
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to process leave request');
    }
  };

  // Update leave type
  const handleUpdateLeaveType = async (updatedType: LeaveType) => {
    setSubmitting(true);
    try {
      const response = await apiClient.put(`/api/leave/types/${updatedType.id}`, {
        name: updatedType.name,
        code: updatedType.code,
        annualAllocation: updatedType.annual_allocation,
        color: updatedType.color
      });

      if (response.data.success) {
        setShowEditTypeModal({ show: false, type: null });
        fetchLeaveTypes();
        toast.success('Leave type updated successfully');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update leave type');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete leave type with confirmation
  const handleDeleteLeaveType = async () => {
    if (!showDeleteConfirmModal.type) return;
    
    setDeleting(true);
    try {
      const response = await apiClient.delete(`/api/leave/types/${showDeleteConfirmModal.type.id}`);

      if (response.data.success) {
        setShowDeleteConfirmModal({ show: false, type: null });
        fetchLeaveTypes();
        toast.success(response.data.message || 'Leave type deleted successfully');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete leave type');
    } finally {
      setDeleting(false);
    }
  };

  // Reset employee leave balance
  const handleResetLeaveBalance = async (newBalance: number) => {
    if (!showResetBalanceModal.employee || !showResetBalanceModal.leaveType) return;
    
    setResetting(true);
    try {
      const response = await apiClient.post(`/api/leave/balances/${showResetBalanceModal.employee.id}/reset`, {
        leaveTypeId: showResetBalanceModal.leaveType.id,
        newBalance
      });

      if (response.data.success) {
        setShowResetBalanceModal({ show: false, employee: null, leaveType: null });
        fetchLeaveBalances();
        toast.success('Leave balance reset successfully');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reset leave balance');
    } finally {
      setResetting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredRequests = leaveRequests.filter(request => {
    if (filters.status && request.status !== filters.status) return false;
    if (filters.userId && !request.user_name.toLowerCase().includes(filters.userId.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Leave Management</h1>
          <p className="text-gray-600">Manage leave requests and balances</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 bg-white rounded-xl shadow-lg border border-gray-100 p-2">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'requests'
              ? 'bg-primary text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Leave Requests
        </button>
        <button
          onClick={() => setActiveTab('balances')}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'balances'
              ? 'bg-primary text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Leave Balances
        </button>
        {['owner', 'admin'].includes(user?.role || '') && (
          <button
            onClick={() => setActiveTab('types')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'types'
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Leave Types
          </button>
        )}
      </div>

      {/* Leave Requests Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setShowRequestModal(true)}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-medium"
            >
              <Plus className="w-5 h-5" />
              Request Leave
            </button>

            {user?.role !== 'employee' && (
              <div className="flex gap-2">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                
                <input
                  type="text"
                  placeholder="Filter by employee..."
                  value={filters.userId}
                  onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                />
              </div>
            )}
          </div>

          {/* Requests List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{request.leave_type}</h3>
                    <p className="text-sm text-gray-600">{request.user_name}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getStatusColor(request.status)}`}>
                    {request.status.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{request.total_days} day{request.total_days !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{request.reason}</p>

                {/* Department Manager Status */}
                {request.dept_manager_status && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Department Manager Review:</p>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(request.dept_manager_status)}`}>
                      {request.dept_manager_status.toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                {request.status === 'pending' && 
                 ['owner', 'admin', 'department_manager'].includes(user?.role || '') && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowApprovalModal({ show: true, request, type: 'approve' })}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-sm font-medium"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setShowApprovalModal({ show: true, request, type: 'reject' })}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-sm font-medium"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredRequests.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leave requests found</h3>
              <p className="text-gray-600">No leave requests match your current filters.</p>
            </div>
          )}
        </div>
      )}

      {/* Leave Balances Tab */}
      {activeTab === 'balances' && (
        <div className="space-y-6">
          {['owner', 'admin'].includes(user?.role || '') && (
            <button
              onClick={() => setShowBalanceModal(true)}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-medium"
            >
              <Settings className="w-5 h-5" />
              Set Leave Balance
            </button>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leaveBalances.map((balance) => (
              <div key={balance.id} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: balance.leave_type_color }}
                  />
                  <h3 className="text-lg font-semibold text-gray-900">{balance.leave_type_name}</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Allocated:</span>
                    <span className="font-medium">{balance.allocated_days} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Used:</span>
                    <span className="font-medium text-red-600">{balance.used_days} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Remaining:</span>
                    <span className="font-medium text-green-600">{balance.remaining_days} days</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min((balance.used_days / balance.allocated_days) * 100, 100)}%`,
                        backgroundColor: balance.leave_type_color
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round((balance.used_days / balance.allocated_days) * 100)}% used
                  </p>
                </div>
              </div>
            ))}
          </div>

          {leaveBalances.length === 0 && (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leave balances found</h3>
              <p className="text-gray-600">Leave balances will appear here once configured.</p>
            </div>
          )}
        </div>
      )}

      {/* Leave Types Tab */}
      {activeTab === 'types' && ['owner', 'admin'].includes(user?.role || '') && (
        <div className="space-y-6">
          <button
            onClick={() => setShowTypeModal(true)}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            Create Leave Type
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leaveTypes.map((type) => (
              <div key={type.id} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: type.color }}
                  />
                  <h3 className="text-lg font-semibold text-gray-900">{type.name}</h3>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Code:</span> {type.code}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Annual Allocation:</span> {type.annual_allocation} days
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Leave Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Request Leave</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type *</label>
                  <select
                    value={newRequest.leaveType}
                    onChange={(e) => setNewRequest({ ...newRequest, leaveType: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                  >
                    <option value="">Select leave type</option>
                    {leaveTypes.map((type) => (
                      <option key={type.id} value={type.code.toLowerCase()}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                    <input
                      type="date"
                      value={newRequest.startDate}
                      onChange={(e) => setNewRequest({ ...newRequest, startDate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                    <input
                      type="date"
                      value={newRequest.endDate}
                      onChange={(e) => setNewRequest({ ...newRequest, endDate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
                  <textarea
                    value={newRequest.reason}
                    onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                    placeholder="Enter reason for leave"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="halfDay"
                    checked={newRequest.halfDay}
                    onChange={(e) => setNewRequest({ ...newRequest, halfDay: e.target.checked })}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="halfDay" className="text-sm text-gray-700">Half day leave</label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={submitLeaveRequest}
                  disabled={!newRequest.leaveType || !newRequest.startDate || !newRequest.endDate || !newRequest.reason}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal.show && showApprovalModal.request && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {showApprovalModal.type === 'approve' ? 'Approve Leave?' : 'Reject Leave?'}
              </h2>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to {showApprovalModal.type} this leave request?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowApprovalModal({ show: false, request: null, type: 'approve' })}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleLeaveApproval(showApprovalModal.type === 'approve', '')}
                  className={`flex-1 px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium text-white ${
                    showApprovalModal.type === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Yes, {showApprovalModal.type === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal.show}
        onClose={() => setShowSuccessModal({ show: false, message: '' })}
        title="Success!"
        message={showSuccessModal.message}

      />

      {/* Create Leave Type Modal */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Create Leave Type</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                  <input
                    type="text"
                    value={newType.name}
                    onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                    placeholder="e.g., Annual Leave"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Code *</label>
                  <input
                    type="text"
                    value={newType.code}
                    onChange={(e) => setNewType({ ...newType, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                    placeholder="e.g., ANNUAL"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Annual Allocation (days)</label>
                  <input
                    type="number"
                    value={newType.annualAllocation}
                    onChange={(e) => setNewType({ ...newType, annualAllocation: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                    placeholder="21"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                  <input
                    type="color"
                    value={newType.color}
                    onChange={(e) => setNewType({ ...newType, color: e.target.value })}
                    className="w-full h-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowTypeModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={createLeaveType}
                  disabled={!newType.name || !newType.code}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Type
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Set Balance Modal */}
      {showBalanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Set Leave Balance</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employee *</label>
                  <select
                    value={balanceForm.userId}
                    onChange={(e) => setBalanceForm({ ...balanceForm, userId: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                  >
                    <option value="">Select employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type *</label>
                  <select
                    value={balanceForm.leaveTypeId}
                    onChange={(e) => setBalanceForm({ ...balanceForm, leaveTypeId: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                  >
                    <option value="">Select leave type</option>
                    {leaveTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Allocated Days *</label>
                  <input
                    type="number"
                    step="0.5"
                    value={balanceForm.allocatedDays}
                    onChange={(e) => setBalanceForm({ ...balanceForm, allocatedDays: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                    placeholder="21"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowBalanceModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={setLeaveBalance}
                  disabled={!balanceForm.userId || !balanceForm.leaveTypeId || !balanceForm.allocatedDays}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Set Balance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Leave Type Modal */}
      {showEditTypeModal.show && showEditTypeModal.type && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Edit Leave Type</h2>
              <button
                onClick={() => setShowEditTypeModal({ show: false, type: null })}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <EditLeaveTypeForm
                leaveType={showEditTypeModal.type}
                onSubmit={handleUpdateLeaveType}
                onCancel={() => setShowEditTypeModal({ show: false, type: null })}
                submitting={submitting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal.show && showDeleteConfirmModal.type && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Leave Type</h3>
                  <p className="text-gray-600">This action cannot be undone</p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <p className="text-red-800 text-sm">
                  Are you sure you want to delete "<strong>{showDeleteConfirmModal.type.name}</strong>"? 
                  This will remove the leave type and may affect existing leave balances.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirmModal({ show: false, type: null })}
                  disabled={deleting}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                  onBlur={(e) => e.target.blur()}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteLeaveType}
                  disabled={deleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium flex items-center justify-center gap-2"
                  onBlur={(e) => e.target.blur()}
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Balance Modal */}
      {showResetBalanceModal.show && showResetBalanceModal.employee && showResetBalanceModal.leaveType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Reset Leave Balance</h2>
              <button
                onClick={() => setShowResetBalanceModal({ show: false, employee: null, leaveType: null })}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <ResetBalanceForm
                employee={showResetBalanceModal.employee}
                leaveType={showResetBalanceModal.leaveType}
                onSubmit={handleResetLeaveBalance}
                onCancel={() => setShowResetBalanceModal({ show: false, employee: null, leaveType: null })}
                resetting={resetting}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Components
interface EditLeaveTypeFormProps {
  leaveType: LeaveType;
  onSubmit: (type: LeaveType) => void;
  onCancel: () => void;
  submitting: boolean;
}

const EditLeaveTypeForm: React.FC<EditLeaveTypeFormProps> = ({ leaveType, onSubmit, onCancel, submitting }) => {
  const [formData, setFormData] = useState({
    name: leaveType.name,
    code: leaveType.code,
    annual_allocation: leaveType.annual_allocation,
    color: leaveType.color
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...leaveType,
      ...formData
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
          placeholder="Annual Leave"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Code *</label>
        <input
          type="text"
          required
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
          placeholder="ANNUAL"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Annual Allocation (days) *</label>
        <input
          type="number"
          required
          min="0"
          value={formData.annual_allocation}
          onChange={(e) => setFormData({ ...formData, annual_allocation: parseInt(e.target.value) })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
          placeholder="21"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
        <input
          type="color"
          value={formData.color}
          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
          className="w-full h-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium"
          onBlur={(e) => e.target.blur()}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium flex items-center justify-center gap-2"
          onBlur={(e) => e.target.blur()}
        >
          {submitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Updating...
            </>
          ) : (
            'Update Leave Type'
          )}
        </button>
      </div>
    </form>
  );
};

interface ResetBalanceFormProps {
  employee: any;
  leaveType: LeaveType;
  onSubmit: (newBalance: number) => void;
  onCancel: () => void;
  resetting: boolean;
}

const ResetBalanceForm: React.FC<ResetBalanceFormProps> = ({ employee, leaveType, onSubmit, onCancel, resetting }) => {
  const [newBalance, setNewBalance] = useState(leaveType.annual_allocation);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(newBalance);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <h4 className="font-medium text-gray-900 mb-2">Employee Details</h4>
        <p className="text-sm text-gray-600">
          <strong>Name:</strong> {employee.first_name} {employee.last_name}
        </p>
        <p className="text-sm text-gray-600">
          <strong>Leave Type:</strong> {leaveType.name}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">New Balance (days) *</label>
        <input
          type="number"
          required
          min="0"
          value={newBalance}
          onChange={(e) => setNewBalance(parseInt(e.target.value))}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
          placeholder="21"
        />
        <p className="text-xs text-gray-500 mt-1">
          Default allocation: {leaveType.annual_allocation} days
        </p>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <p className="text-orange-800 text-sm">
          <strong>Warning:</strong> This will reset the employee's leave balance. 
          Any used days will be preserved, but the total allocation will be updated.
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={resetting}
          className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium"
          onBlur={(e) => e.target.blur()}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={resetting}
          className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-600/50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium flex items-center justify-center gap-2"
          onBlur={(e) => e.target.blur()}
        >
          {resetting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Resetting...
            </>
          ) : (
            'Reset Balance'
          )}
        </button>
      </div>
    </form>
  );
};

export default LeaveManagementPage;