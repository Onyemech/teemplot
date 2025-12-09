import axios from 'axios'
import { env } from '@/config/env'

const baseURL = import.meta.env.MODE === 'production' 
  ? 'https://api.teemplot.com'
  : ''

// Dynamic timeout based on operation type
export const TIMEOUTS = {
  fast: 5000,      // 5s - Quick operations (login, logout)
  normal: 15000,   // 15s - Normal operations (fetch data)
  slow: 30000,     // 30s - Slow operations (file uploads, invitations)
  verySlow: 60000, // 60s - Very slow operations (large file uploads)
}

export const apiClient = axios.create({
  baseURL,
  timeout: env.apiTimeout || TIMEOUTS.normal,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, 
})

// Helper to create API client with custom timeout
export const createApiClientWithTimeout = (timeout: number) => {
  return axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  })
}


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
        await axios.post(`${baseURL}/api/auth/refresh`, {}, { withCredentials: true });
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
