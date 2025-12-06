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
    
    // Only handle 401 on PROTECTED routes
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Define public paths that should NEVER trigger redirect
      const publicPaths = [
        '/',
        '/login',
        '/signup',
        '/register',
        '/forgot-password',
        '/reset-password',
        '/privacy',
        '/terms',
        '/about',
        '/pricing',
        '/contact',
        '/accept-invitation',
      ];
      
      const currentPath = window.location.pathname;
      
      const isPublicPath = publicPaths.some(path => 
        currentPath === path || currentPath.startsWith(path + '/')
      );
      
      // Also allow all /onboarding/* and /auth/* paths
      const isOnboarding = currentPath.startsWith('/onboarding');
      const isAuthCallback = currentPath.startsWith('/auth/');
      
      // If we're on a public page or onboarding, DO NOT redirect or refresh token
      if (isPublicPath || isOnboarding || isAuthCallback) {
        return Promise.reject(error); // Just fail silently
      }
      
      // Only for PROTECTED pages (like /dashboard, /settings, etc.)
      try {
        await axios.post(`${env.apiUrl}/auth/refresh`, {}, { withCredentials: true });
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Only redirect if we're NOT already on login and it's a protected page
        if (!currentPath.includes('/login')) {
          window.location.href = '/login?redirect=' + encodeURIComponent(currentPath);
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
)
