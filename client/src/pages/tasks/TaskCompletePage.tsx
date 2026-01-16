import { useEffect, useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'
import Button from '@/components/ui/Button'

import { Paperclip, X, FileText, Loader2 } from 'lucide-react'

export default function TaskCompletePage() {
  const toast = useToast()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState('')
  const [notes, setNotes] = useState('')
  const [hours, setHours] = useState(1)
  const [attachments, setAttachments] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)

  const fetchMyTasks = async () => {
    try {
      const res = await apiClient.get('/api/tasks?status=in_progress')
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
    fetchMyTasks()
  }, [])

  const complete = async (taskId: string) => {
    setCompleting(taskId)
    try {
      const res = await apiClient.post(`/api/tasks/${taskId}/complete`, {
        actualHours: hours,
        completionNotes: notes,
        attachments // Send uploaded files
      })
      if (res.data.success) {
        toast.success(res.data.message || 'Task marked complete')
        setTasks(tasks.filter(t => t.id !== taskId))
        setNotes('')
        setHours(1)
        setAttachments([])
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to complete task')
    } finally {
      setCompleting('')
    }
  }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="bg-white border border-[#e0e0e0] rounded-xl p-6">
      <h2 className="text-lg font-semibold text-[#212121] mb-4">Complete Task</h2>
      {tasks.length === 0 && (
        <p className="text-sm text-[#757575]">No tasks in progress</p>
      )}
      {tasks.map((t) => (
        <div key={t.id} className="border border-[#e0e0e0] rounded-lg p-4 mb-4">
          <p className="text-sm text-[#212121] font-semibold">{t.title}</p>
          <p className="text-sm text-[#757575] mt-1">{t.description}</p>
          <div className="mt-3 space-y-2">
            <label className="text-sm text-[#212121]">Completion Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 bg-white"
              rows={3}
              placeholder="Describe what was done"
            />
            <label className="text-sm text-[#212121]">Actual Hours Worked</label>
            <input
              type="number"
              min={1}
              value={hours}
              onChange={e => setHours(parseInt(e.target.value) || 0)}
              className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 bg-white"
            />

            {/* File Upload Section */}
            <div>
              <label className="text-sm text-[#212121] mb-2 block">Proof of Work (Attachments)</label>

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
                    const formData = new FormData()
                    formData.append('file', file)

                    try {
                      const res = await apiClient.post('/api/files/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                      })
                      if (res.data.success) {
                        setAttachments([...attachments, res.data.data.file])
                        toast.success('File attached')
                      }
                    } catch (err) {
                      toast.error('Failed to upload file')
                    } finally {
                      setUploading(false)
                    }
                  }}
                  className="hidden"
                  id={`file-upload-${t.id}`}
                  disabled={uploading}
                />
                <label
                  htmlFor={`file-upload-${t.id}`}
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
          <div className="mt-3">
            <Button
              variant="primary"
              onClick={() => complete(t.id)}
              loading={completing === t.id}
            >
              Mark Complete
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}