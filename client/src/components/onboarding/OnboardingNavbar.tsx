import { HelpCircle, Phone, MessageCircle } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useToast } from '@/contexts/ToastContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

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
  const location = useLocation()
  const toast = useToast()
  const [saving, setSaving] = useState(false)

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
      // Get auth data from sessionStorage or localStorage
      let authData = null
      
      // Try sessionStorage first (during onboarding)
      const sessionAuth = sessionStorage.getItem('onboarding_auth')
      if (sessionAuth) {
        authData = JSON.parse(sessionAuth)
      } else {
        // Try localStorage (logged in user)
        const userStr = localStorage.getItem('user')
        if (userStr) {
          const user = JSON.parse(userStr)
          authData = {
            userId: user.id,
            companyId: user.companyId || user.company_id
          }
        }
      }

      if (!authData?.userId || !authData?.companyId) {
        // If no auth data, just navigate away (user hasn't started onboarding yet)
        toast.info('No progress to save yet')
        navigate('/')
        return
      }

      // Call the onSave callback if provided (saves current form data)
      if (onSave) {
        await onSave()
      }

      // Save progress to database
      const response = await fetch(`${API_URL}/onboarding/save-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: authData.userId,
          companyId: authData.companyId,
          currentStep: currentStep || 1,
          completedSteps: [],
          formData: {} // Form data should be saved by individual pages
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.message || 'Failed to save progress')
      }

      toast.success('Progress saved! You can continue later.')

      // Wait a moment for toast to show
      setTimeout(() => {
        navigate('/')
      }, 1000)
    } catch (error: any) {
      console.error('Save error:', error)
      const message = error.message || 'Failed to save progress. Please try again.'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Logo and step indicator */}
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

          {/* Right side - Actions */}
          <div className="flex items-center gap-4">
            {/* Help & Support Dropdown */}
            <div className="relative group">
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
              disabled={saving}
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
