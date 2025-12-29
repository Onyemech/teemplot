import { Navigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { ReactNode } from 'react';

interface LandingGuardProps {
  children: ReactNode;
}

/**
 * Handles redirection for authenticated users visiting the landing page
 * - Users who completed onboarding → dashboard
 * - Users who haven't completed onboarding → onboarding flow
 */
export default function LandingGuard({ children }: LandingGuardProps) {
  let user = null;
  let loading = false;
  
  try {
    const userContext = useUser();
    user = userContext.user;
    loading = userContext.loading;
  } catch (error) {
    // Context not available, treat as not authenticated
    console.warn('UserContext not available in LandingGuard, treating as not authenticated');
    user = null;
    loading = false;
  }

  // Show loading state while user data is being fetched
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F5D5D]"></div>
      </div>
    );
  }

  // If user is not authenticated, show landing page
  if (!user) {
    return <>{children}</>;
  }

  // User is authenticated - redirect based on onboarding status
  if (user.onboardingCompleted) {
    return <Navigate to="/dashboard" replace />;
  } else {
    // Allow authenticated but incomplete users to view the landing page
    // This allows "Save and Exit" to work properly
    return <>{children}</>;
  }
}