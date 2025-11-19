'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CompletePage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    // Simulate processing
    const timer = setTimeout(() => {
      setIsProcessing(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleGoToDashboard = () => {
    // Clear session storage
    sessionStorage.clear();
    
    // Navigate to dashboard
    router.push('/dashboard');
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">🌱 Teemplot</h1>
          
          {/* Scanning Animation */}
          <div className="relative w-64 h-64 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-8 border-gray-200"></div>
            <div className="absolute inset-0 rounded-full border-8 border-green-600 border-t-transparent animate-spin"></div>
            <div className="absolute inset-8 rounded-full bg-gray-100"></div>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing your information</h2>
          <p className="text-gray-600">
            Please wait while we set up your account...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-12">🌱 Teemplot</h1>
        
        {/* Success Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">Congratulations!</h2>
        <p className="text-gray-600 mb-8">
          You're all set up
        </p>

        <button
          onClick={handleGoToDashboard}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
