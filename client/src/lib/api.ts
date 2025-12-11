import axios from 'axios'
import { env } from '@/config/env'
import { getErrorMessage } from '@/utils/errorHandler'

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


// Enterprise-standard session management
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Only handle 401 errors for session management
    if (error.response?.status === 401 && !originalRequest._retry) {
      const currentPath = window.location.pathname;
      
      // Define paths that should NEVER trigger session refresh or redirect
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
      
      const isPublicPath = publicPaths.some(path => 
        currentPath === path || currentPath.startsWith(path + '/')
      );
      
      // Special handling for onboarding - allow session refresh but don't redirect
      const isOnboarding = currentPath.startsWith('/onboarding');
      const isAuthCallback = currentPath.startsWith('/auth/');
      
      // For public paths, just fail silently without any session management
      if (isPublicPath || isAuthCallback) {
        return Promise.reject(error);
      }
      
      // Mark request as retried to prevent infinite loops
      originalRequest._retry = true;
      
      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }
      
      isRefreshing = true;
      
      try {
        // Attempt to refresh the session
        await axios.post(`${baseURL}/api/auth/refresh`, {}, { 
          withCredentials: true,
          timeout: TIMEOUTS.fast // Use fast timeout for refresh
        });
        
        // Session refreshed successfully
        processQueue(null, 'refreshed');
        isRefreshing = false;
        
        // Retry the original request
        return apiClient(originalRequest);
        
      } catch (refreshError) {
        // Session refresh failed
        processQueue(refreshError, null);
        isRefreshing = false;
        
        // Only redirect to login if NOT in onboarding flow
        if (!isOnboarding && !currentPath.includes('/login')) {
          // Store current path for redirect after login
          sessionStorage.setItem('redirectAfterLogin', currentPath);
          
          // Graceful redirect with user notification
          console.warn('Session expired. Redirecting to login...');
          window.location.href = '/login?session=expired&redirect=' + encodeURIComponent(currentPath);
        }
        
        return Promise.reject(refreshError);
      }
    }
    
    // Enhance error with user-friendly message but don't duplicate it
    if (error.response && !error.userMessage) {
      error.userMessage = getErrorMessage(error);
    }
    
    return Promise.reject(error);
  }
)
