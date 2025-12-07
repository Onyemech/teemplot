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

  return {
    hasAccess: (feature: Feature) => hasFeatureAccess(currentPlan, feature),
    currentPlan,
    isGold: currentPlan === 'gold',
    isSilver: currentPlan === 'silver',
    isTrial: currentPlan === 'trial',
  };
}
