import { useEffect, useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@/contexts/UserContext'
import { Check, X, Clock, Calendar, AlertCircle } from 'lucide-react'

interface LeaveType {
  id: string;
  name: string;
  days_allowed: number;
  color: string;
}

interface LeaveBalance {
  leave_type_id: string;
  leave_type_name: string;
  leave_type_color: string;
  total_allocated: number;
  used: number;
  pending: number;
}

interface LeaveRequest {
  id: string;
  leave_type_name: string;
  leave_type_color: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  status: string;
  reason: string;
  first_name?: string;
  last_name?: string;
}

export default function LeaveDashboardPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const { user } = useUser()
  const isOwner = user?.role === 'owner' || user?.role === 'admin'
  const isManager = user?.role === 'manager' || user?.role === 'department_head'
  
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  
  const [form, setForm] = useState({
    leave_type_id: '',
    startDate: '',
    endDate: '',
    reason: '',
    halfDay: false
  })

  // Calculate business days
  const [calculatedDays, setCalculatedDays] = useState(0)

  useEffect(() => {
    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate)
      const end = new Date(form.endDate)
      
      if (start > end) {
        setCalculatedDays(0)
        return
      }

      let count = 0
      let curDate = new Date(start)
      while (curDate <= end) {
        const dayOfWeek = curDate.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Sun, 6 = Sat
           count++
        }
        curDate.setDate(curDate.getDate() + 1)
      }
      
      if (form.halfDay) count = 0.5 // If half day checked, override? Or maybe just 0.5 if single day?
      // Better logic: if halfDay is true, it implies a single day or 0.5 deduction? 
      // User prompt implies "half day request" usually means taking 0.5 day off.
      // If range is multiple days, half day usually applies to start or end. 
      // For simplicity here, if halfDay is checked, we assume the total duration is reduced by 0.5 or it is a 0.5 day leave.
      // Let's assume if halfDay is checked, it's a 0.5 day leave for a single date, or we just subtract 0.5?
      // Given the UI "Half Day Request" checkbox, it usually means the whole request is 0.5 days (and usually restricts to 1 day).
      
      if (form.halfDay) {
         // If multiple days selected + half day, it's ambiguous. 
         // But usually half day is for single day.
         // Let's set to 0.5 if it is 1 day.
         if (count === 1) count = 0.5
      }

      setCalculatedDays(count)
    } else {
      setCalculatedDays(0)
    }
  }, [form.startDate, form.endDate, form.halfDay])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Parallel fetches
      const [typesRes, reqsRes] = await Promise.all([
        apiClient.get('/api/leave/types'),
        apiClient.get('/api/leave/requests') // Filters applied automatically by backend based on role
      ])

      if (typesRes.data.success) {
        setLeaveTypes(typesRes.data.data)
        if (typesRes.data.data.length > 0) {
          setForm(prev => ({ ...prev, leave_type_id: typesRes.data.data[0].id }))
        }
      }

      if (reqsRes.data.success) {
        setRequests(reqsRes.data.data)
      }

      if (!isOwner) {
        const balRes = await apiClient.get('/api/leave/balances')
        if (balRes.data.success) {
          setBalances(balRes.data.data)
        }
      }

    } catch (e) {
      console.error(e)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const submitRequest = async () => {
    if (!form.leave_type_id || !form.startDate || !form.endDate || !form.reason) {
      toast.error('Please complete all fields')
      return
    }
    setLoading(true)
    try {
      const res = await apiClient.post('/api/leave/request', {
        leave_type_id: form.leave_type_id,
        start_date: form.startDate,
        end_date: form.endDate,
        reason: form.reason,
        half_day_start: form.halfDay, // Mapping simplified checkbox to start/end logic if needed
        half_day_end: form.halfDay,
        days_requested: calculatedDays
      })
      if (res.data.success) {
        toast.success('Leave requested successfully')
        setForm(prev => ({ ...prev, startDate: '', endDate: '', reason: '', halfDay: false }))
        fetchData() // Refresh list and balances
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to submit leave request')
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (id: string, approved: boolean) => {
    if (!confirm(approved ? 'Approve this request?' : 'Reject this request?')) return;
    try {
      await apiClient.post(`/api/leave/requests/${id}/review`, { approved })
      toast.success(approved ? 'Request approved' : 'Request rejected')
      fetchData()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update request')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Approved</span>
      case 'rejected': return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Rejected</span>
      default: return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Pending</span>
    }
  }

  // Helper to get balance for selected type
  const selectedBalance = balances.find(b => b.leave_type_id === form.leave_type_id);
  const availableDays = selectedBalance 
    ? Number(selectedBalance.total_allocated) - Number(selectedBalance.used) - Number(selectedBalance.pending)
    : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6">
      
      {/* Employee: Balances Cards */}
      {!isOwner && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {balances.map(b => (
            <div key={b.leave_type_id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: b.leave_type_color }}></div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900">{b.leave_type_name}</h3>
                <span className="text-xs text-gray-500">Allocated: {b.total_allocated}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {Number(b.total_allocated) - Number(b.used) - Number(b.pending)}
                <span className="text-sm font-normal text-gray-500 ml-1">days left</span>
              </div>
              <div className="mt-3 text-xs text-gray-500 flex justify-between">
                <span>Used: {b.used}</span>
                <span>Pending: {b.pending}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Owner/Manager: Pending Approvals or Overview */}
      {(isOwner || isManager) && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Leave Requests Management</h2>
            {isOwner && (
               <Button variant="outline" onClick={() => navigate('/dashboard/leave/settings')}>
                Configure Policies
              </Button>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Days</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {r.first_name} {r.last_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.leave_type_color }}></span>
                        {r.leave_type_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(r.start_date).toLocaleDateString()} - {new Date(r.end_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">{r.days_requested}</td>
                    <td className="px-4 py-3">{getStatusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-right">
                      {r.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleReview(r.id, true)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleReview(r.id, false)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No requests found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Employee: Request Form */}
      {!isOwner && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#0F5D5D]" />
              New Request
            </h2>
            
            <div className="space-y-4">
              <div>
                <Select
                  label="Leave Type"
                  options={leaveTypes.map(type => ({ value: type.id, label: type.name }))}
                  value={form.leave_type_id}
                  onChange={(value) => setForm({ ...form, leave_type_id: value })}
                  placeholder="Select leave type"
                />
                {selectedBalance && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Available: {availableDays} days
                  </p>
                )}
              </div>

              {/* Days Preview */}
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Days:</span>
                <span className={`font-bold ${calculatedDays > availableDays ? 'text-red-600' : 'text-[#0F5D5D]'}`}>
                  {calculatedDays} days
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-[#0F5D5D] focus:border-[#0F5D5D]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-[#0F5D5D] focus:border-[#0F5D5D]"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={form.halfDay}
                      onChange={e => setForm({ ...form, halfDay: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#0F5D5D]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0F5D5D]"></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Half Day Request</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-[#0F5D5D] focus:border-[#0F5D5D]"
                  rows={3}
                  placeholder="Reason for leave..."
                />
              </div>

              <Button variant="primary" onClick={submitRequest} loading={loading} className="w-full">
                Submit Request
              </Button>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#0F5D5D]" />
              My History
            </h2>
            <div className="space-y-3">
              {requests.filter(r => !isOwner || r).map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: r.leave_type_color }}></div>
                    <div>
                      <p className="font-medium text-gray-900">{r.leave_type_name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(r.start_date).toLocaleDateString()} - {new Date(r.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="mb-1">{getStatusBadge(r.status)}</div>
                    <span className="text-xs text-gray-500">{r.days_requested} days</span>
                  </div>
                </div>
              ))}
              {requests.length === 0 && (
                <p className="text-center text-gray-500 py-8">No request history found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
