/**
 * API Helper Utilities
 * 
 * Provides consistent, type-safe API calling patterns.
 * All endpoints automatically use the /api prefix.
 */

import { apiClient } from '@/lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Build full API URL with /api prefix
 * Use this when you need the full URL (e.g., for fetch calls)
 */
export const buildApiUrl = (endpoint: string): string => {
  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Get base URL and strip trailing slash
  const baseUrl = API_URL.replace(/\/$/, '');

  // If base URL already ends with /api, we should NOT add another /api prefix
  if (baseUrl.endsWith('/api')) {
    // If endpoint starts with /api, strip it to avoid duplication
    // e.g. base=/api, endpoint=/api/auth -> /api/auth
    if (normalizedEndpoint.startsWith('/api/')) {
      return `${baseUrl}${normalizedEndpoint.substring(4)}`;
    }
    return `${baseUrl}${normalizedEndpoint}`;
  }

  // If base URL does NOT end with /api
  // If endpoint starts with /api, just append it
  if (normalizedEndpoint.startsWith('/api/')) {
    return `${baseUrl}${normalizedEndpoint}`;
  }

  // Otherwise append /api prefix
  return `${baseUrl}/api${normalizedEndpoint}`;
};

/**
 * API endpoint constants
 * Use these to avoid typos and ensure consistency
 */
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    REFRESH: '/auth/refresh',
    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_VERIFICATION: '/auth/resend-verification',
    FORGOT_PASSWORD: '/auth/forgot-password',
    VERIFY_RESET_CODE: '/auth/verify-reset-code',
    RESET_PASSWORD: '/auth/reset-password',
    GOOGLE: '/auth/google',
    GOOGLE_CALLBACK: '/auth/google/callback',
    GOOGLE_VERIFY: '/auth/google/verify',
  },

  // Onboarding
  ONBOARDING: {
    COMPANY_SETUP: '/onboarding/company-setup',
    OWNER_DETAILS: '/onboarding/owner-details',
    BUSINESS_INFO: '/onboarding/business-info',
    UPLOAD_LOGO: '/onboarding/upload-logo',
    SELECT_PLAN: '/onboarding/select-plan',
    COMPLETE: '/onboarding/complete',
    SAVE_PROGRESS: '/onboarding/save-progress',
    GET_PROGRESS: (userId: string) => `/onboarding/progress/${userId}`,
  },

  // Employees
  EMPLOYEES: {
    LIST: '/employees',
    GET: (id: string) => `/employees/${id}`,
    CREATE: '/employees',
    UPDATE: (id: string) => `/employees/${id}`,
    DELETE: (id: string) => `/employees/${id}`,
  },

  // Employee Invitations
  INVITATIONS: {
    INVITE: '/employee-invitations/invite',
    LIST: '/employee-invitations/list',
    GET_BY_TOKEN: (token: string) => `/employee-invitations/invitation/${token}`,
    ACCEPT: '/employee-invitations/accept',
    DELETE: (id: string) => `/employee-invitations/${id}`,
  },

  // Files
  FILES: {
    CHECK: '/files/check',
    UPLOAD: '/files/upload',
    ATTACH_TO_COMPANY: '/files/attach-to-company',
    GET: (id: string) => `/files/${id}`,
    DELETE: (id: string) => `/files/${id}`,
  },

  // Attendance
  ATTENDANCE: {
    STATUS: '/attendance/status',
    CLOCK_IN: '/attendance/clock-in',
    CLOCK_OUT: '/attendance/clock-out',
    HISTORY: '/attendance/history',
    REPORT: '/attendance/report',
  },

  // Dashboard
  DASHBOARD: {
    STATS: '/dashboard/stats',
    EMPLOYEE_STATS: '/dashboard/employee-stats',
  },

  // Company
  COMPANY: {
    GET: '/company',
    UPDATE: '/company',
    DELETE: '/company',
  },

  // Company Settings
  COMPANY_SETTINGS: {
    GET: '/company-settings',
    UPDATE: '/company-settings',
  },

  // Subscription
  SUBSCRIPTION: {
    GET: '/subscription',
    UPGRADE: '/subscription/upgrade',
    CANCEL: '/subscription/cancel',
  },

  // Leave
  LEAVE: {
    LIST: '/leave',
    CREATE: '/leave',
    UPDATE: (id: string) => `/leave/${id}`,
    DELETE: (id: string) => `/leave/${id}`,
    APPROVE: (id: string) => `/leave/${id}/approve`,
    REJECT: (id: string) => `/leave/${id}/reject`,
  },

  // Tasks
  TASKS: {
    LIST: '/tasks',
    CREATE: '/tasks',
    UPDATE: (id: string) => `/tasks/${id}`,
    DELETE: (id: string) => `/tasks/${id}`,
  },

  // Super Admin
  SUPERADMIN: {
    COMPANIES: '/superadmin/companies',
    USERS: '/superadmin/users',
    STATS: '/superadmin/stats',
  },

  // Admin Address Audit
  ADDRESS_AUDIT: {
    GET: '/admin/address-audit',
    VERIFY: '/admin/address-audit/verify',
  },

  // Notifications
  NOTIFICATIONS: {
    STREAM: '/notifications/stream',
    LIST: '/notifications',
    UNREAD_COUNT: '/notifications/unread-count',
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
  },
} as const;

/**
 * Type-safe API client wrapper
 * Automatically adds /api prefix to all endpoints
 */
export const api = {
  /**
   * Helper to ensure endpoint has /api prefix
   */
  _normalize: (endpoint: string): string => {
    if (endpoint.startsWith('/api/')) return endpoint;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `/api${cleanEndpoint}`;
  },

  /**
   * GET request
   */
  get: async <T = any>(endpoint: string, config?: any): Promise<T> => {
    const response = await apiClient.get(api._normalize(endpoint), config);
    return response.data;
  },

  /**
   * POST request
   */
  post: async <T = any>(endpoint: string, data?: any, config?: any): Promise<T> => {
    const response = await apiClient.post(api._normalize(endpoint), data, config);
    return response.data;
  },

  /**
   * PUT request
   */
  put: async <T = any>(endpoint: string, data?: any, config?: any): Promise<T> => {
    const response = await apiClient.put(api._normalize(endpoint), data, config);
    return response.data;
  },

  /**
   * PATCH request
   */
  patch: async <T = any>(endpoint: string, data?: any, config?: any): Promise<T> => {
    const response = await apiClient.patch(api._normalize(endpoint), data, config);
    return response.data;
  },

  /**
   * DELETE request
   */
  delete: async <T = any>(endpoint: string, config?: any): Promise<T> => {
    const response = await apiClient.delete(api._normalize(endpoint), config);
    return response.data;
  },
};

/**
 * Example usage:
 * 
 * // Using API_ENDPOINTS constants (RECOMMENDED)
 * const user = await api.get(API_ENDPOINTS.AUTH.ME);
 * const employees = await api.get(API_ENDPOINTS.EMPLOYEES.LIST);
 * await api.post(API_ENDPOINTS.AUTH.LOGIN, { email, password });
 * 
 * // Using buildApiUrl for fetch calls
 * const response = await fetch(buildApiUrl('/auth/me'), {
 *   credentials: 'include'
 * });
 * 
 * // Direct endpoint strings (also works)
 * const stats = await api.get('/dashboard/stats');
 */
