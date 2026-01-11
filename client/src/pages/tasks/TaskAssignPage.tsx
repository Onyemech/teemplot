import { useEffect, useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Clock, User, Flag, Type } from 'lucide-react'

export default function TaskAssignPage() {
  const toast = useToast()
  const navigate = useNavigate()
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

  useEffect(() => {
    fetchAssignableUsers()
  }, [])

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

  const submit = async () => {
    if (!form.title || !form.assignedTo) {
      toast.error('Title and assignee are required')
      return
    }
    setLoading(true)
    try {
      const res = await apiClient.post('/api/tasks', form)
      if (res.data.success) {
        toast.success(res.data.message || 'Task assigned')
        navigate('/dashboard/tasks/status')
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to assign task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)} icon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assign New Task</h1>
          <p className="text-gray-500">Create and assign a task to a team member</p>
        </div>
      </div>

      <Card className="max-w-3xl">
        <div className="p-6 space-y-6">
          <Input
            label="Task Title"
            required
            placeholder="e.g. Update Landing Page"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            icon={<Type className="w-5 h-5" />}
            fullWidth
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Description</label>
            <textarea
              className="w-full min-h-[120px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
              placeholder="Detailed description of the task..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Assign To"
              required
              options={users.map(u => ({
                label: `${u.first_name} ${u.last_name} (${u.role})`,
                value: u.id,
                icon: <User className="w-4 h-4" />
              }))}
              value={form.assignedTo}
              onChange={val => setForm({ ...form, assignedTo: val })}
              placeholder="Select team member"
              searchable
            />

            <Select
              label="Priority"
              options={[
                { label: 'Low', value: 'low', icon: <Flag className="w-4 h-4 text-gray-500" /> },
                { label: 'Medium', value: 'medium', icon: <Flag className="w-4 h-4 text-blue-500" /> },
                { label: 'High', value: 'high', icon: <Flag className="w-4 h-4 text-orange-500" /> },
                { label: 'Urgent', value: 'urgent', icon: <Flag className="w-4 h-4 text-red-500" /> },
              ]}
              value={form.priority}
              onChange={val => setForm({ ...form, priority: val })}
            />

            <Input
              type="date"
              label="Due Date"
              value={form.dueDate}
              onChange={e => setForm({ ...form, dueDate: e.target.value })}
              icon={<Calendar className="w-5 h-5" />}
              fullWidth
            />

            <Input
              type="number"
              label="Estimated Hours"
              min={1}
              value={form.estimatedHours}
              onChange={e => setForm({ ...form, estimatedHours: parseInt(e.target.value) || 0 })}
              icon={<Clock className="w-5 h-5" />}
              fullWidth
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            <Button variant="primary" onClick={submit} loading={loading}>Assign Task</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
