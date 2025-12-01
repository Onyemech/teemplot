/**
 * Authentication Interceptor
 * Handles 401 errors and auto-logout
 */

export const handleAuthError = (error: any) => {
  // Check if it's a 401 error
  if (error.response?.status === 401 || error.status === 401) {
    // Clear all auth data
    sessionStorage.clear();
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    
    // Redirect to login (without showing toast to avoid confusion)
    window.location.href = '/login';
    
    return true; // Error was handled
  }
  
  return false; // Error was not handled
};

/**
 * Fetch wrapper with auth error handling
 */
export const authFetch = async (url: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(url, options);
    
    // Check for 401
    if (response.status === 401) {
      const data = await response.json().catch(() => ({}));
      
      if (data.requiresLogin) {
        // Clear auth and redirect
        sessionStorage.clear();
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        
        throw new Error('Session expired. Redirecting to login...');
      }
    }
    
    return response;
  } catch (error) {
    throw error;
  }
};
