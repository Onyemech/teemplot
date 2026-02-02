import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: string;
  companyName?: string;
  companyLogo?: string;
  avatarUrl?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  trialDaysLeft?: number | null;
  features?: string[];
  emailVerified: boolean;
  onboardingCompleted: boolean;
  jobTitle?: string;
  bio?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  clearUser: () => void;
  hasRole: (roles: string | string[]) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    // Prevent fetching if we are on the too-many-requests page to avoid infinite loops
    if (window.location.pathname === '/too-many-requests') {
      setLoading(false);
      return;
    }

    try {
      // IMPORTANT: Use /api prefix for all backend routes
      console.log('🔍 Fetching user data from /api/auth/me...');
      const response = await apiClient.get('/api/auth/me');

      if (response.data.success) {
        console.log('✅ User data fetched successfully:', response.data.data);
        setUser({ ...response.data.data, _fetchedAt: Date.now() });
        setError(null);
      } else {
        console.log('❌ Failed to fetch user:', response.data.message);
        setError(response.data.message || 'Failed to fetch user');
        setUser(null);
      }
    } catch (err: any) {
      // 401 is okay - just means not authenticated
      if (err.response?.status === 401) {
        console.log('ℹ️ User not authenticated (401)');
        setUser(null);
        setError(null);
      } else {
        console.error('❌ Error fetching user:', err);
        setError(err.message || 'Failed to fetch user');
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (!user?.companyId) return;

    let active = true;

    const syncSubscription = async () => {
      try {
        const res = await apiClient.get('/api/company/subscription-info');
        if (!active) return;
        if (!res.data?.success) return;
        const d = res.data.data;
        setUser(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            subscriptionPlan: d.subscriptionPlan ?? prev.subscriptionPlan,
            subscriptionStatus: d.subscriptionStatus ?? prev.subscriptionStatus,
            trialDaysLeft: d.trialDaysLeft ?? prev.trialDaysLeft,
            features: d.features ?? prev.features,
          };
        });
      } catch {
        // ignore
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncSubscription();
      }
    };

    syncSubscription();
    const intervalId = window.setInterval(syncSubscription, 20000);
    window.addEventListener('focus', syncSubscription);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', syncSubscription);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user?.companyId]);

  const refetch = async () => {
    console.log('🔄 Refetching user data...');
    setLoading(true);
    await fetchUser();
  };

  const clearUser = () => {
    console.log('🧹 Clearing user data...');
    setUser(null);
    setError(null);
    setLoading(false);
  };

  const hasRole = (roles: string | string[]): boolean => {
    if (!user) return false;
    
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    
    return user.role === roles;
  };

  return (
    <UserContext.Provider value={{ user, loading, error, refetch, clearUser, hasRole }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
