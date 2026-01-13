import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger';

/**
 * User-friendly error messages mapped from technical error codes and patterns
 */
const ERROR_MESSAGES: Record<string, string> = {
    // Authentication errors
    'AUTH_ERROR': 'Your session has expired. Please log in again.',
    'UNAUTHORIZED': 'You need to be logged in to perform this action.',
    'FORBIDDEN': 'You do not have permission to perform this action.',

    // Validation errors
    'VALIDATION_ERROR': 'Please check your input and try again.',
    'INVALID_INPUT': 'Some of the information provided is invalid.',
    'MISSING_FIELD': 'Please fill in all required fields.',

    // Resource errors
    'NOT_FOUND': 'The requested resource was not found.',
    'ALREADY_EXISTS': 'This information already exists in the system.',
    'DUPLICATE_EMAIL': 'This email address is already registered.',
    'DUPLICATE_ADDRESS': 'This business address is already registered. Please contact support if this is your business location.',

    // Upload errors
    'UPLOAD_FAILED': 'Failed to upload file. Please try again.',
    'FILE_TOO_LARGE': 'The file is too large. Maximum size is 10MB.',
    'INVALID_FILE_TYPE': 'This file type is not supported. Please upload a PDF, PNG, or JPEG file.',
    'ATTACH_FAILED': 'Failed to save your document. Please try again.',

    // Database errors
    'DATABASE_ERROR': 'A technical issue occurred. Please try again in a moment.',
    'CONNECTION_ERROR': 'Connection issue. Please check your internet connection and try again.',

    // Business logic errors
    'EMPLOYEE_LIMIT_REACHED': 'You have reached the maximum number of employees for your plan. Please upgrade to add more.',
    'PLAN_VERIFICATION_FAILED': 'Unable to verify your subscription plan. Please contact support.',
    'TRANSACTION_ROLLBACK': 'The operation could not be completed. Please try again.',

    // Rate limiting
    'RATE_LIMIT': 'Too many requests. Please wait a moment before trying again.',

    // Generic fallback
    'INTERNAL_ERROR': 'Something went wrong. Please try again or contact support if the issue persists.',
};

/**
 * Extract user-friendly message from error
 */
export function formatErrorMessage(error: any): string {
    // If error already has a user-friendly message, use it
    if (error.userMessage) {
        return error.userMessage;
    }

    // Map error code to user-friendly message
    if (error.code && ERROR_MESSAGES[error.code]) {
        return ERROR_MESSAGES[error.code];
    }

    // Check error message for patterns
    const message = error.message?.toLowerCase() || '';

    if (message.includes('duplicate') || message.includes('already exists')) {
        if (message.includes('email')) return ERROR_MESSAGES.DUPLICATE_EMAIL;
        if (message.includes('address')) return ERROR_MESSAGES.DUPLICATE_ADDRESS;
        return ERROR_MESSAGES.ALREADY_EXISTS;
    }

    if (message.includes('validation') || message.includes('invalid')) {
        return ERROR_MESSAGES.VALIDATION_ERROR;
    }

    if (message.includes('required') || message.includes('missing')) {
        return ERROR_MESSAGES.MISSING_FIELD;
    }

    if (message.includes('not found') || message.includes('does not exist')) {
        return ERROR_MESSAGES.NOT_FOUND;
    }

    if (message.includes('unauthorized') || message.includes('not authenticated')) {
        return ERROR_MESSAGES.UNAUTHORIZED;
    }

    if (message.includes('forbidden') || message.includes('permission')) {
        return ERROR_MESSAGES.FORBIDDEN;
    }

    if (message.includes('upload') || message.includes('file')) {
        if (message.includes('too large') || message.includes('size')) return ERROR_MESSAGES.FILE_TOO_LARGE;
        if (message.includes('type') || message.includes('format')) return ERROR_MESSAGES.INVALID_FILE_TYPE;
        if (message.includes('attach')) return ERROR_MESSAGES.ATTACH_FAILED;
        return ERROR_MESSAGES.UPLOAD_FAILED;
    }

    if (message.includes('connection') || message.includes('network') || message.includes('timeout')) {
        return ERROR_MESSAGES.CONNECTION_ERROR;
    }

    if (message.includes('database') || message.includes('query')) {
        return ERROR_MESSAGES.DATABASE_ERROR;
    }

    // If we have a clean, user-friendly message from the error itself, use it
    // (but filter out technical details)
    if (error.message &&
        !error.message.includes('Error:') &&
        !error.message.includes('at ') &&
        !error.message.includes('stack') &&
        error.message.length < 150) {
        return error.message;
    }

    // Fallback to generic error
    return ERROR_MESSAGES.INTERNAL_ERROR;
}

/**
 * Format error response without exposing technical details or status codes
 */
export function formatErrorResponse(error: any, defaultMessage?: string): {
    success: false;
    message: string;
    code?: string;
} {
    const userMessage = formatErrorMessage(error);

    // Log the full error for debugging (server-side only)
    logger.error({
        err: error,
        code: error.code,
        statusCode: error.statusCode,
        stack: error.stack,
    }, 'Error occurred');

    // Return sanitized response
    return {
        success: false,
        message: defaultMessage || userMessage,
        // Only include code if it's a known error code (not HTTP status codes)
        ...(error.code && !Number.isInteger(error.code) ? { code: error.code } : {}),
    };
}

/**
 * Determine appropriate HTTP status code from error
 */
export function getStatusCodeFromError(error: any): number {
    // If error has explicit statusCode, use it
    if (error.statusCode && typeof error.statusCode === 'number') {
        return error.statusCode;
    }

    // Map error codes to status codes
    const code = error.code?.toUpperCase();

    if (code === 'AUTH_ERROR' || code === 'UNAUTHORIZED') return 401;
    if (code === 'FORBIDDEN') return 403;
    if (code === 'NOT_FOUND') return 404;
    if (code === 'VALIDATION_ERROR' || code === 'INVALID_INPUT') return 400;
    if (code === 'ALREADY_EXISTS' || code === 'DUPLICATE_EMAIL' || code === 'DUPLICATE_ADDRESS') return 409;
    if (code === 'EMPLOYEE_LIMIT_REACHED' || code === 'PLAN_VERIFICATION_FAILED') return 400;
    if (code === 'RATE_LIMIT') return 429;
    if (code === 'FILE_TOO_LARGE') return 413;

    // Default to 500 for unknown errors
    return 500;
}

/**
 * Middleware to intercept and format error responses
 */
export async function errorFormatterHook(
    request: FastifyRequest,
    reply: FastifyReply,
    error: any
) {
    const statusCode = getStatusCodeFromError(error);
    const formattedResponse = formatErrorResponse(error);

    return reply.code(statusCode).send(formattedResponse);
}
