import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/contexts/ToastContext';
// import { useUser } from '@/contexts/UserContext';

export function useGoogleAuth() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  // const { refetch: refetchUser } = useUser();

  /**
   * Initiate Google OAuth flow
   * Redirects to backend which then redirects to Google
   */
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      
      // Set a timeout to stop loading if redirect doesn't happen
      const timeout = setTimeout(() => {
        setLoading(false);
        toast.error('Google sign-in is taking too long. Please try again.');
      }, 10000); // 10 second timeout
      
      // Redirect to our backend Google OAuth endpoint
      // IMPORTANT: Use /api prefix for all backend routes
      const rawBackendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      // Remove trailing /api if present to avoid double prefix
      const backendUrl = rawBackendUrl.replace(/\/api\/?$/, '');
      
      window.location.href = `${backendUrl}/api/auth/google`;
      
      // Clear timeout if redirect happens (though this code won't run after redirect)
      clearTimeout(timeout);
      
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      toast.error(error.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  };

  /**
   * Handle Google OAuth callback
   * Called when user returns from Google with authorization code
   */
  const handleGoogleCallback = async (code: string) => {
    try {
      setLoading(true);

      // Redirect to backend OAuth callback with code
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      // Redirect to backend callback which will handle the OAuth flow
      window.location.href = `${apiUrl}/api/auth/google/callback?code=${encodeURIComponent(code)}`;
      
    } catch (error: any) {
      setLoading(false);
      console.error('Google OAuth callback error:', error);
      toast.error('Google authentication failed. Please try again.');
      navigate('/login?error=google_auth_failed');
    }
  };

  const handleTokenFromUrl = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const isNewUser = params.get('isNewUser') === 'true';

      if (token) {
        // Save token
        localStorage.setItem('token', token);

        // Fetch user data
        const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const apiUrl = rawApiUrl.replace(/\/api\/?$/, '');
        
        fetch(`${apiUrl}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
          .then(res => res.json())
          .then(result => {
            if (result.success) {
              // Backend sets httpOnly cookies automatically - no client-side storage needed!

              toast.success('Successfully signed in with Google!');

              // Navigate based on onboarding status
              if (isNewUser) {
                navigate('/onboarding/company-setup');
              } else {
                navigate('/dashboard');
              }
            }
          })
          .catch(error => {
            console.error('Failed to fetch user data:', error);
            toast.error('Failed to complete authentication');
          });

        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (error: any) {
      console.error('Token handling error:', error);
      toast.error('Failed to process authentication');
    }
  };

  return {
    signInWithGoogle,
    handleGoogleCallback,
    handleTokenFromUrl,
    loading,
  };
}