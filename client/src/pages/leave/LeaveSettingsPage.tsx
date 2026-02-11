import { useState } from 'react';
import { Plus, Trash2, Edit2, X, Users, Settings, RefreshCcw, ArrowLeft, Save } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiClient } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';

interface LeaveType {
  id: string;
  name: string;
  slug: string;
  description?: string;
  days_allowed: number;
  is_paid: boolean;
  color: string;
  carry_forward_allowed: boolean;
  max_carry_forward_days: number;
  requires_approval: boolean;
}

interface LeaveBalance {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  leave_type_name: string;
  leave_type_color: string;
  total_allocated: number;
  used: number;
  pending: number;
  carry_forward: number;
}

export default function LeaveSettingsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'types' | 'balances'>('types');
  
  // View State for Types: 'list' | 'form'
  const [viewState, setViewState] = useState<'list' | 'form'>('list');
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [formData, setFormData] = useState<Partial<LeaveType>>({
    name: '',
    slug: '',
    days_allowed: 0,
    is_paid: true,
    color: '#0F5D5D',
    carry_forward_allowed: false,
    max_carry_forward_days: 0,
    requires_approval: true,
  });

  // Modal State (Edit Balance)
  const [editingBalance, setEditingBalance] = useState<LeaveBalance | null>(null);
  const [balanceForm, setBalanceForm] = useState({
    total_allocated: 0,
    used: 0,
    pending: 0,
    carry_forward: 0
  });

  // Bulk Reset State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    leave_type_id: '',
    action: 'reset_allocated',
    value: 0
  });

  // 1. Data Fetching Queries
  const { data: leaveTypes = [], isLoading: isLeaveTypesLoading } = useQuery({
    queryKey: ['leave-types'],
    queryFn: async () => {
      const res = await apiClient.get('/api/leave/types');
      return (res.data.success ? res.data.data : []) as LeaveType[];
    }
  });

  const { data: balances = [], isLoading: isBalancesLoading } = useQuery({
    queryKey: ['leave-balances'],
    queryFn: async () => {
      const res = await apiClient.get('/api/leave/balances/all');
      return (res.data.success ? res.data.data : []) as LeaveBalance[];
    },
    enabled: activeTab === 'balances'
  });

  // 2. Mutations
  const saveTypeMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingType) {
        return apiClient.put(`/api/leave/types/${editingType.id}`, data);
      } else {
        return apiClient.post('/api/leave/types', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types'] });
      toast.success(editingType ? 'Leave type updated' : 'Leave type created');
      setViewState('list');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save leave type');
    }
  });

  const deleteTypeMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/leave/types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types'] });
      toast.success('Leave type deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete leave type');
    }
  });

  const updateBalanceMutation = useMutation({
    mutationFn: (data: any) => apiClient.put(`/api/leave/balances/${editingBalance?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      toast.success('Balance updated');
      setEditingBalance(null);
    },
    onError: () => {
      toast.error('Failed to update balance');
    }
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/leave/balances/reset', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      toast.success('Bulk update completed');
      setShowBulkModal(false);
    },
    onError: () => {
      toast.error('Failed to perform bulk update');
    }
  });

  const loading = activeTab === 'types' ? isLeaveTypesLoading : isBalancesLoading;

  if (loading && (activeTab === 'types' ? leaveTypes.length === 0 : balances.length === 0)) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const handleCreateOrEdit = (type?: LeaveType) => {
    if (type) {
      setEditingType(type);
      setFormData(type);
    } else {
      setEditingType(null);
      setFormData({
        name: '',
        slug: '',
        days_allowed: 20,
        is_paid: true,
        color: '#0F5D5D',
        carry_forward_allowed: false,
        max_carry_forward_days: 0,
        requires_approval: true,
      });
    }
    setViewState('form');
  };

  const handleSave = async () => {
    const dataToSave = {
      ...formData,
      slug: formData.slug || formData.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    };
    saveTypeMutation.mutate(dataToSave);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure? This will delete all balances and requests associated with this type.')) return;
    deleteTypeMutation.mutate(id);
  };

  const handleEditBalance = (balance: LeaveBalance) => {
    setEditingBalance(balance);
    setBalanceForm({
      total_allocated: Number(balance.total_allocated),
      used: Number(balance.used),
      pending: Number(balance.pending),
      carry_forward: Number(balance.carry_forward)
    });
  };

  const saveBalance = async () => {
    if (!editingBalance) return;
    updateBalanceMutation.mutate(balanceForm);
  };

  const handleBulkReset = async () => {
    if (!bulkForm.leave_type_id) {
      toast.error('Please select a leave type');
      return;
    }
    if (!window.confirm('Are you sure? This will update balances for ALL employees.')) return;
    bulkUpdateMutation.mutate(bulkForm);
  };

  // Render Form View for Leave Type
  if (viewState === 'form' && activeTab === 'types') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button 
          onClick={() => setViewState('list')}
          className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Leave Types
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-100 p-6 bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-900">
              {editingType ? 'Edit Leave Type' : 'Create New Leave Type'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">Configure rules, allowances, and carry-forward policies.</p>
          </div>

          <div className="p-6 space-y-8">
            {/* Basic Info */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">General Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F5D5D]/20 focus:border-[#0F5D5D] transition-all outline-none"
                    placeholder="e.g. Annual Leave"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color Tag</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={e => setFormData({...formData, color: e.target.value})}
                      className="h-11 w-20 p-1 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={e => setFormData({...formData, color: e.target.value})}
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F5D5D]/20 focus:border-[#0F5D5D] uppercase transition-all outline-none"
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="border-t border-gray-100"></div>

            {/* Allowance & Rules */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Allowance & Rules</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Days Allowed (Per Year)</label>
                  <input
                    type="number"
                    value={formData.days_allowed}
                    onChange={e => setFormData({...formData, days_allowed: parseInt(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F5D5D]/20 focus:border-[#0F5D5D] transition-all outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-5 rounded-xl border border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.is_paid}
                    onChange={e => setFormData({...formData, is_paid: e.target.checked})}
                    className="w-5 h-5 text-[#0F5D5D] rounded focus:ring-[#0F5D5D]"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 block">Paid Leave</span>
                    <span className="text-xs text-gray-500">Employees are paid for these days off</span>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.requires_approval}
                    onChange={e => setFormData({...formData, requires_approval: e.target.checked})}
                    className="w-5 h-5 text-[#0F5D5D] rounded focus:ring-[#0F5D5D]"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 block">Requires Approval</span>
                    <span className="text-xs text-gray-500">Manager/Admin must approve requests</span>
                  </div>
                </label>
              </div>
            </section>

            <div className="border-t border-gray-100"></div>

            {/* Carry Forward */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Carry Forward Policy</h3>
               <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                <label className="flex items-start gap-3 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={formData.carry_forward_allowed}
                    onChange={e => setFormData({...formData, carry_forward_allowed: e.target.checked})}
                    className="w-5 h-5 text-[#0F5D5D] rounded focus:ring-[#0F5D5D] mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 block">Allow Unused Leave Carry Forward</span>
                    <span className="text-xs text-gray-500 block mt-1">Enable employees to transfer unused leave days to the next year's balance.</span>
                  </div>
                </label>
                
                {formData.carry_forward_allowed && (
                  <div className="ml-8 animate-in fade-in slide-in-from-top-2 duration-200">
                     <label className="block text-sm font-medium text-gray-700 mb-1">Max Days to Carry Forward</label>
                     <input
                      type="number"
                      value={formData.max_carry_forward_days}
                      onChange={e => setFormData({...formData, max_carry_forward_days: parseInt(e.target.value)})}
                      className="w-full max-w-xs px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F5D5D]/20 focus:border-[#0F5D5D] transition-all outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">Limit the number of days that can be carried over.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
            <Button
              variant="outline"
              onClick={() => setViewState('list')}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              loading={saveTypeMutation.isPending}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {editingType ? 'Save Changes' : 'Create Leave Type'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main List View
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Settings</h1>
          <p className="text-gray-600 mt-1">Manage leave types and employee balances</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'types' && (
            <button
              onClick={() => handleCreateOrEdit()}
              className="bg-[#0F5D5D] hover:bg-[#0a4545] text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Leave Type
            </button>
          )}
          {activeTab === 'balances' && (
            <button
              onClick={() => setShowBulkModal(true)}
              className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm inline-flex items-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Bulk Update
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('types')}
          className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'types'
              ? 'border-[#0F5D5D] text-[#0F5D5D]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Settings className="w-4 h-4" />
          Leave Types
        </button>
        <button
          onClick={() => setActiveTab('balances')}
          className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'balances'
              ? 'border-[#0F5D5D] text-[#0F5D5D]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Employee Balances
        </button>
      </div>

      {activeTab === 'types' ? (
        loading ? (
          <div className="text-center py-12 text-gray-500">Loading settings...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leaveTypes.map((type) => (
              <div key={type.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer" onClick={() => handleCreateOrEdit(type)}>
                <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: type.color }}></div>
                
                <div className="flex justify-between items-start mb-4 pl-3">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 group-hover:text-[#0F5D5D] transition-colors">{type.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${type.is_paid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {type.is_paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); handleCreateOrEdit(type); }} className="p-1.5 text-gray-400 hover:text-[#0F5D5D] hover:bg-gray-50 rounded-md">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(type.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pl-3 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Allowance:</span>
                    <span className="font-medium text-gray-900">{type.days_allowed} days/year</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Carry Forward:</span>
                    <span className="font-medium text-gray-900">{type.carry_forward_allowed ? `Yes (Max ${type.max_carry_forward_days})` : 'No'}</span>
                  </div>
                </div>
              </div>
            ))}
            
            {leaveTypes.length === 0 && (
              <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">No leave types configured yet. Click "Add Leave Type" to get started.</p>
              </div>
            )}
          </div>
        )
      ) : (
        /* Employee Balances Tab */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Leave Type</th>
                  <th className="px-6 py-3 text-center">Allocated</th>
                  <th className="px-6 py-3 text-center">Used</th>
                  <th className="px-6 py-3 text-center">Pending</th>
                  <th className="px-6 py-3 text-center">Remaining</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {balances.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {b.first_name} {b.last_name}
                      <div className="text-xs text-gray-500 font-normal">{b.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.leave_type_color }}></span>
                        {b.leave_type_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-medium">{b.total_allocated}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{b.used}</td>
                    <td className="px-6 py-4 text-center text-yellow-600">{b.pending}</td>
                    <td className="px-6 py-4 text-center font-bold text-gray-900">
                      {Number(b.total_allocated) - Number(b.used) - Number(b.pending)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleEditBalance(b)}
                        className="text-[#0F5D5D] hover:text-[#0a4545] font-medium text-xs border border-[#0F5D5D] px-2 py-1 rounded hover:bg-[#0F5D5D]/5 transition-colors"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))}
                {balances.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No employee balances found. Balances are created when employees first view their dashboard or request leave.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Balance Edit Modal (Kept as modal for quick edits) */}
      {editingBalance && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Adjust Balance</h2>
                <p className="text-sm text-gray-500">{editingBalance.first_name} {editingBalance.last_name} - {editingBalance.leave_type_name}</p>
              </div>
              <button onClick={() => setEditingBalance(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Allocated</label>
                <input
                  type="number"
                  value={balanceForm.total_allocated}
                  onChange={e => setBalanceForm({...balanceForm, total_allocated: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-[#0F5D5D] focus:border-[#0F5D5D]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Used Days</label>
                <input
                  type="number"
                  value={balanceForm.used}
                  onChange={e => setBalanceForm({...balanceForm, used: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-[#0F5D5D] focus:border-[#0F5D5D]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pending Requests</label>
                <input
                  type="number"
                  value={balanceForm.pending}
                  onChange={e => setBalanceForm({...balanceForm, pending: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-[#0F5D5D] focus:border-[#0F5D5D]"
                  readOnly
                  disabled
                />
                <p className="text-xs text-gray-400 mt-1">Pending days are updated automatically via requests</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <Button variant="outline" onClick={() => setEditingBalance(null)}>Cancel</Button>
              <Button onClick={saveBalance} loading={updateBalanceMutation.isPending}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Bulk Update Balances</h2>
              <button onClick={() => setShowBulkModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 mb-4">
                Warning: This action will update balances for <strong>ALL employees</strong> for the selected leave type.
              </div>

              <div>
                <Select
                  label="Leave Type"
                  options={leaveTypes.map(t => ({ value: t.id, label: t.name }))}
                  value={bulkForm.leave_type_id}
                  onChange={(val) => setBulkForm({...bulkForm, leave_type_id: val})}
                />
              </div>

              <div>
                <Select
                  label="Action"
                  options={[
                    { value: 'reset_allocated', label: 'Reset Total Allocation To...' },
                    { value: 'add_allocated', label: 'Add To Allocation...' },
                    { value: 'reset_used', label: 'Reset \'Used\' Days to 0' },
                  ]}
                  value={bulkForm.action}
                  onChange={(val) => setBulkForm({...bulkForm, action: val})}
                />
              </div>

              {bulkForm.action !== 'reset_used' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Days</label>
                  <input
                    type="number"
                    value={bulkForm.value}
                    onChange={e => setBulkForm({...bulkForm, value: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#0F5D5D] focus:border-[#0F5D5D] outline-none transition-all"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <Button variant="outline" onClick={() => setShowBulkModal(false)}>Cancel</Button>
              <Button variant="danger" onClick={handleBulkReset} loading={bulkUpdateMutation.isPending}>Confirm Update</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
