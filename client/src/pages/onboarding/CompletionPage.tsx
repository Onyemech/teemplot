import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export default function CompletionPage() {
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Trigger animations
    setTimeout(() => setShowContent(true), 100);

    // Clear onboarding data from session
    const clearOnboardingData = () => {
      sessionStorage.removeItem('registrantInfo');
      sessionStorage.removeItem('isOwner');
      sessionStorage.removeItem('ownerDetails');
      sessionStorage.removeItem('businessInfo');
      sessionStorage.removeItem('companyLogo');
      sessionStorage.removeItem('documents');
      sessionStorage.removeItem('selectedPlan');
    };

    // Clear after a delay
    setTimeout(clearOnboardingData, 2000);
  }, []);

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className={`text-center transition-all duration-500 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Success Icon with Animation */}
        <div className="mb-8 flex justify-center">
          <div className={`relative transition-all duration-500 ${showContent ? 'scale-100' : 'scale-0'}`}>
            {/* Outer Circle */}
            <div className="w-32 h-32 bg-[#0F5D5D] rounded-full flex items-center justify-center relative">
              {/* Checkmark */}
              <CheckCircle 
                className="h-20 w-20 text-white animate-[draw_0.3s_ease-in-out_0.5s_forwards]" 
                strokeWidth={2}
              />
              
              {/* Ripple Effect */}
              <div className="absolute inset-0 rounded-full bg-[#0F5D5D] animate-ping opacity-20"></div>
            </div>
          </div>
        </div>

        {/* Congratulations Text */}
        <div className={`space-y-4 transition-all duration-500 delay-300 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h1 className="text-4xl font-bold text-gray-900">
            Congratulations!
          </h1>
          <p className="text-xl text-gray-600">
            You're all set up
          </p>
          <p className="text-gray-500 max-w-md mx-auto">
            Your company account has been created successfully. You can now start managing your workforce.
          </p>
        </div>

        {/* Dashboard Button */}
        <div className={`mt-12 transition-all duration-500 delay-500 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <button
            onClick={handleGoToDashboard}
            className="bg-[#0F5D5D] text-white px-12 py-4 rounded-lg text-lg font-medium hover:bg-[#0d4d4d] transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Go to Dashboard
          </button>
        </div>

        {/* Optional: Confetti or celebration animation can be added here */}
      </div>

      {/* Custom CSS for checkmark animation */}
      <style>{`
        @keyframes draw {
          from {
            stroke-dasharray: 1000;
            stroke-dashoffset: 1000;
          }
          to {
            stroke-dasharray: 1000;
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}
