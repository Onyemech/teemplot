import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import Button from '../components/ui/Button';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps?: number;
  title?: string;
  description?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export default function OnboardingLayout({
  children,
  currentStep,
  totalSteps = 5,
  showBack = true,
  onBack,
}: OnboardingLayoutProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="px-4 py-4 flex justify-between items-center border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="flex items-center">
          <img src="/logo.svg" alt="Teemplot" className="h-8 w-auto" />
        </div>
        <div className="flex items-center gap-3">
          <button className="text-gray-500 hover:text-gray-700">
            <HelpCircle className="w-5 h-5" />
          </button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-600 font-medium hover:bg-gray-50"
            onClick={() => navigate('/dashboard')} // Or save and exit logic
          >
            Save & exit
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 pb-20">
        {/* Progress Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-900">
              Step {currentStep} of {totalSteps}
            </span>
            {/* Optional: Show percentage text if needed, but design just shows text left */}
          </div>
          
          {/* Segmented Progress Bar */}
          <div className="flex gap-2 h-1.5">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={`h-full flex-1 rounded-full transition-colors duration-300 ${
                  index + 1 <= currentStep ? 'bg-[#0F5D5D]' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Back Button */}
        {showBack && currentStep > 1 && (
          <button
            onClick={handleBack}
            className="flex items-center text-gray-500 hover:text-gray-800 font-medium mb-6 transition-colors"
          >
            <span className="mr-1">←</span> Back
          </button>
        )}

        {/* Page Content */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
