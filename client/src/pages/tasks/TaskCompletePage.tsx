import { useEffect, useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'
import Button from '@/components/ui/Button'

export default function TaskCompletePage() {
  const toast = useToast()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState('')
  const [notes, setNotes] = useState('')
  const [hours, setHours] = useState(1)

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
        completionNotes: notes
      })
      if (res.data.success) {
        toast.success(res.data.message || 'Task marked complete')
        setTasks(tasks.filter(t => t.id !== taskId))
        setNotes('')
        setHours(1)
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
            <label className="text-sm text-[#212121]">Actual Hours</label>
            <input
              type="number"
              min={1}
              value={hours}
              onChange={e => setHours(parseInt(e.target.value) || 1)}
              className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 bg-white"
            />
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