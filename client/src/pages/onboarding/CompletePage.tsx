import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import { LogoLoader } from '@/components/LogoLoader';
import AnimatedCheckmark from '@/components/ui/AnimatedCheckmark';
import { completeOnboarding } from '@/utils/onboardingApi';
import { getUser } from '@/utils/auth';
import { useToast } from '@/contexts/ToastContext';

export default function OnboardingCompletePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [isCompleting, setIsCompleting] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const completeOnboardingProcess = async () => {
      try {
        // Get user from httpOnly cookie
        const user = await getUser();
        
        if (!user || !user.companyId) {
          throw new Error('Session expired. Please log in again.');
        }
        
        // Call complete onboarding API
        await completeOnboarding({
          companyId: user.companyId,
          userId: user.id,
        });
        
        // Mark onboarding as complete
        sessionStorage.setItem('onboarding_completed', 'true');
        
        setIsCompleting(false);
        
        // Trigger success animation
        setTimeout(() => setShowContent(true), 100);
      } catch (error: any) {
        console.error('Failed to complete onboarding:', error);
        toast.error(error.message || 'Failed to complete onboarding');
        // Still show success UI even if API fails (data is already saved)
        setIsCompleting(false);
        setTimeout(() => setShowContent(true), 100);
      }
    };

    completeOnboardingProcess();
  }, []);

  const handleGoToDashboard = () => {
    // Clear onboarding data
    sessionStorage.removeItem('onboarding_auth');
    sessionStorage.removeItem('onboarding_company_setup');
    sessionStorage.removeItem('onboarding_owner_details');
    sessionStorage.removeItem('onboarding_business_info');
    sessionStorage.removeItem('onboarding_documents');
    sessionStorage.removeItem('onboarding_subscription');
    
    // Navigate to dashboard
    navigate('/dashboard');
  };

  if (isCompleting) {
    return <LogoLoader message="Completing your setup..." />;
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 sm:p-6">
      <div className="text-center max-w-md w-full">
        {/* Success Checkmark Animation */}
        <div className="mb-8 flex justify-center">
          {showContent && <AnimatedCheckmark size="lg" />}
        </div>

        {/* Success Message */}
        <div className={`
          transition-all duration-500 delay-300
          ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Company details submitted
          </h1>
          <p className="text-base sm:text-lg text-gray-600 mb-8 px-4">
            Thank you for completing your company onboarding, your company details has been received by our onboarding team. We will verify your information provided and grant you full access.
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
            className="bg-[#0F5D5D] hover:bg-[#0a4545] text-white font-semibold py-3 sm:py-4 rounded-xl w-full"
          >
            Go to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
