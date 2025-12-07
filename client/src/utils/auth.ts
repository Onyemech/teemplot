import { apiClient } from '@/lib/api';

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  companyId: string
}

/**
 * Get current user from server
 * Returns null if not authenticated
 */
export async function getUser(): Promise<User | null> {
  try {
    const response = await apiClient.get('/api/auth/me');
    return response.data.data;
  } catch (error) {
    console.error('Failed to get user:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getUser();
  return !!user;
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  try {
    await apiClient.post('/api/auth/logout');
    
    // Clear any remaining client-side data
    localStorage.clear();
    sessionStorage.clear();
    
    // Redirect to login
    window.location.href = '/login';
  } catch (error) {
    console.error('Failed to logout:', error);
    // Force redirect anyway
    window.location.href = '/login';
  }
}
