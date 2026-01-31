import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'

import Button from '@/components/ui/Button'
import { CheckCircle, XCircle } from 'lucide-react'
import { useUser } from '@/contexts/UserContext'
import { useNavigate } from 'react-router-dom'

export default function LeaveRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const toast = useToast()
  const { user } = useUser()
  const navigate = useNavigate()
  const [request, setRequest] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviewStage, setReviewStage] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [processing, setProcessing] = useState(false)

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

  const handleReview = async (approved: boolean) => {
    if (!reviewNotes && !approved) {
      toast.error('Please provide a reason for rejection')
      return
    }

    setProcessing(true)
    try {
      const res = await apiClient.post(`/api/leave/requests/${id}/review`, {
        approved,
        reviewNotes
      })

      if (res.data.success) {
        toast.success(res.data.message)
        fetchRequest()
        // Navigate back to list after short delay
        setTimeout(() => navigate('/dashboard/leave/requests'), 1500)
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to submit review')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (!request) return <div className="p-6">Request not found</div>

  const canReview = user?.role !== 'employee' && (request.status === 'pending' || request.status === 'in_review')

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#e0e0e0] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[#212121] mb-6">Leave Request Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Employee</p>
              <p className="text-base text-gray-900">{request.user_name}</p>
              <p className="text-sm text-gray-500">{request.user_email}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Leave Type</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  {request.leave_type_name?.toUpperCase() || 'UNKNOWN'}
                </span>
                {request.half_day_start && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                    HALF DAY
                  </span>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Duration</p>
              <p className="text-base text-gray-900 mt-1">
                {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-500">
                {request.days_requested} day(s)
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <p className={`inline-flex mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${request.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                  request.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-yellow-50 text-yellow-700 border-yellow-200'
                }`}>
                {request.status.toUpperCase()}
              </p>
            </div>

            {reviewStage && (
              <div>
                <p className="text-sm font-medium text-gray-500">Current Review Stage</p>
                <p className="text-base text-gray-900 capitalize">{reviewStage}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-500">Reason</p>
              <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-200">
                {request.reason}
              </div>
            </div>

            {request.rejection_reason && (
              <div>
                <p className="text-sm font-medium text-gray-500">Review Notes</p>
                <div className="mt-1 p-3 bg-red-50 rounded-lg text-sm text-gray-700 border border-red-100">
                  {request.rejection_reason}
                </div>
              </div>
            )}
          </div>
        </div>

        {canReview && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-md font-semibold text-gray-900 mb-4">Review Request</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Review Notes (Optional for approval, required for rejection)</label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full mt-1 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                  placeholder="Add comments..."
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  onClick={() => handleReview(true)}
                  loading={processing && request.status !== 'rejected'}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Request
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleReview(false)}
                  loading={processing && request.status === 'rejected'}
                  disabled={processing}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Request
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}