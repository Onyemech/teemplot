import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/contexts/ToastContext';
import { useUser } from '@/contexts/UserContext';

export function useGoogleAuth() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { refetch: refetchUser } = useUser();

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
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      window.location.href = `${backendUrl}/auth/google`;
      
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

      // Send code to backend for verification with timeout
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(`${apiUrl}/api/auth/google/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Google authentication failed');
      }

      // Backend sets httpOnly cookies automatically - NO localStorage storage
      const { user, requiresOnboarding } = result.data;

      // Refetch user data to populate context
      await refetchUser();

      toast.success('Successfully signed in with Google!');

      // Handle onboarding resumption
      if (requiresOnboarding) {
        // Check if there's saved progress in database
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        try {
          const progressResponse = await fetch(`${apiUrl}/api/onboarding/progress/${user.id}`);
          if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            if (progressData.data) {
              // Resume from saved progress
              const completedSteps = progressData.data.completedSteps || [];
              const lastStep = Math.max(0, ...completedSteps);
              
              if (lastStep >= 5) navigate('/onboarding/subscription');
              else if (lastStep >= 4) navigate('/onboarding/documents');
              else if (lastStep >= 3) navigate('/onboarding/business-info');
              else if (lastStep >= 2) navigate('/onboarding/owner-details');
              else navigate('/onboarding/company-setup');
              
              return result.data;
            }
          }
        } catch (error) {
          console.error('Failed to get onboarding progress:', error);
        }
        
        // Default: start from company setup
        navigate('/onboarding/company-setup');
      } else {
        navigate('/dashboard');
      }

      return result.data;
    } catch (error: any) {
      console.error('Google callback error:', error);
      
      if (error.name === 'AbortError') {
        toast.error('Google authentication timed out. Please try again.');
      } else {
        toast.error(error.message || 'Failed to complete Google authentication');
      }
      
      navigate('/login?error=google_auth_failed');
      throw error;
    } finally {
      setLoading(false);
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
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
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
