import { useState } from 'react'
import { UserPlus, Users, AlertCircle } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { useEmployeeLimit } from '@/hooks/useEmployeeLimit'
import { apiClient } from '@/lib/api'
import { getErrorMessage } from '@/utils/errorHandler'
import EmployeeLimitUpgradeModal from './EmployeeLimitUpgradeModal'

interface InviteEmployeeCardProps {
  /** Variant of the card display */
  variant?: 'button' | 'card' | 'compact'
  /** Custom text for the button/card */
  buttonText?: string
  /** Show employee count info */
  showCount?: boolean
  /** Callback when invitation is sent successfully */
  onSuccess?: () => void
  /** Custom className for styling */
  className?: string
}

interface UpgradeInfo {
  currentLimit: number
  currentPlan: string
  pricePerEmployee: number
  currency: string
}

export default function InviteEmployeeCard({
  variant = 'button',
  buttonText,
  showCount = true,
  onSuccess,
  className = ''
}: InviteEmployeeCardProps) {
  const toast = useToast()
  const { declaredLimit, currentCount, canAddMore, remaining, refresh } = useEmployeeLimit()
  
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [upgradeInfo, setUpgradeInfo] = useState<UpgradeInfo | null>(null)
  
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'staff' as 'admin' | 'staff',
    position: ''
  })

  const handleInviteClick = () => {
    if (!canAddMore) {
      // Show upgrade modal instead of invite modal
      setUpgradeInfo({
        currentLimit: declaredLimit,
        currentPlan: 'Silver', // This should come from user context
        pricePerEmployee: 1200, // This should come from your pricing config
        currency: 'NGN'
      })
      setShowUpgradeModal(true)
    } else {
      setShowInviteModal(true)
    }
  }

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await apiClient.post('/api/employees/invite', formData)
      
      if (response.data.success) {
        toast.success('Invitation sent successfully!')
        setShowInviteModal(false)
        setFormData({
          email: '',
          firstName: '',
          lastName: '',
          role: 'staff',
          position: ''
        })
        
        // Refresh employee count
        refresh()
        
        // Call success callback
        onSuccess?.()
      }
    } catch (error: any) {
      const errorMessage = getErrorMessage(error)
      
      // Check if it's an employee limit error
      if (error.response?.data?.code === 'EMPLOYEE_LIMIT_REACHED') {
        const upgradeData = error.response.data.upgradeInfo
        setUpgradeInfo({
          currentLimit: upgradeData.currentLimit,
          currentPlan: upgradeData.currentPlan || 'Silver',
          pricePerEmployee: upgradeData.pricePerEmployee,
          currency: upgradeData.currency
        })
        setShowInviteModal(false)
        setShowUpgradeModal(true)
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (additionalEmployees: number) => {
    try {
      const response = await apiClient.post('/api/subscription/upgrade-employee-limit', {
        additionalEmployees,
      })
      
      if (response.data.success) {
        toast.success('Employee limit upgraded successfully!')
        setShowUpgradeModal(false)
        refresh() // Refresh the employee limit
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error))
    }
  }

  // Render different variants
  if (variant === 'compact') {
    return (
      <>
        <button
          onClick={handleInviteClick}
          className={`inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium text-sm shadow-md hover:shadow-lg transition-all duration-200 ${className}`}
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">{buttonText || 'Invite Employee'}</span>
          <span className="sm:hidden">Invite</span>
        </button>
        {renderModals()}
      </>
    )
  }

  if (variant === 'card') {
    return (
      <>
        <div className={`bg-white rounded-xl shadow-md border border-gray-100 p-6 ${className}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Team Management</h3>
                <p className="text-sm text-gray-600">Invite new team members</p>
              </div>
            </div>
          </div>

          {showCount && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Current Team Size</span>
                <span className="font-medium text-gray-900">{currentCount}/{declaredLimit}</span>
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentCount / declaredLimit) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {remaining} {remaining === 1 ? 'slot' : 'slots'} remaining
              </p>
            </div>
          )}

          {!canAddMore && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <p className="text-sm text-amber-800 font-medium">
                  Employee limit reached
                </p>
              </div>
              <p className="text-xs text-amber-700 mt-1">
                Upgrade your plan to invite more team members
              </p>
            </div>
          )}

          <button
            onClick={handleInviteClick}
            className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            {canAddMore ? (buttonText || 'Invite Employee') : 'Upgrade Plan'}
          </button>
        </div>
        {renderModals()}
      </>
    )
  }

  // Default button variant
  return (
    <>
      <button
        onClick={handleInviteClick}
        className={`bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 ${className}`}
      >
        <UserPlus className="w-5 h-5" />
        {buttonText || 'Invite Employee'}
      </button>
      {renderModals()}
    </>
  )

  function renderModals() {
    return (
      <>
        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Invite Employee</h2>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSendInvitation} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                    placeholder="john.doe@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'staff' })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                    placeholder="Software Developer"
                  />
                </div>

                {showCount && (
                  <div className="text-xs text-gray-500 text-center">
                    {currentCount}/{declaredLimit} employees • {remaining} {remaining === 1 ? 'slot' : 'slots'} remaining
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-900 rounded-xl hover:bg-gray-100 shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-primary hover:bg-primary/90 text-white py-2 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
      </>
    )
  }
}