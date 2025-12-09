/**
 * API Timeout Utility
 * Provides consistent timeout handling across all API calls
 */

export interface TimeoutConfig {
  timeout?: number;
  onTimeout?: () => void;
  signal?: AbortSignal;
}

export const DEFAULT_TIMEOUTS = {
  fast: 5000,      // 5 seconds - for quick operations (login, logout)
  normal: 15000,   // 15 seconds - for normal operations (fetch data)
  slow: 30000,     // 30 seconds - for slow operations (file uploads)
  verySlow: 60000, // 60 seconds - for very slow operations (large file uploads)
};

/**
 * Creates an AbortController with timeout
 * @param timeout - Timeout in milliseconds
 * @param onTimeout - Optional callback when timeout occurs
 * @returns AbortController and cleanup function
 */
export function createTimeoutController(
  timeout: number = DEFAULT_TIMEOUTS.normal,
  onTimeout?: () => void
): { controller: AbortController; cleanup: () => void } {
  const controller = new AbortController();
  
  const timeoutId = setTimeout(() => {
    controller.abort();
    if (onTimeout) {
      onTimeout();
    }
  }, timeout);

  const cleanup = () => {
    clearTimeout(timeoutId);
  };

  return { controller, cleanup };
}

/**
 * Wraps a fetch call with timeout
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param config - Timeout configuration
 * @returns Promise with fetch response
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  config: TimeoutConfig = {}
): Promise<Response> {
  const timeout = config.timeout || DEFAULT_TIMEOUTS.normal;
  const { controller, cleanup } = createTimeoutController(timeout, config.onTimeout);

  try {
    // Merge abort signals if one is provided
    const signal = config.signal
      ? mergeAbortSignals(controller.signal, config.signal)
      : controller.signal;

    const response = await fetch(url, {
      ...options,
      signal,
    });

    cleanup();
    return response;
  } catch (error: any) {
    cleanup();
    
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    
    throw error;
  }
}

/**
 * Merges multiple abort signals
 * @param signals - Array of abort signals
 * @returns Merged abort signal
 */
function mergeAbortSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }

    signal.addEventListener('abort', () => {
      controller.abort();
    });
  }

  return controller.signal;
}

/**
 * Retry utility with exponential backoff
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelay - Base delay in milliseconds
 * @returns Promise with function result
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on certain errors
      if (
        error.message?.includes('401') ||
        error.message?.includes('403') ||
        error.message?.includes('404')
      ) {
        throw error;
      }

      // Don't retry if it's the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s...
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
