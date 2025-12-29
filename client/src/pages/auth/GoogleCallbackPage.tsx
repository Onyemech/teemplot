import { useEffect, useRef } from 'react';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
// import { useNavigate } from 'react-router-dom';

export default function GoogleCallbackPage() {
  const { handleTokenFromUrl } = useGoogleAuth();
  // const navigate = useNavigate();
  const hasCalled = useRef(false);

  useEffect(() => {
    if (!hasCalled.current) {
      hasCalled.current = true;
      
      // Check if we have parameters from backend redirect
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      // const isNewUser = params.get('isNewUser') === 'true';
      // const requiresOnboarding = params.get('requiresOnboarding') === 'true';
      const code = params.get('code');

      if (token) {
        // Handle token from backend redirect
        handleTokenFromUrl();
      } else if (code) {
        // Handle OAuth code (should not happen with redirect flow)
        window.location.href = '/login?error=invalid_google_auth_flow';
      } else {
        // No token or code, redirect to login
        window.location.href = '/login?error=missing_auth_token';
      }
    }
  }, [handleTokenFromUrl]);

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
