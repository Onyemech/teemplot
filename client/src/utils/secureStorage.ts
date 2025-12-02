
interface StorageItem {
  value: any;
  timestamp: number;
  ttl?: number; 
}

class SecureStorage {
  private readonly PREFIX = 'secure_';
  private readonly MAX_AGE = 30 * 60 * 1000; // 30 minutes default

  set(key: string, value: any, ttl?: number): void {
    try {
      const item: StorageItem = {
        value,
        timestamp: Date.now(),
        ttl: ttl || this.MAX_AGE
      };
      
      sessionStorage.setItem(
        `${this.PREFIX}${key}`,
        JSON.stringify(item)
      );
    } catch (error) {
      console.error('SecureStorage.set error:', error);
    }
  }

  /**
   * Get item and check expiration
   */
  get<T = any>(key: string): T | null {
    try {
      const data = sessionStorage.getItem(`${this.PREFIX}${key}`);
      if (!data) return null;

      const item: StorageItem = JSON.parse(data);
      
      // Check if expired
      if (item.ttl && Date.now() - item.timestamp > item.ttl) {
        this.remove(key);
        return null;
      }

      return item.value as T;
    } catch (error) {
      console.error('SecureStorage.get error:', error);
      return null;
    }
  }

  /**
   * Remove specific item
   */
  remove(key: string): void {
    try {
      sessionStorage.removeItem(`${this.PREFIX}${key}`);
    } catch (error) {
      console.error('SecureStorage.remove error:', error);
    }
  }

  /**
   * Clear all secure storage items
   */
  clearAll(): void {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(this.PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('SecureStorage.clearAll error:', error);
    }
  }

  /**
   * Clear expired items
   */
  clearExpired(): void {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(this.PREFIX)) {
          const data = sessionStorage.getItem(key);
          if (data) {
            try {
              const item: StorageItem = JSON.parse(data);
              if (item.ttl && Date.now() - item.timestamp > item.ttl) {
                sessionStorage.removeItem(key);
              }
            } catch {
              // Invalid data, remove it
              sessionStorage.removeItem(key);
            }
          }
        }
      });
    } catch (error) {
      console.error('SecureStorage.clearExpired error:', error);
    }
  }

  /**
   * Check if item exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }
}

// Singleton instance
export const secureStorage = new SecureStorage();

/**
 * Onboarding-specific storage with automatic cleanup
 */
export class OnboardingStorage {
  private static readonly KEYS = {
    AUTH: 'onboarding_auth',
    COMPANY_SETUP: 'onboarding_company_setup',
    OWNER_DETAILS: 'onboarding_owner_details',
    BUSINESS_INFO: 'onboarding_business_info',
    DOCUMENTS: 'onboarding_documents',
    SUBSCRIPTION: 'onboarding_subscription',
  };

  /**
   * Save onboarding auth data (userId, companyId only - NO TOKENS)
   */
  static setAuth(data: { userId: string; companyId: string; email?: string }) {
    // SECURITY: Never store tokens here
    const sanitized = {
      userId: data.userId,
      companyId: data.companyId,
      email: data.email, // Email is not sensitive
    };
    secureStorage.set(this.KEYS.AUTH, sanitized, 60 * 60 * 1000); // 1 hour
  }

  static getAuth() {
    return secureStorage.get<{ userId: string; companyId: string; email?: string }>(
      this.KEYS.AUTH
    );
  }

  /**
   * Save form data (non-sensitive)
   */
  static setFormData(key: keyof typeof OnboardingStorage.KEYS, data: any) {
    secureStorage.set(this.KEYS[key], data, 60 * 60 * 1000); // 1 hour
  }

  static getFormData(key: keyof typeof OnboardingStorage.KEYS) {
    return secureStorage.get(this.KEYS[key]);
  }

  /**
   * Clear all onboarding data (call after completion)
   */
  static clearAll() {
    Object.values(this.KEYS).forEach(key => {
      secureStorage.remove(key);
    });
  }

  /**
   * Clear sensitive data only (keep form progress)
   */
  static clearSensitive() {
    secureStorage.remove(this.KEYS.AUTH);
  }
}

/**
 * Auto-cleanup on page unload
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    secureStorage.clearExpired();
  });

  // Periodic cleanup every 5 minutes
  setInterval(() => {
    secureStorage.clearExpired();
  }, 5 * 60 * 1000);
}

export default secureStorage;
