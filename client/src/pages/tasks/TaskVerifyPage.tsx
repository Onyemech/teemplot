import { useEffect, useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'
import Button from '@/components/ui/Button'

export default function TaskVerifyPage() {
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
    setVerifying(taskId)
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

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="bg-white border border-[#e0e0e0] rounded-xl p-6">
      <h2 className="text-lg font-semibold text-[#212121] mb-4">Tasks Awaiting Review</h2>
      {tasks.length === 0 && (
        <p className="text-sm text-[#757575]">No tasks awaiting review</p>
      )}
      {tasks.map((t) => (
        <div key={t.id} className="border border-[#e0e0e0] rounded-lg p-4 mb-4">
          <p className="text-sm text-[#212121] font-semibold">{t.title}</p>
          <p className="text-sm text-[#757575] mt-1 mb-2">{t.description}</p>

          {/* Task Metadata / Proof */}
          <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Completed By:</span>
              <span className="font-medium">{t.assigned_to_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Actual Hours:</span>
              <span className="font-medium">{t.actual_hours || '-'} hrs</span>
            </div>

            {/* Notes */}
            {t.metadata?.completion_notes && (
              <div className="pt-2 border-t border-gray-200">
                <span className="text-gray-500 block text-xs mb-1">Completion Notes:</span>
                <p className="text-gray-800 bg-white p-2 rounded border border-gray-100">{t.metadata.completion_notes}</p>
              </div>
            )}

            {/* Attachments */}
            {t.metadata?.attachments && t.metadata.attachments.length > 0 && (
              <div className="pt-2 border-t border-gray-200">
                <span className="text-gray-500 block text-xs mb-1">Proof of Work:</span>
                <div className="flex flex-wrap gap-2">
                  {t.metadata.attachments.map((file: any, i: number) => (
                    <a
                      key={i}
                      href={file.secure_url || file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 bg-white border border-gray-200 px-2 py-1.5 rounded text-xs text-blue-600 hover:text-blue-800 hover:border-blue-300 transition-colors"
                    >
                      📄 {file.original_filename || 'Attachment'}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3">
            <label className="text-sm text-[#212121]">Review Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 bg-white"
              rows={3}
              placeholder="Optional notes"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              variant="primary"
              onClick={() => review(t.id, true)}
              loading={verifying === t.id}
            >
              Approve
            </Button>
            <Button
              variant="secondary"
              onClick={() => review(t.id, false)}
              loading={verifying === t.id}
            >
              Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}