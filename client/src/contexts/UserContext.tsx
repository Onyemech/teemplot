import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { env } from '@/config/env';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: string;
  companyName?: string;
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
      const response = await fetch(`${env.apiUrl}/auth/me`, {
        credentials: 'include', // Send httpOnly cookies
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated - this is okay
          setUser(null);
          setError(null);
        } else {
          throw new Error('Failed to fetch user');
        }
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        setUser(data.data);
        setError(null);
      } else {
        setError(data.message || 'Failed to fetch user');
        setUser(null);
      }
    } catch (err: any) {
      console.error('Failed to fetch user:', err);
      setError(err.message || 'Failed to fetch user');
      setUser(null);
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
