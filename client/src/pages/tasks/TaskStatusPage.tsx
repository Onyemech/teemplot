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
import PageSkeleton from '@/components/skeletons/PageSkeleton'

interface TaskStatusPageProps {
  view?: 'my_tasks' | 'created_by_me' | 'department'
  isEmbedded?: boolean
}

export default function TaskStatusPage({ 
  view: initialView = 'my_tasks', 
  isEmbedded = false 
}: TaskStatusPageProps) {
  const toast = useToast()
  const { user } = useUser()
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState(initialView)

  // Update view if initialView changes
  useEffect(() => {
    setView(initialView)
  }, [initialView])

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

  const handleStartTask = async (taskId: string) => {
    try {
      const res = await apiClient.post(`/api/tasks/${taskId}/start`)
      if (res.data.success) {
        toast.success('Task started')
        // Refresh tasks list
        fetchTasks()
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to start task')
    }
  }

  const handleMarkComplete = async () => {
    if (!selectedTask) return

    setCompleting(true)
    try {
      if (requireAttachments && attachments.length === 0) {
        toast.error('Please attach at least one file as proof of work')
        return
      }

      // Calculate actual hours automatically from started_at to now
      let calculatedHours = actualHours; // Fallback to manual input if calculation fails
      
      if (selectedTask.started_at) {
        const startTime = new Date(selectedTask.started_at);
        const endTime = new Date();
        const diffMs = endTime.getTime() - startTime.getTime();
        // Convert milliseconds to hours (with 1 decimal place)
        calculatedHours = Math.max(0.1, parseFloat((diffMs / (1000 * 60 * 60)).toFixed(1)));
      }

      const res = await apiClient.post(`/api/tasks/${selectedTask.id}/complete`, {
        actualHours: calculatedHours,
        completionNotes,
        attachments
      })
      if (res.data.success) {
        toast.success(`Task completed! Logged: ${calculatedHours} hours`)
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

  if (loading) {
    return <PageSkeleton />
  }

  return (
    <div className="space-y-6">
      {!isEmbedded && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 sm:px-0">
          <div>
            <h1 className="text-2xl font-bold text-[#212121]">Tasks Overview</h1>
            <p className="text-[#757575]">Manage and track your tasks</p>
          </div>

          {(user?.role === 'owner' || user?.role === 'admin' || user?.role === 'manager' || user?.role === 'department_head') && (
            <Button onClick={() => navigate('/dashboard/tasks/assign')}>
              + Assign Task
            </Button>
          )}
        </div>
      )}

      <div className={`flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-[#e0e0e0] shadow-sm ${isEmbedded ? '' : 'mx-4 sm:mx-0'}`}>
        {!isEmbedded && (
          <div className="flex gap-1 bg-[#f5f5f5] p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setView('my_tasks')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'my_tasks' ? 'bg-white text-[#0F5D5D] shadow-sm' : 'text-[#757575] hover:text-[#212121]'}`}
            >
              My Tasks
            </button>
            {(user?.role !== 'employee') && (
              <button
                onClick={() => setView('created_by_me')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'created_by_me' ? 'bg-white text-[#0F5D5D] shadow-sm' : 'text-[#757575] hover:text-[#212121]'}`}
              >
                Created by Me
              </button>
            )}
          </div>
        )}

        <div className="w-full sm:w-64">
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
        <div className="grid grid-cols-1 gap-4 px-4 sm:px-0">
          {tasks.length === 0 ? (
            <div className="text-center py-12 bg-[#f5f5f5] rounded-xl border border-dashed border-[#e0e0e0]">
              <p className="text-[#757575]">No tasks found matching your filters</p>
            </div>
          ) : (
            tasks.map((task) => (
              <Card key={task.id} className="hover:shadow-md transition-shadow border-[#e0e0e0]">
                <div className="p-4 sm:p-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider border ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-medium text-[#757575] px-2.5 py-1 rounded-full bg-[#f5f5f5] border border-[#e0e0e0]">
                      {getPriorityIcon(task.priority)}
                      <span className="capitalize">{task.priority}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-[#212121] leading-tight">{task.title}</h3>
                    <p className="text-[#757575] text-sm line-clamp-2">{task.description}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                    <div className="flex items-center gap-2 bg-[#f5f5f5] border border-[#e0e0e0] rounded-lg px-3 py-2 text-xs text-[#212121]">
                      <User className="w-3.5 h-3.5 text-[#757575]" />
                      <span className="truncate font-medium">{task.assigned_to_name || 'Unassigned'}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-[#f5f5f5] border border-[#e0e0e0] rounded-lg px-3 py-2 text-xs text-[#212121]">
                      <Calendar className="w-3.5 h-3.5 text-[#757575]" />
                      <span className="font-medium">{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-[#f5f5f5] border border-[#e0e0e0] rounded-lg px-3 py-2 text-xs text-[#212121]">
                      <Clock className="w-3.5 h-3.5 text-[#757575]" />
                      <span className="font-medium">Created: {task.created_at ? new Date(task.created_at).toLocaleDateString() : '-'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] sm:text-xs text-[#757575] border-t border-[#e0e0e0] pt-4">
                    <span>By: <span className="text-[#212121] font-medium">{task.created_by_name || 'System'}</span></span>
                    {task.review_status && <span>• Review: <span className="text-[#212121] font-medium">{String(task.review_status).replace('_',' ')}</span></span>}
                    {task.marked_complete_at && <span>• Completed: <span className="text-[#212121] font-medium">{new Date(task.marked_complete_at).toLocaleDateString()}</span></span>}
                  </div>

                  <div className="mt-2">
                    {task.assigned_to === user?.id && task.status === 'pending' && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full bg-[#0F5D5D] hover:bg-[#0D4D4D] text-white"
                        onClick={() => handleStartTask(task.id)}
                      >
                        Start Task
                      </Button>
                    )}

                    {task.assigned_to === user?.id && task.status === 'in_progress' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full border-[#0F5D5D] text-[#0F5D5D] hover:bg-[#f5f5f5]"
                        onClick={() => {
                          setSelectedTask(task)
                          setShowCompleteModal(true)
                        }}
                      >
                        Mark Complete
                      </Button>
                    )}

                    {task.assigned_to === user?.id && task.status === 'awaiting_review' && (
                      <div className="px-4 py-2.5 bg-[#f5f5f5] border border-[#e0e0e0] rounded-lg text-xs font-bold text-[#757575] text-center uppercase tracking-wide">
                        Awaiting Review
                      </div>
                    )}

                    {task.status === 'completed' && (
                      <div className="px-4 py-2.5 bg-[#0F5D5D]/5 border border-[#0F5D5D]/20 rounded-lg text-xs font-bold text-[#0F5D5D] text-center uppercase tracking-wide">
                        ✓ Completed
                      </div>
                    )}

                    {(user?.role === 'owner' || user?.role === 'admin' || task.created_by === user?.id) && task.status === 'awaiting_review' && (
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-[#e0e0e0] text-[#212121] hover:bg-[#f5f5f5]"
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
          <Loader2 className="w-8 h-8 animate-spin text-[#0F5D5D]" />
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
                  Estimated Hours (Auto-calculated from Start Time)
                </label>
                <div className="text-sm text-gray-500 mb-2 bg-gray-50 p-2 rounded border">
                   {selectedTask.started_at ? (
                      <span>Started: {new Date(selectedTask.started_at).toLocaleString()}</span>
                   ) : (
                      <span>Not started officially. Using manual input.</span>
                   )}
                </div>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={actualHours}
                  disabled={!!selectedTask.started_at} // Disable if auto-calculated
                  onChange={(e) => setActualHours(parseFloat(e.target.value) || 1)}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg outline-none ${!!selectedTask.started_at ? 'bg-gray-100 cursor-not-allowed' : 'focus:ring-2 focus:ring-primary-500'}`}
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
