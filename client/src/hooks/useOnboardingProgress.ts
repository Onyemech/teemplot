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
      const authData = sessionStorage.getItem('onboarding_auth');
      if (!authData) return null;
      return JSON.parse(authData);
    } catch {
      return null;
    }
  }, []);

  return {
    saveProgress,
    getProgress,
    getAuthData,
  };
}
