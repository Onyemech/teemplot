/**
 * Sanitize error messages for user display
 * - Removes technical details (SQL, stack traces, etc.)
 * - Keeps user-friendly messages
 * - Hides 404 and error codes
 */
export function sanitizeErrorMessage(error: any): string {
  // If it's a string, process it
  let message = typeof error === 'string' ? error : error?.message || 'An error occurred';

  // Remove SQL-related errors
  if (message.includes('SQL') || message.includes('SQLite') || message.includes('query error')) {
    return 'A technical error occurred. Please try again or contact support.';
  }

  // Remove stack traces
  if (message.includes('at ') && message.includes('(')) {
    message = message.split('\n')[0]; // Take only first line
  }

  // Remove error codes (404, 500, etc.) but keep rate limit messages
  if (/\b(404|500|401|403|400)\b/.test(message) && !message.toLowerCase().includes('rate limit')) {
    return 'An error occurred. Please try again.';
  }

  // Keep rate limit messages as they are user-friendly
  if (message.toLowerCase().includes('rate limit')) {
    return message;
  }

  // Remove technical jargon
  const technicalTerms = [
    'undefined',
    'null',
    'TypeError',
    'ReferenceError',
    'SyntaxError',
    'Cannot read property',
    'is not a function',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'Network Error',
  ];

  for (const term of technicalTerms) {
    if (message.includes(term)) {
      return 'A technical error occurred. Please try again.';
    }
  }

  // If message is too long (likely technical), truncate
  if (message.length > 150) {
    return 'An error occurred. Please try again or contact support.';
  }

  // Return the sanitized message
  return message;
}

/**
 * Format error for toast notification
 */
export function formatErrorForToast(error: any): string {
  const sanitized = sanitizeErrorMessage(error);
  
  // Capitalize first letter
  return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: any): boolean {
  const message = typeof error === 'string' ? error : error?.message || '';
  return message.toLowerCase().includes('rate limit');
}

/**
 * Extract retry time from rate limit error
 * Example: "Rate limit exceeded, retry in 49 minutes" -> "49 minutes"
 */
export function extractRetryTime(error: any): string | null {
  const message = typeof error === 'string' ? error : error?.message || '';
  const match = message.match(/retry in (\d+\s+\w+)/i);
  return match ? match[1] : null;
}
