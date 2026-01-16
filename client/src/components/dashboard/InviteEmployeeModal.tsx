import { useState, useEffect } from 'react'
import { X, Mail, AlertTriangle, Info, RefreshCw, Users } from 'lucide-react'
import { UserRoles, RoleLabels } from '@/constants/roles'
import { apiClient } from '@/lib/api'
import { useToast } from '@/contexts/ToastContext'
import AnimatedCheckmark from '@/components/ui/AnimatedCheckmark'
import { useEmployeeLimit } from '@/hooks/useEmployeeLimit'
import { buildApiUrl } from '@/utils/apiHelpers'
import EmployeeLimitUpgradeModal from './EmployeeLimitUpgradeModal'

import Select from '@/components/ui/Select'

interface InviteEmployeeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface RealTimeCounter {
  currentCount: number
  declaredLimit: number
  remaining: number
  planType: 'silver' | 'gold' | 'enterprise'
  isLoading: boolean
}

interface InvitationError {
  code: string
  message: string
  details?: string
  troubleshooting?: string[]
}

export default function InviteEmployeeModal({
  isOpen,
  onClose,
  onSuccess
}: InviteEmployeeModalProps) {
  const toast = useToast()
  // Destructure planType from the hook
  const { declaredLimit, currentCount, remaining, planType } = useEmployeeLimit()
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeInfo, setUpgradeInfo] = useState<any>(null)
  const [realTimeCounter, setRealTimeCounter] = useState<RealTimeCounter>({
    currentCount,
    declaredLimit,
    remaining,
    planType: planType || 'silver',
    isLoading: false
  })
  const [invitationError, setInvitationError] = useState<InvitationError | null>(null)
  const [showErrorDetails, setShowErrorDetails] = useState(false)
  const [formData, setFormData] = useState<{
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    position: string;
  }>({
    email: '',
    firstName: '',
    lastName: '',
    role: UserRoles.EMPLOYEE,
    position: ''
  })

  // Real-time counter updates via SSE
  useEffect(() => {
    if (!isOpen) return

    let isClosed = false
    let retryTimeout: number | undefined
    let eventSource: EventSource | null = null

    const connect = () => {
      if (isClosed) return
      eventSource = new EventSource(buildApiUrl('/employee-invitations/counter-updates'), { withCredentials: true })

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        setRealTimeCounter(prev => ({
          ...prev,
          currentCount: data.currentCount,
          declaredLimit: data.declaredLimit ?? prev.declaredLimit,
          remaining: data.remaining,
          planType: data.planType,
          isLoading: false
        }))
      }

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error)
        eventSource?.close()
        if (isClosed) return
        retryTimeout = window.setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      isClosed = true
      if (retryTimeout) {
        window.clearTimeout(retryTimeout)
      }
      eventSource?.close()
    }
  }, [isOpen])

  // Sync with useEmployeeLimit hook when data changes
  useEffect(() => {
    setRealTimeCounter(prev => ({
      ...prev,
      currentCount,
      declaredLimit,
      remaining,
      planType: planType || prev.planType, // Update planType
      isLoading: false
    }))
  }, [currentCount, declaredLimit, remaining, planType]) // Add planType dependency

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    setInvitationError(null)

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        throw new Error('Invalid email format')
      }

      // Validate name fields
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        throw new Error('First name and last name are required')
      }

      // Payload optimization: Send only essential data
      const payload = {
        email: formData.email.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        role: formData.role,
        position: formData.position?.trim() || undefined
      }

      await apiClient.post('/api/employee-invitations/invite', payload)

      setShowSuccess(true)
      toast.success('Invitation sent successfully!')

      // Wait for animation then close
      setTimeout(() => {
        setShowSuccess(false)
        setFormData({
          email: '',
          firstName: '',
          lastName: '',
          role: UserRoles.EMPLOYEE,
          position: ''
        })
        setInvitationError(null)
        onSuccess()
        onClose()
      }, 2000)
    } catch (error: any) {
      console.error('Failed to send invitation:', error)

      const errorData = error.response?.data

      // Handle specific error codes with comprehensive troubleshooting
      if (errorData?.code === 'EMPLOYEE_LIMIT_REACHED') {
        const upgradeData = errorData.upgradeInfo
        setUpgradeInfo({
          currentLimit: errorData.limit,
          currentPlan: upgradeData.currentPlan,
          pricePerEmployee: upgradeData.pricePerEmployee,
          currency: upgradeData.currency,
        })
        setShowUpgradeModal(true)
      } else if (errorData?.code === 'PLAN_VERIFICATION_FAILED') {
        setInvitationError({
          code: 'PLAN_VERIFICATION_FAILED',
          message: 'Plan verification failed. Please check your subscription status.',
          details: typeof errorData.details === 'string' ? errorData.details : errorData.details?.troubleshooting || 'Please check your internet connection and subscription status.',
          troubleshooting: [
            'Check your subscription status in Settings',
            'Contact support if your plan is active but verification fails',
            'Try refreshing the page and attempting again'
          ]
        })
      } else if (errorData?.code === 'DUPLICATE_INVITATION') {
        const msg = 'An active invitation already exists for this email.';
        setInvitationError({
          code: 'DUPLICATE_INVITATION',
          message: msg,
          troubleshooting: [
            'Check the Pending Invitations tab',
            'You can resend the existing invitation',
            'Cancel the old invitation if you need to create a new one'
          ]
        });
        toast.error(msg);
      } else if (errorData?.code === 'DUPLICATE_EMAIL') {
        const msg = 'This email address is already invited or registered.';
        setInvitationError({
          code: 'DUPLICATE_EMAIL',
          message: msg,
          details: errorData.details,
          troubleshooting: [
            'Check if the employee is already in your team',
            'Check pending invitations tab',
            'Use a different email address if this is a different person'
          ]
        });
        toast.error(msg);
      } else if (error.message === 'Invalid email format') {
        // ... (existing code)
        setInvitationError({
          code: 'INVALID_EMAIL',
          message: 'Please enter a valid email address.',
          troubleshooting: [
            'Check for typos in the email address',
            'Ensure the email contains @ and a domain',
            'Example: john.doe@company.com'
          ]
        })
        toast.error('Invalid email format');
      } else {
        // ... (existing generic code)
        let cleanMessage = errorData?.message || 'Failed to send invitation. Please try again.';
        cleanMessage = cleanMessage.replace(/(Error\s*)?\d{3}\s*:?\s*/gi, '').trim();

        setInvitationError({
          code: errorData?.code || 'UNKNOWN_ERROR',
          message: cleanMessage,
          details: errorData?.details,
          troubleshooting: [
            'Check your internet connection',
            'Verify the email address is correct',
            'Ensure you have available employee slots',
            'Try refreshing the page',
            'Contact support if the issue persists'
          ]
        })
        toast.error(cleanMessage);
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (additionalEmployees: number) => {
    try {
      const response = await apiClient.post('/subscription/upgrade-employee-limit', {
        additionalEmployees,
      })

      // Redirect to payment page
      if (response.data.success && response.data.data.authorizationUrl) {
        window.location.href = response.data.data.authorizationUrl
      }
    } catch (error: any) {
      console.error('Failed to initiate upgrade:', error)
      toast.error(error.response?.data?.message || 'Failed to initiate upgrade')
      throw error
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Upgrade Modal */}
      {upgradeInfo && (
        <EmployeeLimitUpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          currentLimit={upgradeInfo.currentLimit}
          currentPlan={upgradeInfo.currentPlan}
          pricePerEmployee={upgradeInfo.pricePerEmployee}
          currency={upgradeInfo.currency}
          onUpgrade={handleUpgrade}
        />
      )}

      {/* Invite Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {showSuccess ? (
            <div className="p-8 text-center flex-1 flex flex-col justify-center items-center overflow-y-auto">
              <div className="flex justify-center mb-6">
                <AnimatedCheckmark size="lg" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Invitation Sent!</h3>
              <p className="text-gray-600">
                {formData.firstName} will receive an email to join your team
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 bg-white z-10 shrink-0">
                <div className="flex-1 min-w-0 pr-4">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 truncate">Invite Employee</h2>
                  <p className="text-xs md:text-sm text-gray-500 mt-0.5 truncate">Send invitation to join your organization</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* Real-time Counter Display - Compact Version */}
                <div className="mx-4 md:mx-6 mt-4 md:mt-6 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm shrink-0">
                        <Users className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">Employee Slots</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${realTimeCounter.planType === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                              realTimeCounter.planType === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                                'bg-blue-100 text-blue-800'
                            }`}>
                            {realTimeCounter.planType}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {realTimeCounter.isLoading ? (
                            <span className="flex items-center gap-1">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              Updating...
                            </span>
                          ) : (
                            <span>
                              <span className="font-medium text-gray-900">{realTimeCounter.currentCount}</span> used of <span className="font-medium text-gray-900">{realTimeCounter.declaredLimit}</span> • <span className="text-success font-medium">{realTimeCounter.remaining} remaining</span>
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error Display */}
                {invitationError && (
                  <div className="mx-4 md:mx-6 mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-red-800 mb-1">
                          {invitationError.message}
                        </p>
                        {invitationError.details && (
                          <p className="text-xs text-red-700 mb-2">
                            {invitationError.details}
                          </p>
                        )}
                        <button
                          onClick={() => setShowErrorDetails(!showErrorDetails)}
                          className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1 mt-1"
                        >
                          <Info className="w-3 h-3" />
                          {showErrorDetails ? 'Hide' : 'Show'} troubleshooting steps
                        </button>
                        {showErrorDetails && invitationError.troubleshooting && (
                          <div className="mt-2 pl-2 border-l-2 border-red-200 space-y-1">
                            {invitationError.troubleshooting.map((step, index) => (
                              <div key={index} className="text-xs text-red-700">
                                • {step}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {realTimeCounter.remaining <= 0 && realTimeCounter.remaining !== undefined && (
                  <div className="mx-4 md:mx-6 mt-4 p-3 bg-orange-50 border border-orange-100 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-orange-800">
                          Limit reached
                        </p>
                        <p className="text-xs text-orange-700 mt-0.5">
                          Upgrade plan to add more.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {/* Name Fields */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            First Name
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm bg-gray-50 focus:bg-white"
                            placeholder="John"
                            disabled={realTimeCounter.remaining <= 0}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            Last Name
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm bg-gray-50/50 focus:bg-white"
                            placeholder="Doe"
                            disabled={realTimeCounter.remaining <= 0}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                          <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm bg-gray-50/50 focus:bg-white"
                            placeholder="john@company.com"
                            disabled={realTimeCounter.remaining <= 0}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Role & Position */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Role
                        </label>
                        <Select
                          options={[
                            { value: UserRoles.EMPLOYEE, label: RoleLabels[UserRoles.EMPLOYEE] },
                            { value: UserRoles.DEPARTMENT_HEAD, label: RoleLabels[UserRoles.DEPARTMENT_HEAD] },
                            { value: UserRoles.ADMIN, label: RoleLabels[UserRoles.ADMIN] },
                          ]}
                          value={formData.role}
                          onChange={(value) => setFormData({ ...formData, role: value as any })}
                          disabled={realTimeCounter.remaining <= 0}
                          fullWidth
                        />
                        <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
                          {formData.role === UserRoles.ADMIN && 'Full system control.'}
                          {formData.role === UserRoles.DEPARTMENT_HEAD && 'Manage department users.'}
                          {formData.role === UserRoles.EMPLOYEE && 'View own tasks only.'}
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Position <span className="text-gray-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={formData.position}
                          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm bg-gray-50/50 focus:bg-white"
                          placeholder="e.g. Designer"
                          disabled={realTimeCounter.remaining <= 0}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-semibold text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || realTimeCounter.remaining <= 0}
                      className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-semibold text-sm shadow-md"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Sending...
                        </span>
                      ) : (
                        'Send Invite'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
