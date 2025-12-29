import { useCallback } from 'react';
import { useUser } from '@/contexts/UserContext';
import { apiClient } from '@/lib/api';

export interface OnboardingProgressData {
  userId: string;
  companyId: string;
  currentStep: number;
  completedSteps?: number[];
  formData?: Record<string, any>;
}

export function useOnboardingProgress() {
  const { user } = useUser(); // Use UserContext for authenticated users
  
  const saveProgress = useCallback(async (data: OnboardingProgressData) => {
    try {
      // Use authenticated user if available, otherwise use provided data
      const userId = user?.id || data.userId;
      const companyId = user?.companyId || data.companyId;
      
      if (!userId) {
        throw new Error('No user ID available - user must be authenticated');
      }
      
      // Development logging only
      if (import.meta.env.MODE === 'development') {
        console.log('💾 Saving progress:', {
          userId: userId ? '✅' : '❌',
          companyId: companyId ? '✅' : '❌',
          currentStep: data.currentStep,
          source: user ? 'authenticated' : 'provided',
        });
      }
      
      const response = await apiClient.post('/api/onboarding/save-progress', {
        ...data,
        userId,
        companyId,
      });
      const result = response.data;

      if (!response.data.success) {
        console.error('❌ Save progress failed:', result);
        throw new Error(result.message || 'Failed to save progress');
      }

      console.log('✅ Progress saved successfully to backend');
      return result;
    } catch (error: any) {
      console.error('❌ Error saving progress:', error.message);
      throw error;
    }
  }, [user]);

  const getProgress = useCallback(async (userId: string) => {
    try {
      console.log('🔍 Fetching progress from server for user:', userId);
      
      const response = await apiClient.get(`/api/onboarding/progress/${userId}`);
      const result = response.data;

      if (!result.success) {
        console.error('❌ Failed to get progress from server:', result);
        return null;
      }

      console.log('✅ Progress loaded from server:', result.data);
      return result.data;
    } catch (error: any) {
      // Handle 404 - no progress found (this is normal for new users)
      if (error.response?.status === 404) {
        console.log('ℹ️ No progress found on server (404) - this is normal for new users');
        return null;
      }
      
      console.error('❌ Network error getting progress from server:', error.message);
      return null;
    }
  }, []);

  const getAuthData = useCallback(() => {
    try {
      // Use UserContext first (authenticated users)
      if (user) {
        return {
          userId: user.id,
          companyId: user.companyId || null,
          email: user.email,
        };
      }

      // Fallback to sessionStorage (onboarding flow for non-authenticated users)
      const authData = sessionStorage.getItem('onboarding_auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        // During onboarding, userId is required but companyId might not exist yet
        if (parsed.userId) {
          return parsed;
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting auth data:', error);
      return null;
    }
  }, [user]);

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
