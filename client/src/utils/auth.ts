
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
    const response = await fetch(`${API_URL}/auth/me`, {
      credentials: 'include', // Send cookies
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.data;
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
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    
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
