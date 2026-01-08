import { HelpCircle, Phone, MessageCircle, ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useToast } from '@/contexts/ToastContext'
import { useUser } from '@/contexts/UserContext'
import { apiClient } from '@/lib/api'

interface OnboardingNavbarProps {
  currentStep?: number
  totalSteps?: number
  showSteps?: boolean
  onSave?: () => Promise<void>
  onBack?: () => void
  showBackButton?: boolean
  disabled?: boolean
}

export default function OnboardingNavbar({
  currentStep,
  totalSteps = 5,
  showSteps = true,
  onSave,
  onBack,
  showBackButton = true,
  disabled = false
}: OnboardingNavbarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const { clearUser } = useUser()
  const [saving, setSaving] = useState(false)
  
  // Determine if we should show the back button
  const canGoBack = showBackButton && currentStep && currentStep > 1 && onBack

  // Get context-aware WhatsApp message based on current step
  const getWhatsAppLink = () => {
    const phone = '2347038026992' // Without + or spaces
    let message = 'Hi, I need help with Teemplot onboarding. '
    
    // Determine current step from URL
    const path = location.pathname
    if (path.includes('/register')) {
      message += "I'm on the registration step."
    } else if (path.includes('/verify')) {
      message += "I'm on the email verification step."
    } else if (path.includes('/company-setup')) {
      message += "I'm on the company setup step."
    } else if (path.includes('/owner-details')) {
      message += "I'm on the owner details step."
    } else if (path.includes('/business-info')) {
      message += "I'm on the business information step."
    } else if (path.includes('/documents')) {
      message += "I'm on the documents upload step."
    } else if (path.includes('/subscription')) {
      message += "I'm on the subscription step."
    } else if (currentStep) {
      message += `I'm on step ${currentStep} of ${totalSteps}.`
    }
    
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  }

  const handleSaveAndExit = async () => {
    setSaving(true)

    try {
      // Call the onSave callback if provided (this saves current form data to database)
      if (onSave) {
        await onSave()
      }

      // Explicitly LOG OUT the user to ensure clean state
      try {
        await apiClient.post('/api/auth/logout')
      } catch (e) {
        console.log('Logout call failed (might already be logged out):', e)
      }

      // Clear local session data
      clearUser()
      sessionStorage.clear()
      localStorage.removeItem('auth_token')
      localStorage.removeItem('onboarding_progress')
      
      toast.success('Progress saved! You have been logged out.')

      // Navigate to landing page
      setTimeout(() => {
        navigate('/')
      }, 1000)
    } catch (error: any) {
      if (import.meta.env.MODE === 'development') {
        console.error('Save and exit error:', error)
      }
      
      // Force logout and redirect even on error
      clearUser()
      sessionStorage.clear()
      
      toast.info('Redirecting to home...')
      setTimeout(() => {
        navigate('/')
      }, 1000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Back button, Logo and step indicator */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Back Button - Positioned before logo */}
            {canGoBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1 px-2 md:px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Go back to previous step"
              >
                <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}
            
            {/* Logo and Steps */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <img
                src="/logo.png"
                alt="Teemplot"
                className="h-10 md:h-12 w-auto cursor-pointer"
                onClick={() => navigate('/')}
              />
            {showSteps && currentStep && (
              <>
                {/* Mobile: Step text below logo */}
                <div className="md:hidden">
                  <span className="text-xs font-semibold text-gray-700">
                    Step {currentStep} of {totalSteps}
                  </span>
                </div>
                {/* Desktop: Step indicator with bars */}
                <div className="hidden md:flex items-center gap-2">
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
              </>
            )}
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Help & Support Dropdown */}
            <div className="relative group">
              {/* Mobile: Icon only */}
              <button className="sm:hidden flex items-center justify-center w-9 h-9 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <HelpCircle className="w-5 h-5" />
              </button>
              
              {/* Desktop: Icon + Text */}
              <button className="hidden sm:flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors">
                <HelpCircle className="w-4 h-4" />
                <span>Help & support</span>
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-4 space-y-3">
                  <p className="text-xs text-gray-600 mb-3">Need help? Contact us:</p>
                  
                  {/* Phone */}
                  <a
                    href="tel:+2347038026992"
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Phone className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Call Us</p>
                      <p className="text-xs text-gray-600">+234 703 802 6992</p>
                    </div>
                  </a>

                  {/* WhatsApp */}
                  <a
                    href={getWhatsAppLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">WhatsApp</p>
                      <p className="text-xs text-gray-600">Chat with us</p>
                    </div>
                  </a>
                </div>
              </div>
            </div>

            <button
              className="px-3 md:px-4 py-2 text-xs md:text-sm font-semibold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              onClick={handleSaveAndExit}
              disabled={saving || disabled}
              title={disabled ? 'Please complete email verification to enable saving' : saving ? 'Saving progress...' : 'Save progress and exit'}
            >
              {saving ? 'Saving...' : 'Save & exit'}
            </button>
          </div>
        </div>

        {/* Mobile Progress Bar - More prominent */}
        {showSteps && currentStep && (
          <div className="md:hidden mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, index) => (
                <div
                  key={index}
                  className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                    index < currentStep
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
    </div>
  )
}
