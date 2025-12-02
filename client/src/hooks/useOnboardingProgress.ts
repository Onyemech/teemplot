import { useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface OnboardingProgressData {
  userId: string;
  companyId: string;
  currentStep: number;
  completedSteps?: number[];
  formData?: Record<string, any>;
}

export function useOnboardingProgress() {
  const saveProgress = useCallback(async (data: OnboardingProgressData) => {
    try {
      const response = await fetch(`${API_URL}/onboarding/save-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to save progress');
      }

      return result;
    } catch (error: any) {
      console.error('Error saving progress:', error);
      throw error;
    }
  }, []);

  const getProgress = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/onboarding/progress/${userId}`);

      if (response.status === 404) {
        return null; // No progress found
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to get progress');
      }

      return result.data;
    } catch (error: any) {
      console.error('Error getting progress:', error);
      return null;
    }
  }, []);

  const getAuthData = useCallback(() => {
    try {
      // Try sessionStorage first (onboarding flow)
      const authData = sessionStorage.getItem('onboarding_auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        // During onboarding, userId is required but companyId might not exist yet
        if (parsed.userId) {
          return parsed;
        }
      }

      // Fallback to localStorage (logged in user resuming onboarding)
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        // userId is required, companyId is optional during onboarding
        if (user.id) {
          return {
            userId: user.id,
            companyId: user.companyId || null,
            email: user.email,
            // Preserve any other fields that might be needed
          };
        }
      }

      // Last resort: try to get from token
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Decode JWT to get user info (basic decode, not verification)
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.userId) {
            return {
              userId: payload.userId,
              companyId: payload.companyId || null,
              email: payload.email,
            };
          }
        } catch {
          // Token decode failed, continue
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting auth data:', error);
      return null;
    }
  }, []);

  const resumeOnboarding = useCallback(async (userId: string) => {
    try {
      const progress = await getProgress(userId);

      if (!progress) {
        return '/onboarding/company-setup'; // Default start
      }

      // Determine route based on completed steps
      // 1: Registration (done)
      // 2: Company Setup
      // 3: Owner Details
      // 4: Documents
      // 5: Review (Not implemented as separate page yet)
      // 6: Payment (Subscription)

      const completedSteps = progress.completedSteps || [];
      const lastCompletedStep = Math.max(0, ...completedSteps);

      if (lastCompletedStep >= 6) return '/dashboard';
      if (lastCompletedStep >= 5) return '/onboarding/subscription';
      if (lastCompletedStep >= 4) return '/onboarding/documents'; // Or review if implemented
      if (lastCompletedStep >= 3) return '/onboarding/documents';
      if (lastCompletedStep >= 2) return '/onboarding/owner-details';

      return '/onboarding/company-setup';
    } catch (error) {
      console.error('Error resuming onboarding:', error);
      return '/dashboard'; // Fallback
    }
  }, [getProgress]);

  return {
    saveProgress,
    getProgress,
    getAuthData,
    resumeOnboarding,
  };
}
