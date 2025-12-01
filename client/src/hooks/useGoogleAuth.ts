import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { useOnboardingProgress } from './useOnboardingProgress';

export const useGoogleAuth = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { resumeOnboarding } = useOnboardingProgress();

  const signInWithGoogle = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw error;
      }

      // Supabase will redirect to Google OAuth
      // The callback will be handled by the callback page
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      toast.error(error.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  };

  const handleCallback = async () => {
    try {
      // Get session from URL hash
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      if (!session) {
        throw new Error('No session found');
      }

      // Send access token to backend
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/auth/google/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: session.access_token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      // Store auth token
      localStorage.setItem('auth_token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));

      // Check if onboarding is required
      if (data.data.requiresOnboarding) {
        // Store auth data for onboarding (including token!)
        sessionStorage.setItem('onboarding_auth', JSON.stringify({
          email: data.data.user.email,
          userId: data.data.user.id,
          companyId: data.data.user.companyId,
          token: data.data.token, // Include the token!
          isGoogleAuth: true,
        }));

        toast.success('Welcome! Let\'s set up your company.');

        // Navigate to company setup (skip email verification)
        navigate('/onboarding/company-setup');
      } else {
        toast.success('Welcome back!');
        const redirectPath = await resumeOnboarding(data.data.user.id);
        navigate(redirectPath);
      }

      return data;
    } catch (error: any) {
      console.error('Callback handling error:', error);
      toast.error(error.message || 'Authentication failed');
      navigate('/register');
      throw error;
    }
  };

  return {
    signInWithGoogle,
    handleCallback,
    loading,
  };
};
