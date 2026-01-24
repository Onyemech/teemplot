import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useToast } from '@/contexts/ToastContext'

export default function TaskPolicySettingsPage() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [requireAttachments, setRequireAttachments] = useState(false)

  const loadPolicy = async () => {
    try {
      const res = await apiClient.get('/api/company-settings/tasks-policy')
      if (res.data.success) {
        setRequireAttachments(!!res.data.data.requireAttachmentsForTasks)
      }
    } catch (e) {
      toast.error('Failed to load task policy')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPolicy()
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const res = await apiClient.patch('/api/company-settings/tasks-policy', {
        requireAttachmentsForTasks: requireAttachments
      })
      if (res.data.success) {
        toast.success('Task policy updated')
      }
    } catch (e) {
      toast.error('Failed to update task policy')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Task Policy Settings</h1>
        <p className="text-gray-500">Control task completion requirements for your company</p>
      </div>

      <Card>
        <div className="p-6 space-y-4">
          {loading ? (
            <div>Loading...</div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Require Attachments to Complete Tasks</h3>
                  <p className="text-sm text-gray-600">When enabled, employees must attach at least one file to mark a task as complete.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={requireAttachments}
                    onChange={e => setRequireAttachments(e.target.checked)}
                    disabled={saving}
                  />
                  <div
                    className="
                      w-11 h-6 bg-gray-200 rounded-full peer
                      peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100
                      after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                      after:bg-white after:border-gray-300 after:border after:rounded-full
                      after:h-5 after:w-5 after:transition-all
                      peer-checked:after:translate-x-full peer-checked:after:border-white
                      peer-checked:bg-blue-600
                    "
                  ></div>
                </label>
              </div>

              <div className="flex justify-end">
                <Button variant="primary" onClick={save} loading={saving}>Save Changes</Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
