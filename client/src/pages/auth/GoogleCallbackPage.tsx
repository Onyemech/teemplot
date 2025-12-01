import { useEffect, useRef } from 'react';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';

export default function GoogleCallbackPage() {
  const { handleGoogleCallback, handleTokenFromUrl } = useGoogleAuth();
  const hasCalled = useRef(false);

  useEffect(() => {
    if (!hasCalled.current) {
      hasCalled.current = true;
      
      // Check if we have a code (from Google redirect)
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const token = params.get('token');

      if (code) {
        // Handle OAuth code
        handleGoogleCallback(code);
      } else if (token) {
        handleTokenFromUrl();
      } else {
        // No code or token, redirect to login
        window.location.href = '/login?error=missing_auth_code';
      }
    }
  }, [handleGoogleCallback, handleTokenFromUrl]);

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
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#0F5D5D] border-r-transparent"></div>
        </div>
      </div>
    </div>
  );
}
