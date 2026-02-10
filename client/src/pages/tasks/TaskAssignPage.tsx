import { useEffect, useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Clock, User, Flag, Type } from 'lucide-react'
import { useUser } from '@/contexts/UserContext'

interface TaskAssignPageProps {
  isEmbedded?: boolean
}

export default function TaskAssignPage({ isEmbedded = false }: TaskAssignPageProps) {
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
    dueTime: '',
    estimatedHours: 1
  })

  const { user } = useUser()

  useEffect(() => {
    if (user && user.role === 'employee') {
      toast.error('Unauthorized access')
      navigate('/dashboard/tasks')
      return
    }
    fetchAssignableUsers()
  }, [user])

  const fetchAssignableUsers = async () => {
    try {
      const res = await apiClient.get('/api/employees')
      if (res.data.success) {
        // Filter out owners and admins - only show employees and department heads
        const assignableUsers = res.data.data.filter((u: any) =>
          u.role !== 'owner' && u.role !== 'admin'
        )
        setUsers(assignableUsers)
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
      // Combine date and time
      let finalDueDate = form.dueDate
      if (form.dueDate && form.dueTime) {
        finalDueDate = `${form.dueDate}T${form.dueTime}:00`
      } else if (form.dueDate) {
        // Default to end of day if only date provided? Or keep as date only if backend supports it.
        // For robustness with timestamptz, let's append generic EOD or current time if missing.
        // Actually, let's just send the date string, backend likely handles it, or append T23:59:59
        // Better: T17:00:00 (5 PM)
        finalDueDate = `${form.dueDate}T17:00:00`
      }

      const payload = {
        ...form,
        dueDate: finalDueDate
      }

      const res = await apiClient.post('/api/tasks', payload)
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
      {!isEmbedded && (
        <div className="flex items-center gap-4 px-4 sm:px-0">
          <Button variant="ghost" onClick={() => navigate(-1)} icon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
          <div>
            <h1 className="text-2xl font-bold text-[#212121]">Assign New Task</h1>
            <p className="text-[#757575]">Create and assign a task to a team member</p>
          </div>
        </div>
      )}

      <Card className="border-[#e0e0e0] mx-4 sm:mx-0">
        <div className="p-4 sm:p-6 space-y-6">
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
            <label className="block text-sm font-bold text-[#212121] mb-2">Description</label>
            <textarea
              className="w-full min-h-[120px] p-4 border border-[#e0e0e0] rounded-lg focus:ring-2 focus:ring-[#0F5D5D]/20 focus:border-[#0F5D5D] outline-none transition-all text-[#212121] placeholder-[#757575] text-sm sm:text-base"
              placeholder="Detailed description of the task..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <Select
              label="Assign To"
              required
              options={users.map(u => ({
                label: `${u.firstName || ''} ${u.lastName || ''} (${u.role || 'employee'})`,
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
                { label: 'Low', value: 'low', icon: <Flag className="w-4 h-4 text-[#757575]" /> },
                { label: 'Medium', value: 'medium', icon: <Flag className="w-4 h-4 text-[#0F5D5D]" /> },
                { label: 'High', value: 'high', icon: <Flag className="w-4 h-4 text-orange-500" /> },
                { label: 'Urgent', value: 'urgent', icon: <Flag className="w-4 h-4 text-red-500" /> },
              ]}
              value={form.priority}
              onChange={val => setForm({ ...form, priority: val })}
            />
            
            <Input
              type="date"
              label="Due Date"
              required
              value={form.dueDate}
              onChange={e => setForm({ ...form, dueDate: e.target.value })}
              icon={<Calendar className="w-5 h-5" />}
              fullWidth
            />

            <Input
              type="time"
              label="Due Time"
              value={form.dueTime}
              onChange={e => setForm({ ...form, dueTime: e.target.value })}
              icon={<Clock className="w-5 h-5" />}
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

          <div className="pt-4 flex flex-col sm:flex-row justify-end gap-3">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate(-1)}>Cancel</Button>
            <Button variant="primary" className="w-full sm:w-auto bg-[#0F5D5D] hover:bg-[#0D4D4D] text-white" onClick={submit} loading={loading}>Assign Task</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
