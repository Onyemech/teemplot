import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { ReactNode } from 'react';

interface DashboardGuardProps {
  children: ReactNode;
}

/**
 * Ensures only users who have completed onboarding can access the dashboard
 * Redirects incomplete users to the appropriate onboarding step
 */
export default function DashboardGuard({ children }: DashboardGuardProps) {
  let user = null;
  let loading = false;
  
  try {
    const userContext = useUser();
    user = userContext.user;
    loading = userContext.loading;
  } catch (error) {
    // Context not available, treat as not authenticated
    console.warn('UserContext not available in DashboardGuard, treating as not authenticated');
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

  // If user is not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If user hasn't completed onboarding, redirect to onboarding
  if (!user.onboardingCompleted) {
    // You could add more sophisticated logic here to resume from the correct step
    // For now, we'll redirect to the beginning of onboarding
    return <Navigate to="/onboarding/company-setup" replace />;
  }

  // User has completed onboarding, allow access to dashboard
  return <>{children}</>;
}