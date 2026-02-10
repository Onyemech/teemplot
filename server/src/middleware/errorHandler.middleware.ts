import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { logger } from '../utils/logger';
import { Sentry } from '../utils/sentry';
import { superAdminNotificationService } from '../services/SuperAdminNotificationService';

/**
 * Global error handler middleware
 * Catches all unhandled errors and notifies superadmins
 */
import { formatErrorResponse, getStatusCodeFromError } from './error-formatter.middleware';

/**
 * Global error handler middleware
 * Catches all unhandled errors and notifies superadmins
 */
export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Log error
  logger.error({
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
    ip: request.ip,
    user: request.user,
    code: error.code
  }, 'Unhandled error');

  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: {
        url: request.url,
        method: request.method,
        ip: request.ip,
        user: request.user,
        code: (error as any).code,
      }
    });
  }
  // Notify superadmins for unexpected errors
  // If no statusCode, it's likely a runtime error (500)
  const isUnexpectedError = !error.statusCode || error.statusCode >= 500;
  
  if (isUnexpectedError) {
    superAdminNotificationService.notifyError(error, {
      requestId: request.id,
      url: request.url,
      method: request.method,
      ip: request.ip,
      user: request.user ? { 
        userId: (request.user as any).userId, 
        companyId: (request.user as any).companyId, 
        role: (request.user as any).role 
      } : undefined
    }).catch(err => {
      logger.error('Failed to notify superadmin about error:', err);
    });
  }

  // Use centralized error formatting
  const statusCode = getStatusCodeFromError(error);
  const formattedResponse = formatErrorResponse(error);

  reply.code(statusCode).send({
    ...formattedResponse,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error,
    }),
  });
}

/**
 * Handle uncaught exceptions
 */
export function setupUncaughtExceptionHandler(): void {
  process.on('uncaughtException', (error: Error) => {
    logger.error({ error }, 'Uncaught Exception');

    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error, { extra: { type: 'uncaughtException' } });
      Sentry.flush(2000).catch(() => {});
    }

    superAdminNotificationService.notifyError(error, {
      type: 'uncaughtException',
      timestamp: new Date().toISOString(),
    }).catch(err => {
      logger.error('Failed to notify superadmin:', err);
    });

    // Give time for notification to send before exiting
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
}

/**
 * Handle unhandled promise rejections
 */
export function setupUnhandledRejectionHandler(): void {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error({ reason, promise }, 'Unhandled Rejection');

    const error = reason instanceof Error ? reason : new Error(String(reason));

    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error, { extra: { type: 'unhandledRejection' } });
    }

    superAdminNotificationService.notifyError(error, {
      type: 'unhandledRejection',
      timestamp: new Date().toISOString(),
    }).catch(err => {
      logger.error('Failed to notify superadmin:', err);
    });
  });
}
