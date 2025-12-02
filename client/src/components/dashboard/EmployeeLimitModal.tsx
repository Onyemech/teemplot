import { Users, ArrowUpCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useFeatureAccess } from '@/hooks/useFeatureAccess'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function EmployeeLimitModal({ isOpen, onClose }: Props) {
  const navigate = useNavigate()
  const { employeeLimit, currentEmployeeCount, plan } = useFeatureAccess()

  if (!isOpen) return null

  const handleUpgrade = () => {
    navigate('/dashboard/settings/billing')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-orange-600" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Employee Limit Reached
          </h2>

          {/* Message */}
          <p className="text-gray-600 mb-4">
            You've reached your limit of {employeeLimit} employees on the {plan} plan.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Current employees: {currentEmployeeCount} / {employeeLimit}
          </p>

          {/* Actions */}
          <div className="w-full space-y-3">
            <button
              onClick={handleUpgrade}
              className="w-full bg-[#0F5D5D] hover:bg-[#0a4444] text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ArrowUpCircle className="w-5 h-5" />
              Upgrade Plan
            </button>
            <button
              onClick={onClose}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
