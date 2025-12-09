/**
 * Centralized error handling utility
 * Converts technical errors into user-friendly messages
 */

export interface ApiError {
  message?: string;
  error?: string;
  errors?: string[];
  statusCode?: number;
  code?: string;
}

/**
 * Extract user-friendly error message from API response
 */
export function getErrorMessage(error: any): string {
  // If it's already a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // Check for response data (axios/fetch error)
  const responseData = error?.response?.data || error?.data;
  
  if (responseData) {
    // Check for message field
    if (responseData.message) {
      return cleanErrorMessage(responseData.message);
    }
    
    // Check for error field
    if (responseData.error) {
      return cleanErrorMessage(responseData.error);
    }
    
    // Check for errors array
    if (Array.isArray(responseData.errors) && responseData.errors.length > 0) {
      return responseData.errors[0];
    }
  }

  // Check for direct message
  if (error?.message) {
    return cleanErrorMessage(error.message);
  }

  // Network errors
  if (error?.name === 'AbortError') {
    return 'Request timed out. Please check your connection and try again.';
  }

  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }

  if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error')) {
    return 'Network error. Please check your internet connection.';
  }

  // HTTP status codes
  const status = error?.response?.status || error?.status;
  if (status) {
    switch (status) {
      case 400:
        return 'Invalid request. Please check your information and try again.';
      case 401:
        return 'Your session has expired. Please sign in again.';
      case 403:
        return 'You don\'t have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This information conflicts with existing data. Please review and try again.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        if (status >= 500) {
          return 'Server error. Please try again later.';
        }
    }
  }

  // Default fallback
  return 'Something went wrong. Please try again.';
}

/**
 * Clean up technical error messages to be user-friendly
 */
function cleanErrorMessage(message: string): string {
  // Remove technical SQL/database errors
  if (message.includes('PostgreSQL') || message.includes('SQL:')) {
    // Check for specific constraint violations
    if (message.includes('duplicate key') || message.includes('unique constraint')) {
      if (message.includes('place_id')) {
        return 'This address is already registered. Please select a different address.';
      }
      if (message.includes('email')) {
        return 'This email address is already in use.';
      }
      if (message.includes('phone')) {
        return 'This phone number is already in use.';
      }
      return 'This information is already in use. Please use different details.';
    }
    
    if (message.includes('foreign key constraint')) {
      return 'Invalid reference. Please refresh the page and try again.';
    }
    
    if (message.includes('check constraint')) {
      return 'Invalid data provided. Please check your information.';
    }
    
    if (message.includes('not null constraint')) {
      return 'Required information is missing. Please fill in all required fields.';
    }
    
    // Generic database error
    return 'Database error. Please try again or contact support if the issue persists.';
  }

  // Remove stack traces
  if (message.includes('at ') && message.includes('(')) {
    message = message.split('\n')[0];
  }

  // Remove error codes in brackets
  message = message.replace(/\[.*?\]/g, '').trim();

  // Remove "Error:" prefix
  message = message.replace(/^Error:\s*/i, '');

  // Capitalize first letter
  if (message.length > 0) {
    message = message.charAt(0).toUpperCase() + message.slice(1);
  }

  // Ensure it ends with a period
  if (message.length > 0 && !message.endsWith('.') && !message.endsWith('!') && !message.endsWith('?')) {
    message += '.';
  }

  return message;
}

/**
 * Check if error is a network/connection error
 */
export function isNetworkError(error: any): boolean {
  return (
    error?.name === 'AbortError' ||
    error?.code === 'ECONNABORTED' ||
    error?.code === 'ERR_NETWORK' ||
    error?.message?.includes('Network Error') ||
    error?.message?.includes('timeout') ||
    error?.message?.includes('Failed to fetch')
  );
}

/**
 * Check if error requires re-authentication
 */
export function requiresAuth(error: any): boolean {
  const status = error?.response?.status || error?.status;
  return status === 401 || error?.code === 'AUTH_ERROR';
}

/**
 * Format validation errors from backend
 */
export function formatValidationErrors(errors: any): Record<string, string> {
  const formatted: Record<string, string> = {};

  if (Array.isArray(errors)) {
    errors.forEach((err, index) => {
      formatted[`field_${index}`] = cleanErrorMessage(err);
    });
  } else if (typeof errors === 'object') {
    Object.keys(errors).forEach(key => {
      formatted[key] = cleanErrorMessage(errors[key]);
    });
  }

  return formatted;
}
