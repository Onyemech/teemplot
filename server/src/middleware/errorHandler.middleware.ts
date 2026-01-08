import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { logger } from '../utils/logger';
import { superAdminNotificationService } from '../services/SuperAdminNotificationService';

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
  }, 'Unhandled error');

  // Notify superadmins for critical errors
  if (error.statusCode && error.statusCode >= 500) {
    superAdminNotificationService.notifyError(error, {
      url: request.url,
      method: request.method,
      ip: request.ip,
      userId: request.user?.userId,
      companyId: request.user?.companyId,
    }).catch(err => {
      logger.error('Failed to notify superadmin about error:', err);
    });
  }

  // Send error response
  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? 'Internal Server Error' : error.message;

  reply.code(statusCode).send({
    success: false,
    message,
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
    
    superAdminNotificationService.notifyError(error, {
      type: 'unhandledRejection',
      timestamp: new Date().toISOString(),
    }).catch(err => {
      logger.error('Failed to notify superadmin:', err);
    });
  });
}
