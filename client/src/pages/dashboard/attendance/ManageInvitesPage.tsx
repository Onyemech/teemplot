import { useState, useEffect } from 'react'
import { Mail, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
// import { useUser } from '@/contexts/UserContext' // Commented out as not currently used
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'
import InviteEmployeeCard from '@/components/dashboard/InviteEmployeeCard'

interface PendingInvite {
  id: string
  email: string
  firstName: string
  lastName: string
  department: string
  position: string
  invitedAt: string
  status: 'pending' | 'accepted' | 'expired'
  expiresAt: string
}

export default function ManageInvitesPage() {
  // const { user } = useUser() // Commented out as not currently used
  const toast = useToast()
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [resending, setResending] = useState<string | null>(null)

  useEffect(() => {
    fetchInvites()
  }, [])

  const fetchInvites = async () => {
    try {
      const response = await apiClient.get('/api/employees/invites')
      if (response.data.success) {
        setInvites(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch invites:', error)
    } finally {
      setLoading(false)
    }
  }

  const resendInvite = async (inviteId: string) => {
    setResending(inviteId)
    try {
      const response = await apiClient.post(`/api/employees/invites/${inviteId}/resend`)
      if (response.data.success) {
        toast.success('Invitation resent successfully!')
        fetchInvites() // Refresh the list
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to resend invitation')
    } finally {
      setResending(null)
    }
  }

  const cancelInvite = async (inviteId: string) => {
    try {
      const response = await apiClient.delete(`/api/employees/invites/${inviteId}`)
      if (response.data.success) {
        toast.success('Invitation cancelled successfully!')
        fetchInvites() // Refresh the list
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel invitation')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-100 text-orange-800'
      case 'accepted':
        return 'bg-green-100 text-green-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />
      case 'accepted':
        return <CheckCircle className="w-4 h-4" />
      case 'expired':
        return <XCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-50 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Manage Invites</h1>
          <p className="text-gray-600 mt-2">Track and manage employee invitations</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Invites</p>
                <p className="text-2xl font-bold text-gray-900">
                  {invites.filter(i => i.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Accepted</p>
                <p className="text-2xl font-bold text-gray-900">
                  {invites.filter(i => i.status === 'accepted').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Expired</p>
                <p className="text-2xl font-bold text-gray-900">
                  {invites.filter(i => i.status === 'expired').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Invites List */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Employee Invitations</h2>
              <button
                onClick={fetchInvites}
                className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {invites.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Invitations</h3>
              <p className="text-gray-500 mb-6">You haven't sent any employee invitations yet.</p>
              <InviteEmployeeCard 
                variant="button"
                buttonText="Invite Employees"
                onSuccess={fetchInvites}
                className="mx-auto"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invited
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invites.map((invite) => (
                    <tr key={invite.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {invite.firstName} {invite.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{invite.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{invite.department}</div>
                        <div className="text-sm text-gray-500">{invite.position}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invite.status)}`}>
                          {getStatusIcon(invite.status)}
                          {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invite.invitedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {invite.status === 'pending' && (
                            <button
                              onClick={() => resendInvite(invite.id)}
                              disabled={resending === invite.id}
                              className="bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1"
                            >
                              {resending === invite.id ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                              ) : (
                                <RefreshCw className="w-3 h-3" />
                              )}
                              Resend
                            </button>
                          )}
                          {invite.status !== 'accepted' && (
                            <button
                              onClick={() => cancelInvite(invite.id)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3" />
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}