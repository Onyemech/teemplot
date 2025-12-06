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
  subscriptionPlan?: string;
  emailVerified: boolean;
  onboardingCompleted: boolean;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      const response = await apiClient.get('/auth/me');

      if (response.data.success) {
        setUser(response.data.data);
        setError(null);
      } else {
        setError(response.data.message || 'Failed to fetch user');
        setUser(null);
      }
    } catch (err: any) {
      // 401 is okay - just means not authenticated
      if (err.response?.status === 401) {
        setUser(null);
        setError(null);
      } else {
        console.error('Failed to fetch user:', err);
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

  const refetch = async () => {
    setLoading(true);
    await fetchUser();
  };

  return (
    <UserContext.Provider value={{ user, loading, error, refetch }}>
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
