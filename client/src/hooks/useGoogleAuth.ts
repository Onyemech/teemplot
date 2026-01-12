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

      // Ensure we don't double up the /api prefix
      // If rawBackendUrl ends with /api (or /api/), use it as is
      // Otherwise append /api
      const baseUrl = rawBackendUrl.replace(/\/$/, ''); // Remove trailing slash
      const authUrl = baseUrl.endsWith('/api')
        ? `${baseUrl}/auth/google`
        : `${baseUrl}/api/auth/google`;

      window.location.href = authUrl;

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
      const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

      const baseUrl = rawApiUrl.replace(/\/$/, '');
      const callbackUrl = baseUrl.endsWith('/api')
        ? `${baseUrl}/auth/google/callback?code=${encodeURIComponent(code)}`
        : `${baseUrl}/api/auth/google/callback?code=${encodeURIComponent(code)}`;

      // Redirect to backend callback which will handle the OAuth flow
      window.location.href = callbackUrl;

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
      const requiresOnboarding = params.get('requiresOnboarding') === 'true';

      if (token) {
        // Save token
        localStorage.setItem('token', token);

        // Clean up URL immediately to prevent refresh causing issues
        window.history.replaceState({}, '', window.location.pathname);

        // Fetch user data
        const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const baseUrl = rawApiUrl.replace(/\/$/, '');
        const meUrl = baseUrl.endsWith('/api')
          ? `${baseUrl}/auth/me`
          : `${baseUrl}/api/auth/me`;

        fetch(meUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include', // Include httpOnly cookies
        })
          .then(res => res.json())
          .then(result => {
            if (result.success) {
              // Backend sets httpOnly cookies automatically - no client-side storage needed!

              toast.success('Successfully signed in with Google!');

              // Navigate based on onboarding status
              // Check requiresOnboarding for existing users (like invited employees)
              if (isNewUser || requiresOnboarding) {
                navigate('/onboarding/company-setup');
              } else {
                navigate('/dashboard');
              }
            } else {
              // Handle failed authentication - user fetch returned success: false
              console.error('Auth failed:', result.message);
              toast.error(result.message || 'Authentication failed. Please try again.');
              navigate('/login?error=google_auth_failed');
            }
          })
          .catch(error => {
            console.error('Failed to fetch user data:', error);
            toast.error('Failed to complete authentication. Please try again.');
            navigate('/login?error=google_auth_failed');
          });
      } else {
        // No token in URL - shouldn't happen but handle gracefully
        console.error('No token found in callback URL');
        navigate('/login?error=missing_token');
      }
    } catch (error: any) {
      console.error('Token handling error:', error);
      toast.error('Failed to process authentication');
      navigate('/login?error=token_processing_failed');
    }
  };

  return {
    signInWithGoogle,
    handleGoogleCallback,
    handleTokenFromUrl,
    loading,
  };
}