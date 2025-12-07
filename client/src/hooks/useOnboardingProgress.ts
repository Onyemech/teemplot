import { useCallback } from 'react';
import { apiClient } from '@/lib/api';

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
      // Development logging only
      if (import.meta.env.MODE === 'development') {
        console.log('💾 Saving progress:', {
          userId: data.userId ? '✅' : '❌',
          companyId: data.companyId ? '✅' : '❌',
          currentStep: data.currentStep,
        });
      }
      
      const response = await apiClient.post('/api/onboarding/save-progress', data);

      if (!response.data.success) {
        console.error('❌ Save progress failed:', response.data);
        throw new Error(response.data.message || 'Failed to save progress');
      }

      console.log('✅ Progress saved successfully to backend');
      
      // Also save to localStorage as backup
      try {
        const progressKey = `onboarding_progress_${data.userId}`;
        localStorage.setItem(progressKey, JSON.stringify({
          ...data,
          savedAt: new Date().toISOString()
        }));
        console.log('✅ Progress also saved to localStorage backup');
      } catch (e) {
        console.warn('⚠️ Could not save to localStorage backup:', e);
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ Error saving progress:', error.message);
      throw error;
    }
  }, []);

  const getProgress = useCallback(async (userId: string) => {
    try {
      console.log('🔍 Fetching progress from server for user:', userId);
      
      const response = await apiClient.get(`/api/onboarding/progress/${userId}`);

      console.log('📡 Server response status:', response.status);

      if (response.status === 404) {
        console.log('ℹ️ No saved progress found on server');
        return null;
      }

      if (response.status === 401) {
        console.error('❌ Not authenticated - cannot fetch progress from server');
        return null;
      }

      if (!response.data.success) {
        console.error('❌ Failed to get progress from server:', response.data);
        return null;
      }

      console.log('✅ Progress loaded from server:', response.data.data);
      
      // Save to localStorage as backup ONLY after successful server fetch
      try {
        const progressKey = `onboarding_progress_${userId}`;
        localStorage.setItem(progressKey, JSON.stringify({
          ...response.data.data,
          savedAt: new Date().toISOString()
        }));
      } catch (e) {
        console.warn('⚠️ Could not save to localStorage backup:', e);
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Network error getting progress from server:', error.message);
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
