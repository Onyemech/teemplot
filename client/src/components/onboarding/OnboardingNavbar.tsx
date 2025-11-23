import { HelpCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useToast } from '@/contexts/ToastContext'

interface OnboardingNavbarProps {
  currentStep?: number
  totalSteps?: number
  showSteps?: boolean
  onSave?: () => Promise<void>
}

export default function OnboardingNavbar({
  currentStep,
  totalSteps = 9,
  showSteps = true,
  onSave
}: OnboardingNavbarProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const [saving, setSaving] = useState(false)

  const handleSaveAndExit = async () => {
    setSaving(true)

    try {
      // Call the onSave callback if provided
      if (onSave) {
        await onSave()
      }

      toast.success('Progress saved successfully!')

      // Wait a moment for toast to show
      setTimeout(() => {
        navigate('/')
      }, 1000)
    } catch (error: any) {
      console.error('Save error:', error)
      const message = error.message || 'Failed to save progress. Please try again.'
      toast.error(message)
      setSaving(false)
    }
  }

  return (
    <div className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Logo and step indicator */}
          <div className="flex items-center gap-6">
            <img
              src="/logo.png"
              alt="Teemplot"
              className="h-12 w-auto cursor-pointer"
              onClick={() => navigate('/')}
            />
            {showSteps && currentStep && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  Step {currentStep} of {totalSteps}
                </span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalSteps }).map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 w-8 rounded-full transition-colors ${index < currentStep
                          ? 'bg-primary-600'
                          : index === currentStep - 1
                            ? 'bg-primary-400'
                            : 'bg-gray-200'
                        }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-4">
            <button
              className="hidden sm:flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
              onClick={() => window.open('mailto:support@teemplot.com', '_blank')}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Help & support</span>
            </button>
            <button
              className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSaveAndExit}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save & exit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
