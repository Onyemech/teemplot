export const isPWA = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true ||
         document.referrer.includes('android-app://');
};

// Check if running on mobile device
export const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Push Notifications - NO SENSITIVE DATA
export interface NotificationPermissionResult {
  granted: boolean;
  token?: string;
  error?: string;
}

export const requestNotificationPermission = async (): Promise<NotificationPermissionResult> => {
  if (!('Notification' in window)) {
    return { granted: false, error: 'Notifications not supported' };
  }

  try {
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      return { granted: false, error: 'Permission denied' };
    }

    return { granted: true };
  } catch (error: any) {
    console.error('Notification permission error:', error);
    return { granted: false, error: error.message };
  }
};

// Geolocation - NO CACHING OF LOCATION DATA
export interface GeolocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export const getCurrentPosition = (): Promise<GeolocationResult> => {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
      },
      (error) => {
        reject(new Error(error.message));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0 // Never use cached position
      }
    );
  });
};

// Calculate distance between two coordinates (Haversine formula)
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Biometric Authentication (Web Authentication API)
export interface BiometricResult {
  success: boolean;
  error?: string;
}

export const isBiometricAvailable = async (): Promise<boolean> => {
  if (!window.PublicKeyCredential) {
    return false;
  }

  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch {
    return false;
  }
};

// Secure storage utilities - ONLY NON-SENSITIVE PREFERENCES
export const secureStorage = {
  setPreference: (key: string, value: string) => {
    try {
      localStorage.setItem(`pref_${key}`, value);
    } catch (error) {
      console.error('Storage error:', error);
    }
  },
  
  getPreference: (key: string): string | null => {
    try {
      return localStorage.getItem(`pref_${key}`);
    } catch (error) {
      console.error('Storage error:', error);
      return null;
    }
  },
  
  removePreference: (key: string) => {
    try {
      localStorage.removeItem(`pref_${key}`);
    } catch (error) {
      console.error('Storage error:', error);
    }
  },
  
  clearAll: () => {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('pref_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Storage error:', error);
    }
  }
};

// Network status
export const isOnline = (): boolean => {
  return navigator.onLine;
};

export const onNetworkChange = (callback: (online: boolean) => void): (() => void) => {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};
