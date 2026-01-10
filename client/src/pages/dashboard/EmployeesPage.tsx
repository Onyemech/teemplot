import { useState, useEffect } from 'react'
import { UserPlus, Mail, Clock, CheckCircle } from 'lucide-react'
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

export default function EmployeesPage({ initialTab = 'employees' }: { initialTab?: 'employees' | 'invitations' }) {
  const navigate = useNavigate()
  const { hasAccess } = useFeatureAccess()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  // const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'employees' | 'invitations'>(initialTab)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    if (!hasAccess('employees')) {
      navigate('/dashboard')
      return
    }
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // setLoading(true)
      const [employeesRes, invitationsRes] = await Promise.all([
        apiClient.get('/api/employees'),
        apiClient.get('/api/employee-invitations/list')
      ])

      setEmployees(employeesRes.data.data || [])
      setInvitations(invitationsRes.data.data || [])
    } catch (error: any) {
      console.error('Failed to fetch data:', error)
      // Don't show error toast, just set empty arrays
      setEmployees([])
      setInvitations([])
    } finally {
      // setLoading(false)
    }
  }

  const handleInviteSuccess = () => {
    fetchData()
  }



  return (
    <div className="h-full bg-gray-50 p-3 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Team Management</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">Manage your employees and invitations</p>
        </div>
        
        <button
          onClick={() => setShowInviteModal(true)}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2.5 md:px-6 md:py-3 text-sm md:text-base rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg w-full md:w-auto"
        >
          <UserPlus className="w-4 h-4 md:w-5 md:h-5" />
          <span>Invite Employee</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <StatCard
          label="Total Employees"
          value={employees.length}
          icon={UserPlus}
          iconColorClass="text-primary"
        />

        <StatCard
          label="Active Employees"
          value={employees.filter(e => e.status === 'active').length}
          icon={CheckCircle}
          iconColorClass="text-success"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 mb-6">
        <div className="flex flex-col sm:flex-row border-b border-gray-200">
          <button
            onClick={() => setActiveTab('employees')}
            className={`flex-1 px-4 py-3 sm:px-6 sm:py-4 text-sm font-semibold transition-all duration-300 sm:rounded-tl-xl ${
              activeTab === 'employees'
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Employees ({employees.length})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`flex-1 px-4 py-3 sm:px-6 sm:py-4 text-sm font-semibold transition-all duration-300 sm:rounded-tr-xl ${
              activeTab === 'invitations'
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
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
                <div className="text-center py-8 md:py-12">
                  <UserPlus className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-3 md:mb-4" />
                  <h3 className="text-base md:text-lg font-medium text-gray-900 mb-1 md:mb-2">No employees yet</h3>
                  <p className="text-sm text-gray-500 mb-4 md:mb-6 max-w-[200px] mx-auto md:max-w-none">Start building your team by inviting employees</p>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="bg-primary hover:bg-primary/90 text-white px-4 py-2.5 md:px-6 md:py-3 rounded-xl font-medium inline-flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg text-sm md:text-base w-full sm:w-auto max-w-[280px] sm:max-w-none"
                  >
                    <UserPlus className="w-4 h-4 md:w-5 md:h-5" />
                    <span>Invite Your First Employee</span>
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {employees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between p-4 md:p-5 bg-white rounded-xl border border-gray-200 hover:border-primary/30 hover:shadow-md transition-all duration-300"
                    >
                      <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                        {employee.avatar ? (
                          <img
                            src={employee.avatar}
                            alt={`${employee.firstName} ${employee.lastName}`}
                            className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-sm flex-shrink-0">
                            <span className="text-white font-semibold text-base md:text-lg">
                              {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-gray-900 truncate pr-2">
                            {employee.firstName} {employee.lastName}
                          </h3>
                          <p className="text-sm text-gray-600 truncate">{employee.email}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500 whitespace-nowrap">{employee.role}</span>
                            {employee.position && (
                              <>
                                <span className="text-xs text-gray-400 hidden sm:inline">•</span>
                                <span className="text-xs text-gray-500 truncate max-w-[100px] sm:max-w-none">{employee.position}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 sm:mt-0 sm:ml-2 self-start sm:self-auto">
                        <span className={`flex-shrink-0 px-2 py-1 md:px-4 md:py-2 rounded-xl text-[10px] md:text-xs font-semibold shadow-sm whitespace-nowrap ${
                          employee.status === 'active'
                            ? 'bg-gradient-to-r from-success/10 to-success/20 text-success border border-success/20'
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          {employee.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.filter(i => i.status === 'pending').length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No pending invitations</h3>
                  <p className="text-gray-500">Invitations you send will appear here</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {invitations.filter(i => i.status === 'pending').map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-5 bg-white rounded-xl border border-gray-200 hover:border-accent/30 hover:shadow-md transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center shadow-sm">
                          <Mail className="w-6 h-6 text-gray-600" />
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
                      <div className="flex items-center gap-2 mt-3 sm:mt-0 self-start sm:self-auto">
                        <span className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300 flex items-center gap-1 shadow-sm">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
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

interface StatCardProps {
  label: string
  value: string | number
  subtext?: React.ReactNode
  icon?: React.ElementType
  iconColorClass?: string
}

function StatCard({ label, value, subtext, icon: Icon, iconColorClass }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden flex flex-col h-full">
      <div className="bg-[#F5F7F7] px-4 py-3 border-b border-gray-100 flex justify-between items-center gap-2">
        <div className="text-xs font-bold text-gray-700 uppercase tracking-wider leading-tight min-w-0" title={label}>
          <span className="block">{label}</span>
        </div>
        {Icon && <Icon className={`h-4 w-4 flex-shrink-0 ${iconColorClass || 'text-gray-500'}`} />}
      </div>
      <div className="bg-white px-4 py-4 flex-1 flex flex-col justify-center">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {subtext && <div className="mt-1">{subtext}</div>}
      </div>
    </div>
  )
}
