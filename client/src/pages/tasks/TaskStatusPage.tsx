import { useEffect, useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { useUser } from '@/contexts/UserContext'
import { Clock, AlertCircle, Calendar, User, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function TaskStatusPage() {
  const toast = useToast()
  const { user } = useUser()
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'my_tasks' | 'created_by_me' | 'department'>('my_tasks')

  // Modal state
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [completing, setCompleting] = useState(false)
  const [completionNotes, setCompletionNotes] = useState('')
  const [actualHours, setActualHours] = useState(1)

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const params: any = { status: filter === 'all' ? undefined : filter }

      if (view === 'my_tasks') {
        params.assignedTo = user?.id
      }

      const res = await apiClient.get('/api/tasks', { params })
      if (res.data.success) {
        let fetchedTasks = res.data.data.tasks

        // Client-side filtering for views not fully supported by backend params yet
        if (view === 'my_tasks') {
          fetchedTasks = fetchedTasks.filter((t: any) => t.assigned_to === user?.id)
        } else if (view === 'created_by_me') {
          fetchedTasks = fetchedTasks.filter((t: any) => t.created_by === user?.id)
        }

        setTasks(fetchedTasks)
      }
    } catch (e: any) {
      console.error('Fetch tasks error:', e)
      toast.error(e.response?.data?.message || 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [filter, view])

  const handleMarkComplete = async () => {
    if (!selectedTask) return

    setCompleting(true)
    try {
      const res = await apiClient.post(`/api/tasks/${selectedTask.id}/complete`, {
        actualHours,
        completionNotes,
        attachments: []
      })
      if (res.data.success) {
        toast.success('Task marked as complete!')
        setShowCompleteModal(false)
        setSelectedTask(null)
        setCompletionNotes('')
        setActualHours(1)
        // Refresh tasks list
        fetchTasks()
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to complete task')
    } finally {
      setCompleting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200'
      case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'awaiting_review': return 'text-orange-600 bg-orange-50 border-orange-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'high': return <AlertCircle className="w-4 h-4 text-orange-500" />
      case 'medium': return <Clock className="w-4 h-4 text-blue-500" />
      default: return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks Overview</h1>
          <p className="text-gray-500">Manage and track your tasks</p>
        </div>

        {(user?.role === 'owner' || user?.role === 'admin' || user?.role === 'manager' || user?.role === 'department_head') && (
          <Button onClick={() => navigate('/dashboard/tasks/assign')}>
            + Assign Task
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
          <button
            onClick={() => setView('my_tasks')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${view === 'my_tasks' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
          >
            My Tasks
          </button>
          {(user?.role !== 'employee') && (
            <button
              onClick={() => setView('created_by_me')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${view === 'created_by_me' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              Created by Me
            </button>
          )}
        </div>

        <div className="w-full md:w-64">
          <Select
            value={filter}
            onChange={setFilter}
            options={[
              { label: 'All Statuses', value: 'all' },
              { label: 'Pending', value: 'pending' },
              { label: 'In Progress', value: 'in_progress' },
              { label: 'Awaiting Review', value: 'awaiting_review' },
              { label: 'Completed', value: 'completed' },
            ]}
            placeholder="Filter by status"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {tasks.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500">No tasks found matching your filters</p>
            </div>
          ) : (
            tasks.map((task) => (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <div className="p-4 md:p-6 flex flex-col md:flex-row gap-4 justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-start justify-between md:justify-start gap-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        {getPriorityIcon(task.priority)}
                        <span className="capitalize">{task.priority}</span>
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                    <p className="text-gray-600 text-sm line-clamp-2">{task.description}</p>

                    <div className="flex items-center gap-4 text-sm text-gray-500 pt-2">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>Assigned to: {task.assigned_to_name || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex md:flex-col gap-2 justify-center min-w-[140px]">
                    {/* Show Mark Complete only if user is assigned AND status is pending or in_progress */}
                    {task.assigned_to === user?.id && (task.status === 'pending' || task.status === 'in_progress') && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedTask(task)
                          setShowCompleteModal(true)
                        }}
                      >
                        Mark Complete
                      </Button>
                    )}

                    {/* Show status message for awaiting review */}
                    {task.assigned_to === user?.id && task.status === 'awaiting_review' && (
                      <div className="px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700 text-center">
                        Awaiting manager review
                      </div>
                    )}

                    {/* Show completed message */}
                    {task.status === 'completed' && (
                      <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 text-center">
                        ✓ Completed
                      </div>
                    )}

                    {/* Review Action - if user created it (or owner) and it's awaiting review */}
                    {(user?.role === 'owner' || task.created_by === user?.id) && task.status === 'awaiting_review' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/dashboard/tasks/verify')}
                      >
                        Review Task
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Complete Task Modal */}
      {showCompleteModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">Complete Task</h3>
              <button
                onClick={() => {
                  setShowCompleteModal(false)
                  setSelectedTask(null)
                  setCompletionNotes('')
                  setActualHours(1)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-1">{selectedTask.title}</h4>
                <p className="text-sm text-gray-600">{selectedTask.description}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Completion Notes
                </label>
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  rows={4}
                  placeholder="Describe what was completed..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Actual Hours Worked
                </label>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={actualHours}
                  onChange={(e) => setActualHours(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end sticky bottom-0 bg-white">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCompleteModal(false)
                  setSelectedTask(null)
                  setCompletionNotes('')
                  setActualHours(1)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleMarkComplete}
                loading={completing}
              >
                Submit for Review
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
