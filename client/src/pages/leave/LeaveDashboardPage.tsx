import { useEffect, useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'
import Button from '@/components/ui/Button'

export default function LeaveDashboardPage() {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState<any[]>([])
  const [form, setForm] = useState({
    leaveType: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
    halfDay: false
  })

  const fetchRequests = async () => {
    try {
      const res = await apiClient.get('/api/leave/requests')
      if (res.data.success) {
        setRequests(res.data.data)
      }
    } catch (e) {
      toast.error('Failed to load leave requests')
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const submitRequest = async () => {
    if (!form.leaveType || !form.startDate || !form.endDate || !form.reason) {
      toast.error('Please complete all fields')
      return
    }
    setLoading(true)
    try {
      const res = await apiClient.post('/api/leave/request', form)
      if (res.data.success) {
        toast.success(res.data.message || 'Leave requested')
        setForm({ leaveType: 'annual', startDate: '', endDate: '', reason: '', halfDay: false })
        fetchRequests()
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to submit leave request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#e0e0e0] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[#212121] mb-4">Request Leave</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-[#212121] mb-1 block">Type</label>
            <select
              value={form.leaveType}
              onChange={e => setForm({ ...form, leaveType: e.target.value })}
              className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 bg-white"
            >
              <option value="annual">Annual</option>
              <option value="sick">Sick</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-[#212121] mb-1 block">Half Day</label>
            <input
              type="checkbox"
              checked={form.halfDay}
              onChange={e => setForm({ ...form, halfDay: e.target.checked })}
              className="rounded border-[#e0e0e0]"
            />
          </div>
          <div>
            <label className="text-sm text-[#212121] mb-1 block">Start Date</label>
            <input
              type="date"
              value={form.startDate}
              onChange={e => setForm({ ...form, startDate: e.target.value })}
              className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 bg-white"
            />
          </div>
          <div>
            <label className="text-sm text-[#212121] mb-1 block">End Date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={e => setForm({ ...form, endDate: e.target.value })}
              className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 bg-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-[#212121] mb-1 block">Reason</label>
            <textarea
              value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
              className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 bg-white"
              rows={3}
            />
          </div>
        </div>
        <div className="mt-4">
          <Button variant="primary" onClick={submitRequest} loading={loading}>
            Submit Request
          </Button>
        </div>
      </div>

      <div className="bg-white border border-[#e0e0e0] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[#212121] mb-4">My Leave Requests</h2>
        <div className="divide-y divide-[#e0e0e0]">
          {requests.map((r) => (
            <div key={r.id} className="py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#212121]">
                  {r.leave_type} • {r.total_days} day(s) • {r.status}
                </p>
                <p className="text-xs text-[#757575]">
                  {new Date(r.start_date).toLocaleDateString()} - {new Date(r.end_date).toLocaleDateString()}
                </p>
              </div>
              <a href={`/dashboard/leave/requests/${r.id}`} className="text-[#0F5D5D] text-sm">
                View
              </a>
            </div>
          ))}
          {requests.length === 0 && (
            <p className="text-sm text-[#757575]">No requests yet</p>
          )}
        </div>
      </div>
    </div>
  )
}