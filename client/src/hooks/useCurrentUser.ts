import { useState, useEffect } from 'react';
import { env } from '@/config/env';

interface CurrentUser {
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

/**
 * Secure hook to fetch current user data using httpOnly cookies
 * NO localStorage - all data fetched from backend using secure cookies
 */
export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch(`${env.apiUrl}/auth/me`, {
        credentials: 'include', // Send httpOnly cookies
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated
          setUser(null);
          setError('Not authenticated');
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
      }
    } catch (err: any) {
      console.error('Failed to fetch user:', err);
      setError(err.message || 'Failed to fetch user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    setLoading(true);
    fetchUser();
  };

  return { user, loading, error, refetch };
}
