import { useEffect, useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'
import Button from '@/components/ui/Button'

export default function TaskAssignPage() {
  const toast = useToast()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    dueDate: '',
    estimatedHours: 1
  })

  const fetchAssignableUsers = async () => {
    try {
      const res = await apiClient.get('/api/employees/list')
      if (res.data.success) {
        setUsers(res.data.data)
      }
    } catch (e) {
      toast.error('Failed to load users')
    }
  }

  useEffect(() => {
    fetchAssignableUsers()
  }, [])

  const submit = async () => {
    if (!form.title || !form.assignedTo) {
      toast.error('Title and assignee are required')
      return
    }
    setLoading(true)
    try {
      const res = await apiClient.post('/api/tasks', {
        title: form.title,
        description: form.description,
        assignedTo: form.assignedTo,
        priority: form.priority,
        dueDate: form.dueDate,
        estimatedHours: form.estimatedHours
      })
      if (res.data.success) {
        toast.success(res.data.message || 'Task assigned')
        setForm({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '', estimatedHours: 1 })
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to assign task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-[#e0e0e0] rounded-xl p-6">
      <h2 className="text-lg font-semibold text-[#212121] mb-4">Assign Task</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="text-sm text-[#212121] mb-1 block">Title</label>
          <input
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 bg-white"
            placeholder="Task title"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm text-[#212121] mb-1 block">Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 bg-white"
            rows={3}
            placeholder="Describe the task"
          />
        </div>
        <div>
          <label className="text-sm text-[#212121] mb-1 block">Assign To</label>
          <select
            value={form.assignedTo}
            onChange={e => setForm({ ...form, assignedTo: e.target.value })}
            className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 bg-white"
          >
            <option value="">Select user</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.first_name} {u.last_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-[#212121] mb-1 block">Priority</label>
          <select
            value={form.priority}
            onChange={e => setForm({ ...form, priority: e.target.value })}
            className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 bg-white"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-[#212121] mb-1 block">Due Date</label>
          <input
            type="date"
            value={form.dueDate}
            onChange={e => setForm({ ...form, dueDate: e.target.value })}
            className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 bg-white"
          />
        </div>
        <div>
          <label className="text-sm text-[#212121] mb-1 block">Estimated Hours</label>
          <input
            type="number"
            min={1}
            value={form.estimatedHours}
            onChange={e => setForm({ ...form, estimatedHours: parseInt(e.target.value) || 1 })}
            className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 bg-white"
          />
        </div>
      </div>
      <div className="mt-4">
        <Button variant="primary" onClick={submit} loading={loading}>
          Assign Task
        </Button>
      </div>
    </div>
  )
}