import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'

export default function LeaveRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const toast = useToast()
  const [request, setRequest] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviewStage, setReviewStage] = useState<string | null>(null)

  const fetchRequest = async () => {
    try {
      const res = await apiClient.get(`/api/leave/requests/${id}`)
      if (res.data.success) {
        setRequest(res.data.data)
        setReviewStage(res.data.data.review_stage || null)
      }
    } catch (e) {
      toast.error('Failed to load leave request')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequest()
  }, [id])

  if (loading) return <div className="p-6">Loading...</div>
  if (!request) return <div className="p-6">Request not found</div>

  return (
    <div className="bg-white border border-[#e0e0e0] rounded-xl p-6">
      <h2 className="text-lg font-semibold text-[#212121] mb-4">Leave Request Details</h2>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-[#757575]">Type</p>
          <p className="text-sm text-[#212121]">{request.leave_type}</p>
        </div>
        <div>
          <p className="text-sm text-[#757575]">Dates</p>
          <p className="text-sm text-[#212121]">
            {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-[#757575]">Status</p>
          <p className="text-sm text-[#212121]">{request.status}</p>
        </div>
        {reviewStage && (
          <div>
            <p className="text-sm text-[#757575]">Review Stage</p>
            <p className="text-sm text-[#212121]">{reviewStage}</p>
          </div>
        )}
        <div>
          <p className="text-sm text-[#757575]">Reason</p>
          <p className="text-sm text-[#212121]">{request.reason}</p>
        </div>
      </div>
    </div>
  )
}