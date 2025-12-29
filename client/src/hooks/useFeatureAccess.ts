import { useUser } from '@/contexts/UserContext';
import { hasFeatureAccess, type Feature, type SubscriptionPlan } from '@/utils/planFeatures';

export function useFeatureAccess() {
  const { user, loading } = useUser();

  const getCurrentPlan = (): SubscriptionPlan => {
    if (!user) return 'silver';
    
    const subscriptionPlan = user.subscriptionPlan || '';
    
    if (subscriptionPlan.includes('gold')) {
      return 'gold';
    }
    
    if (subscriptionPlan === 'trial') {
      return 'trial';
    }
    
    return 'silver';
  };

  const currentPlan = getCurrentPlan();

  return {
    hasAccess: (feature: Feature) => hasFeatureAccess(currentPlan, feature),
    currentPlan,
    plan: currentPlan, // Alias for legacy code
    loading,
    isGold: currentPlan === 'gold',
    isSilver: currentPlan === 'silver',
    isTrial: currentPlan === 'trial',
    // Mock values for missing properties until implemented
    employeeLimit: currentPlan === 'gold' ? 100 : 10,
    currentEmployeeCount: 0, 
    isSubscriptionExpired: false,
    isTrialExpired: false,
  };
}
