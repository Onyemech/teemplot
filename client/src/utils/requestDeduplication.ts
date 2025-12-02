interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private readonly TIMEOUT = 5000; // 5 seconds

  
  async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // Check if request is already pending
    const existing = this.pendingRequests.get(key);
    
    if (existing) {
      // Check if request hasn't timed out
      if (Date.now() - existing.timestamp < this.TIMEOUT) {
        console.log(`[Dedup] Reusing pending request: ${key}`);
        return existing.promise;
      } else {
        // Request timed out, remove it
        this.pendingRequests.delete(key);
      }
    }

    // Create new request
    console.log(`[Dedup] Creating new request: ${key}`);
    const promise = requestFn()
      .finally(() => {
        // Clean up after request completes
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    });

    return promise;
  }

 
  clear() {
    this.pendingRequests.clear();
  }

  clearRequest(key: string) {
    this.pendingRequests.delete(key);
  }
}

export const requestDeduplicator = new RequestDeduplicator();


export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}


export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}


export function useSubmitOnce() {
  let isSubmitting = false;

  return async <T>(fn: () => Promise<T>): Promise<T | null> => {
    if (isSubmitting) {
      console.log('[Submit] Already submitting, ignoring duplicate');
      return null;
    }

    isSubmitting = true;
    try {
      return await fn();
    } finally {
      isSubmitting = false;
    }
  };
}
