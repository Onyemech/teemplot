import axios from 'axios'
import { env } from '@/config/env'

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: env.apiTimeout,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies automatically
})

// No need for Authorization header - cookies are sent automatically

// Request interceptor to handle API prefix based on environment
apiClient.interceptors.request.use(
  (config) => {
    // If baseURL is an API subdomain (api.teemplot.com), don't add /api prefix
    // The subdomain routing handles it
    const isApiSubdomain = config.baseURL?.includes('api.teemplot.com')
    
    if (isApiSubdomain && config.url?.startsWith('/api/')) {
      // Remove /api prefix for API subdomain
      config.url = config.url.replace(/^\/api/, '')
      if (import.meta.env.DEV) {
        console.warn(`[API] Removed /api prefix for subdomain: ${config.url}`)
      }
    } else if (!isApiSubdomain && config.url && !config.url.startsWith('/api/')) {
      // Add /api prefix for non-subdomain (localhost)
      config.url = `/api${config.url}`
      if (import.meta.env.DEV) {
        console.warn(`[API] Added /api prefix for localhost: ${config.url}`)
      }
    }
    
    return config
  },
  (error) => Promise.reject(error)
)

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 and haven't tried refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Check if we're on a public route BEFORE trying to refresh
      const publicRoutes = ['/', '/login', '/forgot-password', '/reset-password', '/privacy', '/terms', '/accept-invitation'];
      const currentPath = window.location.pathname;
      const isPublicRoute = publicRoutes.includes(currentPath) || 
                           currentPath.startsWith('/onboarding') || 
                           currentPath.startsWith('/auth/');
      
      // If on public route, don't try to refresh or redirect - just fail silently
      if (isPublicRoute) {
        return Promise.reject(error);
      }
      
      // Only try refresh on protected routes
      try {
        // Try to refresh token
        await axios.post(`${env.apiUrl}/auth/refresh`, {}, { withCredentials: true });
        // Retry original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - redirect to login only if not already there
        if (!currentPath.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
)
