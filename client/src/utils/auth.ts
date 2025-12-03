/**
 * Centralized Authentication Utilities
 * Single source of truth for auth token and user data management
 */

const TOKEN_KEY = 'token'
const USER_KEY = 'user'

export interface AuthData {
  token: string
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    role: string
    companyId: string
  }
}

/**
 * Save authentication data (token + user)
 * Use this EVERYWHERE after login/register/oauth
 */
export function saveAuth(token: string, user: any): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    
    // Clean up old keys for backward compatibility
    localStorage.removeItem('auth_token')
    localStorage.removeItem('accessToken')
  } catch (error) {
    console.error('Failed to save auth data:', error)
  }
}

/**
 * Get authentication token
 * Returns null if not authenticated
 */
export function getAuthToken(): string | null {
  try {
    // Check primary key first
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) return token
    
    // Fallback to old keys for backward compatibility
    return localStorage.getItem('auth_token') || localStorage.getItem('accessToken')
  } catch (error) {
    console.error('Failed to get auth token:', error)
    return null
  }
}

/**
 * Get user data
 * Returns null if not authenticated
 */
export function getUser(): any | null {
  try {
    const userStr = localStorage.getItem(USER_KEY)
    if (!userStr) return null
    return JSON.parse(userStr)
  } catch (error) {
    console.error('Failed to get user data:', error)
    return null
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken()
}

/**
 * Clear all authentication data
 * Use this on logout or auth errors
 */
export function clearAuth(): void {
  try {
    // Clear all possible token keys
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('accessToken')
    
    // Clear onboarding data
    sessionStorage.clear()
  } catch (error) {
    console.error('Failed to clear auth data:', error)
  }
}

/**
 * Update user data without changing token
 */
export function updateUser(user: any): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch (error) {
    console.error('Failed to update user data:', error)
  }
}
