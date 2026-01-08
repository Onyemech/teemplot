import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'
import Button from '@/components/ui/Button'

export default function TaxAssignmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const toast = useToast()
  const [assignment, setAssignment] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAssignment = async () => {
    try {
      const res = await apiClient.get(`/api/tax/assignments/${id}`)
      if (res.data.success) {
        setAssignment(res.data.data)
      }
    } catch (e) {
      toast.error('Failed to load tax assignment')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssignment()
  }, [id])

  const review = async (approved: boolean) => {
    try {
      const res = await apiClient.post(`/api/tax/assignments/${id}/review`, { approved })
      if (res.data.success) {
        toast.success(res.data.message)
        fetchAssignment()
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to review assignment')
    }
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (!assignment) return <div className="p-6">Assignment not found</div>

  return (
    <div className="bg-white border border-[#e0e0e0] rounded-xl p-6">
      <h2 className="text-lg font-semibold text-[#212121] mb-4">Tax Assignment Details</h2>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-[#757575]">Tax Code</p>
          <p className="text-sm text-[#212121]">{assignment.tax_code}</p>
        </div>
        <div>
          <p className="text-sm text-[#757575]">Rate</p>
          <p className="text-sm text-[#212121]">{assignment.rate}%</p>
        </div>
        <div>
          <p className="text-sm text-[#757575]">Status</p>
          <p className="text-sm text-[#212121]">{assignment.status}</p>
        </div>
        <div>
          <p className="text-sm text-[#757575]">Notes</p>
          <p className="text-sm text-[#212121]">{assignment.notes || '-'}</p>
        </div>
      </div>
      <div className="mt-6 flex gap-2">
        <Button variant="primary" onClick={() => review(true)}>Approve</Button>
        <Button variant="secondary" onClick={() => review(false)}>Reject</Button>
      </div>
    </div>
  )
}