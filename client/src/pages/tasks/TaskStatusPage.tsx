import { useEffect, useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'

export default function TaskStatusPage() {
  const toast = useToast()
  const [tasks, setTasks] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const fetchTasks = async () => {
    try {
      const params = filter === 'all' ? {} : { status: filter }
      const res = await apiClient.get('/api/tasks', { params })
      if (res.data.success) {
        setTasks(res.data.data.tasks)
      }
    } catch (e) {
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [filter])

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="bg-white border border-[#e0e0e0] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#212121]">Task Status</h2>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="border border-[#e0e0e0] rounded-lg px-3 py-2 bg-white"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="awaiting_review">Awaiting Review</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <div className="divide-y divide-[#e0e0e0]">
        {tasks.map((t) => (
          <div key={t.id} className="py-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#212121] font-semibold">{t.title}</p>
              <p className="text-xs text-[#757575]">{t.status}</p>
            </div>
            <span className="text-xs text-[#757575]">{t.priority}</span>
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="text-sm text-[#757575]">No tasks</p>
        )}
      </div>
    </div>
  )
}