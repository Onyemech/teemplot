import { useEffect, useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'
import Button from '@/components/ui/Button'

export default function TaskAssignmentDashboardPage() {
  const toast = useToast()
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    userId: '',
    taskCode: '',
    rate: 0,
    notes: ''
  })
  const [codes, setCodes] = useState<any[]>([])

  const fetchAssignments = async () => {
    try {
      const res = await apiClient.get('/api/task-assignments/assignments')
      if (res.data.success) {
        setAssignments(res.data.data)
      }
    } catch (e) {
      toast.error('Failed to load task assignments')
    } finally {
      setLoading(false)
    }
  }

  const fetchCodes = async () => {
    try {
      const res = await apiClient.get('/api/task-assignments/codes')
      if (res.data.success) {
        setCodes(res.data.data)
      }
    } catch (e) {
      toast.error('Failed to load task codes')
    }
  }

  useEffect(() => {
    fetchAssignments()
    fetchCodes()
  }, [])

  const submit = async () => {
    if (!form.taskCode || form.rate <= 0) {
      toast.error('Task code and rate are required')
      return
    }
    try {
      const res = await apiClient.post('/api/task-assignments/assign', form)
      if (res.data.success) {
        toast.success(res.data.message || 'Task assignment created')
        setForm({ userId: '', taskCode: '', rate: 0, notes: '' })
        fetchAssignments()
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to assign task')
    }
  }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#e0e0e0] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[#212121] mb-4">Assign Task Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-[#212121] mb-1 block">User (optional)</label>
            <input
              value={form.userId}
              onChange={e => setForm({ ...form, userId: e.target.value })}
              className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 bg-white"
              placeholder="User ID (leave blank for company-wide)"
            />
          </div>
          <div>
            <label className="text-sm text-[#212121] mb-1 block">Task Role/Code</label>
            <select
              value={form.taskCode}
              onChange={e => setForm({ ...form, taskCode: e.target.value })}
              className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 bg-white"
            >
              <option value="">Select code</option>
              {codes.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.description}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-[#212121] mb-1 block">Task Weight/Rate</label>
            <input
              type="number"
              step={0.01}
              value={form.rate}
              onChange={e => setForm({ ...form, rate: parseFloat(e.target.value) || 0 })}
              className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 bg-white"
              placeholder="e.g. 1.5"
            />
          </div>
          <div>
            <label className="text-sm text-[#212121] mb-1 block">Notes</label>
            <input
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 bg-white"
              placeholder="Optional notes"
            />
          </div>
        </div>
        <div className="mt-4">
          <Button variant="primary" onClick={submit}>Assign Profile</Button>
        </div>
      </div>

      <div className="bg-white border border-[#e0e0e0] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[#212121] mb-4">Active Assignments</h2>
        <div className="divide-y divide-[#e0e0e0]">
          {assignments.map((a) => (
            <div key={a.id} className="py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#212121]">
                  {a.task_code} • Weight: {a.rate} • {a.status}
                </p>
                <p className="text-xs text-[#757575]">
                  {a.user_id ? `User: ${a.user_id}` : 'Company-wide'}
                </p>
              </div>
              <a href={`/dashboard/tasks/assignments/${a.id}`} className="text-[#0F5D5D] text-sm">
                Review
              </a>
            </div>
          ))}
          {assignments.length === 0 && (
            <p className="text-sm text-[#757575]">No active profiles</p>
          )}
        </div>
      </div>
    </div>
  )
}