import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { Check } from 'lucide-react'
import Button from '@/components/ui/Button'
import { LogoLoader } from '@/components/LogoLoader'

export default function OnboardingCompletePage() {
  const navigate = useNavigate()
  const [isCompleting, setIsCompleting] = useState(true)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    const completeOnboarding = async () => {
      // Simulate completion process (API calls, setup, etc.)
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mark onboarding as complete
      sessionStorage.setItem('onboarding_completed', 'true')
      
      setIsCompleting(false)
      
      // Trigger success animation
      setTimeout(() => setShowContent(true), 100)
    }

    completeOnboarding()
  }, [])

  const handleGoToDashboard = () => {
    // Clear onboarding data
    sessionStorage.removeItem('onboarding_auth')
    sessionStorage.removeItem('onboarding_company_setup')
    sessionStorage.removeItem('onboarding_owner_details')
    sessionStorage.removeItem('onboarding_business_info')
    sessionStorage.removeItem('onboarding_documents')
    sessionStorage.removeItem('onboarding_subscription')
    
    // Navigate to dashboard
    navigate('/dashboard')
  }

  if (isCompleting) {
    return <LogoLoader message="Completing your setup..." />
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        {/* Success Checkmark Animation */}
        <div className={`
          w-32 h-32 mx-auto mb-8 rounded-full flex items-center justify-center
          transition-all duration-500 ease-out
          ${showContent ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}
        `}
          style={{
            backgroundColor: '#7CB342', // Green color from image
            animation: showContent ? 'bounce 0.6s ease-out' : 'none'
          }}
        >
          <Check 
            className="text-white" 
            size={64} 
            strokeWidth={3}
            style={{
              animation: showContent ? 'checkmark 0.5s ease-out 0.3s both' : 'none'
            }}
          />
        </div>

        {/* Success Message */}
        <div className={`
          transition-all duration-500 delay-300
          ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Congratulations!
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            You're all set up
          </p>
        </div>

        {/* Go to Dashboard Button */}
        <div className={`
          transition-all duration-500 delay-500
          ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleGoToDashboard}
            className="bg-[#0F5D5D] hover:bg-[#0a4545] text-white font-semibold py-4 rounded-xl"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes bounce {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        @keyframes checkmark {
          0% {
            stroke-dasharray: 100;
            stroke-dashoffset: 100;
          }
          100% {
            stroke-dasharray: 100;
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  )
}
