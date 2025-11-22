import { useEffect } from 'react';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';

export default function GoogleCallbackPage() {
  const { handleCallback } = useGoogleAuth();

  useEffect(() => {
    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-4">
          <img src="/logo.png" alt="Teemplot" className="h-20 w-auto mx-auto animate-pulse" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Completing sign in...</h2>
        <p className="text-gray-600">Please wait while we set up your account.</p>
        
        {/* Loading spinner */}
        <div className="mt-6">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
        </div>
      </div>
    </div>
  );
}
