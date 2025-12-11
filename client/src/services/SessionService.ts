
import { apiClient } from '@/lib/api';

// Extend window interface for session service flag
declare global {
  interface Window {
    __sessionServiceInitialized?: boolean;
  }
}

interface SessionConfig {
  accessTokenDuration: number;  
  refreshTokenDuration: number; // 30 days
  activityCheckInterval: number; // 5 minutes
  warningBeforeExpiry: number; // 10 minutes
}

class SessionService {
  private config: SessionConfig = {
    accessTokenDuration: 2 * 60 * 60 * 1000, // 2 hours in ms
    refreshTokenDuration: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
    activityCheckInterval: 5 * 60 * 1000, // 5 minutes in ms
    warningBeforeExpiry: 10 * 60 * 1000, // 10 minutes in ms
  };

  private activityTimer: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();

  /**
   * Initialize session management
   */
  public initialize(): void {
    this.setupActivityTracking();
    this.setupPeriodicRefresh();
    this.setupVisibilityChangeHandler();
  }

  /**
   * Track user activity to extend session
   */
  private setupActivityTracking(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const updateActivity = () => {
      this.lastActivity = Date.now();
    };

    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });
  }

  /**
   * Setup periodic session refresh for active users
   */
  private setupPeriodicRefresh(): void {
    // Check session every 5 minutes
    this.activityTimer = setInterval(() => {
      this.checkAndRefreshSession();
    }, this.config.activityCheckInterval);
  }

  /**
   * Handle browser tab visibility changes
   */
  private setupVisibilityChangeHandler(): void {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Tab became visible, check session status
        this.checkAndRefreshSession();
      }
    });
  }

  /**
   * Check if session needs refresh and handle accordingly
   */
  private async checkAndRefreshSession(): Promise<void> {
    const timeSinceActivity = Date.now() - this.lastActivity;
    
    // If user has been inactive for more than 1 hour, don't auto-refresh
    if (timeSinceActivity > 60 * 60 * 1000) {
      return;
    }

    try {
      // Attempt to refresh session silently
      await apiClient.post('/api/auth/refresh');
      console.log('Session refreshed automatically');
    } catch (error) {
      console.warn('Session refresh failed:', error);
      // Don't force logout here, let the API interceptor handle it
    }
  }

  /**
   * Manually refresh session (for critical operations)
   */
  public async refreshSession(): Promise<boolean> {
    try {
      await apiClient.post('/api/auth/refresh');
      return true;
    } catch (error) {
      console.error('Manual session refresh failed:', error);
      return false;
    }
  }

  /**
   * Check if user is active
   */
  public isUserActive(): boolean {
    const timeSinceActivity = Date.now() - this.lastActivity;
    return timeSinceActivity < 30 * 60 * 1000; // Active if activity within 30 minutes
  }

  /**
   * Get session health status
   */
  public getSessionHealth(): {
    isActive: boolean;
    lastActivity: Date;
    timeSinceActivity: number;
  } {
    const timeSinceActivity = Date.now() - this.lastActivity;
    
    return {
      isActive: this.isUserActive(),
      lastActivity: new Date(this.lastActivity),
      timeSinceActivity,
    };
  }

  /**
   * Extend session for critical operations (like onboarding)
   */
  public async extendSessionForCriticalOperation(): Promise<boolean> {
    try {
      // Force refresh session before critical operation
      await this.refreshSession();
      
      // Update activity to prevent auto-logout
      this.lastActivity = Date.now();
      
      return true;
    } catch (error) {
      console.error('Failed to extend session for critical operation:', error);
      return false;
    }
  }

  /**
   * Cleanup session management
   */
  public cleanup(): void {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
    }
  }

  /**
   * Handle session expiry gracefully
   */
  public handleSessionExpiry(currentPath: string): void {
    // Don't interrupt onboarding flow
    if (currentPath.startsWith('/onboarding')) {
      console.warn('Session expired during onboarding - user will be prompted to re-authenticate after completion');
      return;
    }

    // Store current path for redirect after login
    sessionStorage.setItem('redirectAfterLogin', currentPath);
    
    // Graceful redirect
    window.location.href = '/login?session=expired&redirect=' + encodeURIComponent(currentPath);
  }
}

// Export singleton instance
export const sessionService = new SessionService();

// Auto-initialize when imported (only once)
if (typeof window !== 'undefined' && !window.__sessionServiceInitialized) {
  window.__sessionServiceInitialized = true;
  sessionService.initialize();
}