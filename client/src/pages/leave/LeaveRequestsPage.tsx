import { useEffect, useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { useUser } from '@/contexts/UserContext'
import { Calendar, Clock, AlertCircle, CheckCircle, XCircle, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function LeaveRequestsPage() {
  const toast = useToast()
  const { user } = useUser()
  const navigate = useNavigate()
  const [requests, setRequests] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/api/leave/requests', {
        params: { status: filter === 'all' ? undefined : filter }
      })
      if (res.data.success) {
        setRequests(res.data.data)
      }
    } catch (e) {
      toast.error('Failed to load leave requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [filter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50 border-green-200'
      case 'pending': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'in_review': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />
      case 'pending': return <Clock className="w-4 h-4 text-orange-500" />
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
          <p className="text-gray-500">Track and manage leave applications</p>
        </div>
        
        <Button onClick={() => navigate('/dashboard/leave/request')}>
          + Request Leave
        </Button>
      </div>

      <div className="flex items-center justify-end bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="w-full md:w-64">
           <Select
              value={filter}
              onChange={setFilter}
              options={[
                { label: 'All Requests', value: 'all' },
                { label: 'Pending', value: 'pending' },
                { label: 'Approved', value: 'approved' },
                { label: 'Rejected', value: 'rejected' },
              ]}
              placeholder="Filter by status"
           />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500">No leave requests found</p>
            </div>
          ) : (
            requests.map((r) => (
              <Card key={r.id} className="hover:shadow-md transition-shadow">
                <div className="p-4 md:p-6 flex flex-col md:flex-row gap-4 justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-start justify-between md:justify-start gap-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(r.status)}`}>
                        {getStatusIcon(r.status)}
                        {r.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500 font-medium">
                        {r.leave_type.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-1">
                      {r.user_name && (
                        <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                          <User className="w-4 h-4 text-gray-400" />
                          {r.user_name}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(r.start_date).toLocaleDateString()} - {new Date(r.end_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{r.total_days} day(s)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex md:flex-col gap-2 justify-center min-w-[140px]">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/leave/requests/${r.id}`)}>
                      View Details
                    </Button>
                    
                    {/* If manager/admin and status is pending, show Review button */}
                    {(user?.role !== 'employee' && r.status === 'pending') && (
                       <Button 
                         variant="primary" 
                         size="sm"
                         onClick={() => navigate(`/dashboard/leave/requests/${r.id}`)}
                       >
                         Review
                       </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
