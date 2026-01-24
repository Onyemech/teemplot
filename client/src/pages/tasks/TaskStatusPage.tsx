import { useEffect, useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { useUser } from '@/contexts/UserContext'
import { Clock, AlertCircle, Calendar, User, X, Paperclip, FileText, Loader2 } from 'lucide-react'
import { uploadToCloudflare } from '@/lib/integrations/cloudflare'
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
  const [attachments, setAttachments] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [requireAttachments, setRequireAttachments] = useState<boolean>(false)

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

  useEffect(() => {
    ;(async () => {
      try {
        const res = await apiClient.get('/api/company-settings/tasks-policy')
        if (res.data?.success) {
          setRequireAttachments(!!res.data.data?.requireAttachmentsForTasks)
        }
      } catch (e) {
        // default false
      }
    })()
  }, [])

  const handleMarkComplete = async () => {
    if (!selectedTask) return

    setCompleting(true)
    try {
      if (requireAttachments && attachments.length === 0) {
        toast.error('Please attach at least one file as proof of work')
        return
      }
      const res = await apiClient.post(`/api/tasks/${selectedTask.id}/complete`, {
        actualHours,
        completionNotes,
        attachments
      })
      if (res.data.success) {
        toast.success('Task marked as complete!')
        setShowCompleteModal(false)
        setSelectedTask(null)
        setCompletionNotes('')
        setActualHours(1)
        setAttachments([])
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

      {(!loading || (user?.role === 'employee')) ? (
        <div className="grid grid-cols-1 gap-4">
          {tasks.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500">No tasks found matching your filters</p>
            </div>
          ) : (
            tasks.map((task) => (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <div className="p-4 md:p-6 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-gray-600 px-2 py-1 rounded-full bg-gray-100">
                      {getPriorityIcon(task.priority)}
                      <span className="capitalize">{task.priority}</span>
                    </div>
                  </div>

                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-gray-900">{task.title}</h3>
                        <p className="text-gray-600 text-sm mt-0.5">{task.description}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-700 mt-2">
                      <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span className="truncate">{task.assigned_to_name || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{task.created_at ? new Date(task.created_at).toLocaleDateString() : '-'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500 mt-2">
                      <div>Created by: {task.created_by_name || 'Unknown'}</div>
                      {task.review_status && <div className="text-right">Review: {String(task.review_status).replace('_',' ')}</div>}
                      {task.marked_complete_at && <div>Completed at: {new Date(task.marked_complete_at).toLocaleString()}</div>}
                      {task.reviewed_at && <div className="text-right">Reviewed: {new Date(task.reviewed_at).toLocaleString()}</div>}
                      {task.rejection_reason && <div className="col-span-2">Reason: {task.rejection_reason}</div>}
                    </div>

                    <div className="mt-3">
                      {task.assigned_to === user?.id && (task.status === 'pending' || task.status === 'in_progress') && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setSelectedTask(task)
                            setShowCompleteModal(true)
                          }}
                        >
                          Mark Complete
                        </Button>
                      )}

                      {task.assigned_to === user?.id && task.status === 'awaiting_review' && (
                        <div className="px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700 text-center">
                          Awaiting manager review
                        </div>
                      )}

                      {task.status === 'completed' && (
                        <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 text-center">
                          ✓ Completed
                        </div>
                      )}

                      {(user?.role === 'owner' || user?.role === 'admin' || task.created_by === user?.id) && task.status === 'awaiting_review' && (
                        <div className="mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => navigate('/dashboard/tasks/verify')}
                          >
                            Review Task
                          </Button>
                        </div>
                      )}
                    </div>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proof of Work (Attachments) {requireAttachments ? '(Required)' : '(Optional)'}
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full text-xs">
                        <FileText className="w-3 h-3 text-gray-500" />
                        <span className="max-w-[150px] truncate">{file.original_filename}</span>
                        <button
                          onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setUploading(true)
                        try {
                          const cfFile = await uploadToCloudflare(file, 'teemplot')
                          setAttachments([...attachments, cfFile])
                          toast.success('File attached')
                        } catch (err) {
                          toast.error('Failed to upload file')
                        } finally {
                          setUploading(false)
                        }
                      }}
                      className="hidden"
                      id={`file-upload-${selectedTask.id}`}
                      disabled={uploading}
                    />
                    <label
                      htmlFor={`file-upload-${selectedTask.id}`}
                      className={`flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 cursor-pointer hover:border-primary-500 hover:text-primary-600 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Paperclip className="w-4 h-4" />
                          Attach File
                        </>
                      )}
                    </label>
                  </div>
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
                    setAttachments([])
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleMarkComplete}
                loading={completing}
                  disabled={requireAttachments && attachments.length === 0}
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
