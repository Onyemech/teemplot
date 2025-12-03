import { useState, useEffect } from 'react'
import { UserPlus, Mail, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { useNavigate } from 'react-router-dom'
import { useFeatureAccess } from '@/hooks/useFeatureAccess'
import InviteEmployeeModal from '@/components/dashboard/InviteEmployeeModal'
import { format } from 'date-fns'

interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  position: string
  status: 'active' | 'inactive'
  avatar?: string
  createdAt: string
}

interface Invitation {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  position: string
  status: 'pending' | 'accepted' | 'expired'
  created_at: string
  expires_at: string
}

export default function EmployeesPage() {
  const navigate = useNavigate()
  const { hasAccess } = useFeatureAccess()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'employees' | 'invitations'>('employees')

  useEffect(() => {
    if (!hasAccess('employees')) {
      navigate('/dashboard')
      return
    }
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [employeesRes, invitationsRes] = await Promise.all([
        apiClient.get('/employees'),
        apiClient.get('/employees/invitations')
      ])

      setEmployees(employeesRes.data.data || [])
      setInvitations(invitationsRes.data.data || [])
    } catch (error: any) {
      console.error('Failed to fetch data:', error)
      // Don't show error toast, just set empty arrays
      setEmployees([])
      setInvitations([])
    } finally {
      setLoading(false)
    }
  }

  const handleInviteSuccess = () => {
    fetchData()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600 mt-1">Manage your employees and invitations</p>
        </div>
        
        <button
          onClick={() => setShowInviteModal(true)}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Invite Employee
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('employees')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'employees'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Employees ({employees.length})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'invitations'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending Invitations ({invitations.filter(i => i.status === 'pending').length})
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'employees' ? (
            <div className="space-y-4">
              {employees.length === 0 ? (
                <div className="text-center py-12">
                  <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No employees yet</h3>
                  <p className="text-gray-500 mb-6">Start building your team by inviting employees</p>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-medium inline-flex items-center gap-2 transition-colors"
                  >
                    <UserPlus className="w-5 h-5" />
                    Invite Your First Employee
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {employees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {employee.avatar ? (
                          <img
                            src={employee.avatar}
                            alt={`${employee.firstName} ${employee.lastName}`}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-white font-medium text-lg">
                              {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {employee.firstName} {employee.lastName}
                          </h3>
                          <p className="text-sm text-gray-600">{employee.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">{employee.role}</span>
                            {employee.position && (
                              <>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-500">{employee.position}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        employee.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {employee.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No pending invitations</h3>
                  <p className="text-gray-500">Invitations you send will appear here</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <Mail className="w-6 h-6 text-gray-500" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {invitation.first_name} {invitation.last_name}
                          </h3>
                          <p className="text-sm text-gray-600">{invitation.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">{invitation.role}</span>
                            {invitation.position && (
                              <>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-500">{invitation.position}</span>
                              </>
                            )}
                            <span className="text-xs text-gray-400">•</span>
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              Expires {format(new Date(invitation.expires_at), 'MMM dd')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {invitation.status === 'pending' && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                        {invitation.status === 'accepted' && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Accepted
                          </span>
                        )}
                        {invitation.status === 'expired' && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            Expired
                          </span>
                        )}
                        {invitation.status === 'expired' && (
                          <button
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Resend invitation"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      <InviteEmployeeModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={handleInviteSuccess}
      />
    </div>
  )
}
