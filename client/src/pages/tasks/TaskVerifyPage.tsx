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
          <p className="text-sm text-[#757575] mt-1">{t.description}</p>
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