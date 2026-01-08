import { useEffect, useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'

export default function LeaveRequestsPage() {
  const toast = useToast()
  const [requests, setRequests] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const fetchRequests = async () => {
    try {
      const res = await apiClient.get('/api/leave/requests', {
        params: { status: filter === 'all' ? undefined : filter }
      })
      if (res.data.success) {
        setRequests(res.data.data)
      }
    } catch (e) {
      toast.error('Failed to load leave requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [filter])

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="bg-white border border-[#e0e0e0] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#212121]">Leave Requests</h2>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="border border-[#e0e0e0] rounded-lg px-3 py-2 bg-white"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
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
          <p className="text-sm text-[#757575]">No requests</p>
        )}
      </div>
    </div>
  )
}