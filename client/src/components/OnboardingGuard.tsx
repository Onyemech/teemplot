import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { ReactNode } from 'react';

interface OnboardingGuardProps {
  children: ReactNode;
}

/**
 * Prevents users who have completed onboarding from accessing onboarding pages
 * Redirects them to the dashboard instead
 */
export default function OnboardingGuard({ children }: OnboardingGuardProps) {
  let user = null;
  let loading = false;
  
  try {
    const userContext = useUser();
    user = userContext.user;
    loading = userContext.loading;
  } catch (error) {
    // Context not available, treat as not authenticated
    console.warn('UserContext not available in OnboardingGuard, treating as not authenticated');
    user = null;
    loading = false;
  }
  
  const location = useLocation();

  // Show loading state while user data is being fetched
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F5D5D]"></div>
      </div>
    );
  }

  // If user is not authenticated, allow access to onboarding
  if (!user) {
    return <>{children}</>;
  }

  // If user has completed onboarding, redirect to dashboard
  if (user.onboardingCompleted) {
    // Only redirect if they're trying to access onboarding pages
    if (location.pathname.startsWith('/onboarding')) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Allow access to onboarding pages for users who haven't completed onboarding
  return <>{children}</>;
}