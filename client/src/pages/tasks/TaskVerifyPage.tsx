import { useEffect, useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'
import Button from '@/components/ui/Button'
import { Loader2, FileText, CheckCircle, XCircle, Clock, User, Info } from 'lucide-react'

interface TaskVerifyPageProps {
  isEmbedded?: boolean
}

export default function TaskVerifyPage({ isEmbedded = false }: TaskVerifyPageProps) {
  const toast = useToast()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState('')
  const [notes, setNotes] = useState('')

  const fetchAwaiting = async () => {
    try {
      const res = await apiClient.get('/api/tasks/awaiting-review')
      if (res.data.success) {
        setTasks(res.data.data)
      }
    } catch (e) {
      toast.error('Failed to load tasks awaiting review')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAwaiting()
  }, [])

  const review = async (taskId: string, approved: boolean) => {
    // Unique state for each button action
    const actionId = `${taskId}-${approved ? 'approve' : 'reject'}`;
    setVerifying(actionId)
    
    try {
      const res = await apiClient.post(`/api/tasks/${taskId}/review`, {
        approved,
        reviewNotes: notes
      })
      if (res.data.success) {
        toast.success(res.data.message || 'Review submitted')
        setTasks(tasks.filter(t => t.id !== taskId))
        setNotes('')
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to review task')
    } finally {
      setVerifying('')
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-[#0F5D5D]" />
      <p className="text-sm text-[#757575]">Loading reviews...</p>
    </div>
  )

  return (
    <div className={`space-y-6 ${isEmbedded ? '' : 'p-4 sm:p-8 max-w-4xl mx-auto'}`}>
      {!isEmbedded && (
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Task Verification</h1>
          <p className="text-[#757575]">Review and approve completed tasks</p>
        </div>
      )}

      <div className="bg-white border border-[#e0e0e0] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-6 border-b border-[#e0e0e0] bg-[#f5f5f5]">
          <h2 className="text-lg font-bold text-[#212121] flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-[#0F5D5D]" />
            Awaiting Review
            <span className="ml-auto bg-[#0F5D5D] text-white text-[10px] px-2 py-0.5 rounded-full">
              {tasks.length}
            </span>
          </h2>
        </div>

        <div className="divide-y divide-[#e0e0e0]">
          {tasks.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-[#f5f5f5] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-[#e0e0e0]" />
              </div>
              <p className="text-[#757575] font-medium">No tasks awaiting review</p>
            </div>
          ) : (
            tasks.map((t) => (
              <div key={t.id} className="p-4 sm:p-6 hover:bg-[#f5f5f5]/30 transition-colors">
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-base font-bold text-[#212121] leading-tight">{t.title}</h3>
                    <p className="text-sm text-[#757575] mt-1">{t.description}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-[#757575]">
                        <User className="w-3.5 h-3.5" />
                        <span>Assigned to: <span className="text-[#212121] font-medium">{t.assigned_to_name}</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#757575]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Completed: <span className="text-[#212121] font-medium">{t.marked_complete_at ? new Date(t.marked_complete_at).toLocaleString() : '-'}</span></span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-[#757575]">
                        <Info className="w-3.5 h-3.5" />
                        <span>Effort: <span className="text-[#212121] font-medium">{t.actual_hours || '-'} hrs</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#757575]">
                        <User className="w-3.5 h-3.5" />
                        <span>Created by: <span className="text-[#212121] font-medium">{t.created_by_name || '-'}</span></span>
                      </div>
                    </div>
                  </div>

                  {t.metadata?.completion_notes && (
                    <div className="bg-[#f5f5f5] p-3 rounded-lg border border-[#e0e0e0]">
                      <span className="text-[10px] uppercase font-bold text-[#757575] block mb-1">Completion Notes</span>
                      <p className="text-sm text-[#212121] italic">"{t.metadata.completion_notes}"</p>
                    </div>
                  )}

                  {t.metadata?.attachments && t.metadata.attachments.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold text-[#757575] block">Proof of Work</span>
                      <div className="flex flex-wrap gap-2">
                        {t.metadata.attachments.map((file: any, i: number) => (
                          <a
                            key={i}
                            href={file.secure_url || file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 bg-white border border-[#e0e0e0] px-3 py-2 rounded-lg text-xs text-[#0F5D5D] font-medium hover:border-[#0F5D5D] transition-all"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="max-w-[150px] truncate">{file.original_filename || 'Attachment'}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-[#e0e0e0] space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#757575] uppercase mb-2">Review Feedback</label>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="w-full border border-[#e0e0e0] rounded-lg px-4 py-3 bg-white text-sm focus:ring-2 focus:ring-[#0F5D5D]/20 focus:border-[#0F5D5D] outline-none transition-all"
                        rows={2}
                        placeholder="Add feedback for the employee..."
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="primary"
                        className="flex-1 bg-[#0F5D5D] hover:bg-[#0D4D4D] text-white"
                        onClick={() => review(t.id, true)}
                        loading={verifying === `${t.id}-approve`}
                        disabled={!!verifying} // Disable if any action is processing
                        icon={<CheckCircle className="w-4 h-4" />}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="secondary"
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => review(t.id, false)}
                        loading={verifying === `${t.id}-reject`}
                        disabled={!!verifying} // Disable if any action is processing
                        icon={<XCircle className="w-4 h-4" />}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
