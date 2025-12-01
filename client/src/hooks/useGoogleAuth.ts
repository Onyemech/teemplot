import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/contexts/ToastContext';

export function useGoogleAuth() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  /**
   * Initiate Google OAuth flow
   * Redirects to backend which then redirects to Google
   */
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      
      // Redirect to our backend Google OAuth endpoint
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const backendUrl = apiUrl.replace('/api', ''); // Remove /api if present
      window.location.href = `${backendUrl}/api/auth/google`;
      
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

      // Send code to backend for verification
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/auth/google/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Google authentication failed');
      }

      // Save auth data
      const { token, user, requiresOnboarding } = result.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Save auth data to session storage for onboarding
      sessionStorage.setItem('onboarding_auth', JSON.stringify({
        userId: user.id,
        companyId: user.companyId,
        email: user.email,
        isGoogleAuth: true,
      }));

      toast.success('Successfully signed in with Google!');

      // Always navigate to onboarding for new users or incomplete onboarding
      // Only go to dashboard if onboarding is fully completed
      if (requiresOnboarding) {
        navigate('/onboarding/company-setup');
      } else {
        navigate('/dashboard');
      }

      return result.data;
    } catch (error: any) {
      console.error('Google callback error:', error);
      toast.error(error.message || 'Failed to complete Google authentication');
      navigate('/login?error=google_auth_failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle token from URL (alternative flow)
   * Used when backend redirects with token in URL
   */
  const handleTokenFromUrl = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const isNewUser = params.get('isNewUser') === 'true';

      if (token) {
        // Save token
        localStorage.setItem('token', token);

        // Fetch user data
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        fetch(`${apiUrl}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
          .then(res => res.json())
          .then(result => {
            if (result.success) {
              localStorage.setItem('user', JSON.stringify(result.data));
              
              // Save auth data to session storage for onboarding
              sessionStorage.setItem('onboarding_auth', JSON.stringify({
                userId: result.data.id,
                companyId: result.data.companyId,
                email: result.data.email,
                isGoogleAuth: true,
              }));

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
