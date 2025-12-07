import { useUser } from '@/contexts/UserContext';
import { hasFeatureAccess, type Feature, type SubscriptionPlan } from '@/utils/planFeatures';

export function useFeatureAccess() {
  const { user } = useUser();

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

  // Get employee limits based on plan
  const getEmployeeLimit = (): number => {
    if (currentPlan === 'gold') return Infinity;
    if (currentPlan === 'trial') return 10;
    return 50; // silver
  };

  // Check if subscription is expired
  const isSubscriptionExpired = user?.subscriptionStatus === 'expired';
  const isTrialExpired = user?.subscriptionStatus === 'trial_expired';

  return {
    hasAccess: (feature: Feature) => hasFeatureAccess(currentPlan, feature),
    currentPlan,
    plan: user?.subscriptionPlan || 'silver',
    isGold: currentPlan === 'gold',
    isSilver: currentPlan === 'silver',
    isTrial: currentPlan === 'trial',
    loading: false,
    employeeLimit: getEmployeeLimit(),
    currentEmployeeCount: user?.employeeCount || 0,
    isSubscriptionExpired,
    isTrialExpired,
  };
}
