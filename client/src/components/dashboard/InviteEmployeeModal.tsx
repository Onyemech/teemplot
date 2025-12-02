import { useState } from 'react'
import { X, Mail, User, Briefcase } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { useToast } from '@/contexts/ToastContext'
import AnimatedCheckmark from '@/components/ui/AnimatedCheckmark'

interface InviteEmployeeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  currentPlan: 'free' | 'silver' | 'gold'
  currentEmployeeCount: number
}

export default function InviteEmployeeModal({
  isOpen,
  onClose,
  onSuccess,
  currentPlan,
  currentEmployeeCount
}: InviteEmployeeModalProps) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'staff' as 'admin' | 'staff',
    position: ''
  })

  // Plan limits
  const planLimits = {
    free: 10,
    silver: 50,
    gold: Infinity
  }

  const limit = planLimits[currentPlan]
  const canInvite = currentEmployeeCount < limit

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!canInvite) {
      toast.error(`You've reached the ${currentPlan} plan limit of ${limit} employees. Please upgrade your plan.`)
      return
    }

    setLoading(true)

    try {
      await apiClient.post('/api/employees/invite', formData)
      
      setShowSuccess(true)
      toast.success('Invitation sent successfully!')
      
      // Wait for animation then close
      setTimeout(() => {
        setShowSuccess(false)
        setFormData({
          email: '',
          firstName: '',
          lastName: '',
          role: 'staff',
          position: ''
        })
        onSuccess()
        onClose()
      }, 2000)
    } catch (error: any) {
      console.error('Failed to send invitation:', error)
      toast.error(error.response?.data?.message || 'Failed to send invitation')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {showSuccess ? (
          <div className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <AnimatedCheckmark size="lg" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Invitation Sent!</h3>
            <p className="text-gray-600">
              {formData.firstName} will receive an email to join your team
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Invite Employee</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {!canInvite && (
              <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 font-medium">
                  You've reached your plan limit of {limit} employees
                </p>
                <button
                  onClick={() => window.location.href = '/dashboard/settings/billing'}
                  className="mt-2 text-sm text-red-600 underline hover:text-red-800"
                >
                  Upgrade your plan
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="John"
                    disabled={!canInvite}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Doe"
                    disabled={!canInvite}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="john.doe@company.com"
                  disabled={!canInvite}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'staff' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  disabled={!canInvite}
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Briefcase className="w-4 h-4 inline mr-1" />
                  Position (Optional)
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Software Engineer"
                  disabled={!canInvite}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !canInvite}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>

              <div className="text-xs text-gray-500 text-center">
                {currentPlan === 'free' && `${currentEmployeeCount}/${limit} employees used`}
                {currentPlan === 'silver' && `${currentEmployeeCount}/${limit} employees used`}
                {currentPlan === 'gold' && `${currentEmployeeCount} employees`}
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
