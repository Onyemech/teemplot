import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/user.routes';
import { onboardingRoutes } from './routes/onboarding.routes';
import { employeesRoutes } from './routes/employees.routes';
import { employeeInvitationRoutes } from './routes/employee-invitation.routes';
import { superAdminRoutes } from './routes/superadmin.routes';
import filesRoutes from './routes/files.routes';
import attendanceRoutes from './routes/attendance.routes';
import companySettingsRoutes from './routes/company-settings.routes';
import webAuthnRoutes from './routes/webauthn.routes';
import adminAddressAuditRoutes from './routes/admin-address-audit.routes';
import dashboardRoutes from './routes/dashboard.routes';
import { companyRoutes } from './routes/company.routes';
import { companyLocationsRoutes } from './routes/company-locations.routes';
import { subscriptionRoutes } from './routes/subscription.routes';
import leaveRoutes from './routes/leave.routes';
import taskAssignmentRoutes from './routes/task-assignment.routes';
import tasksRoutes from './routes/tasks.routes';
import { notificationRoutes } from './routes/notifications.routes';
import locationRoutes from './routes/location.routes';
import { DatabaseFactory } from './infrastructure/database/DatabaseFactory';
import { autoAttendanceService } from './services/AutoAttendanceService';
import { logger } from './utils/logger';
import { errorHandler, setupUncaughtExceptionHandler, setupUnhandledRejectionHandler } from './middleware/errorHandler.middleware';
import {
  securityHeaders,
  requestLogger,
  detectSuspiciousActivity,
  logSecurityEvent
} from './middleware/security.middleware';
import { pathTraversalProtection } from './middleware/pathTraversal.middleware';
import { config_env } from './config/environment';

export async function buildApp() {
  // Setup global error handlers
  setupUncaughtExceptionHandler();
  setupUnhandledRejectionHandler();

  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // Register global error handler
  app.setErrorHandler(errorHandler);

  // Register security middleware
  app.addHook('onRequest', securityHeaders);
  app.addHook('onRequest', requestLogger);
  app.addHook('onRequest', pathTraversalProtection);

  // Add suspicious activity detection
  app.addHook('preHandler', async (request, reply) => {
    const suspicious = detectSuspiciousActivity(request);
    if (suspicious.suspicious) {
      await logSecurityEvent({
        type: 'suspicious_activity',
        ip: request.ip,
        userAgent: request.headers['user-agent'] || '',
        details: { reason: suspicious.reason, url: request.url }
      });
      return reply.code(403).send({
        success: false,
        message: 'Suspicious activity detected'
      });
    }
  });

  // Security plugins
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https:', 'wss:', process.env.CLIENT_URL || 'https://teemplot.com'],
      },
    },
  });

  // Intelligent CORS configuration
  await app.register(cors, {
    origin: (origin, callback) => {
      const allowedOrigins = [
        ...config_env.allowedOrigins,
        'https://app.teemplot.com',
        'https://api.teemplot.com'
      ];

      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Check if origin is allowed
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        // Always return the exact origin for credentials validation
        callback(null, origin);
      } else {
        logger.warn({ origin, allowedOrigins }, 'CORS: Origin not allowed');
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires', 'X-Requested-With', 'X-CSRF-Token'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400, // 24 hours
  });

  // Rate limiting is now applied selectively to sensitive endpoints only (see auth routes)
  // Global rate limiting was causing issues with normal operations
  // await app.register(rateLimit, {
  //   max: parseInt(process.env.RATE_LIMIT_MAX || '10000'),
  //   timeWindow: process.env.RATE_LIMIT_WINDOW || '15 minutes',
  //   errorResponseBuilder: (request, context) => {
  //     let retryMsg;
  //     if (typeof context.after === 'string') {
  //       retryMsg = context.after;
  //     } else {
  //       const minutes = Math.ceil(Number(context.after) / 1000 / 60);
  //       retryMsg = `${minutes} minute${minutes > 1 ? 's' : ''}`;
  //     }
  //
  //     return {
  //       statusCode: 429,
  //       error: 'Too Many Requests',
  //       message: `Too many attempts. Please try again in ${retryMsg}.`,
  //       retryAfter: context.after,
  //       success: false
  //     };
  //   }
  // });

  // Cookie plugin (must be registered before JWT)
  await app.register(require('@fastify/cookie'), {
    secret: process.env.COOKIE_SECRET || process.env.JWT_ACCESS_SECRET || 'dev_secret_change_in_production',
  });

  // JWT plugin with cookie support
  await app.register(jwt, {
    secret: process.env.JWT_ACCESS_SECRET || 'dev_secret_change_in_production',
    cookie: {
      cookieName: 'accessToken',
      signed: false // We use httpOnly instead of signing
    }
  });

  // JWT verification decorator
  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (error: any) {
      // Provide clear error messages
      const message = error.message?.includes('expired')
        ? 'Session expired. Please log in again.'
        : error.message?.includes('invalid')
          ? 'Invalid authentication token. Please log in again.'
          : 'Authentication required. Please log in.';

      reply.code(401).send({
        success: false,
        message,
        code: 'AUTH_ERROR',
        requiresLogin: true
      });
    }
  });

  // Health check (both /health and /api/health for consistency)
  const healthHandler = async () => {
    const dbHealth = await DatabaseFactory.healthCheck();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        primary: dbHealth.primary ? 'connected' : 'disconnected',
        backup: dbHealth.backup ? 'connected' : 'disconnected',
        type: dbHealth.type,
      },
    };
  };

  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // Routes - Use /api prefix for all routes
  // This works for both development (localhost:5000/api/...) and production (api.teemplot.com/api/...)
  const apiPrefix = '/api';

  await app.register(authRoutes, { prefix: `${apiPrefix}/auth` });
  await app.register(userRoutes, { prefix: `${apiPrefix}/user` });
  await app.register(onboardingRoutes, { prefix: `${apiPrefix}/onboarding` });
  await app.register(employeesRoutes, { prefix: `${apiPrefix}/employees` });
  await app.register(employeeInvitationRoutes, { prefix: `${apiPrefix}/employee-invitations` });
  await app.register(superAdminRoutes, { prefix: `${apiPrefix}/superadmin` });
  await app.register(filesRoutes, { prefix: `${apiPrefix}/files` });
  await app.register(attendanceRoutes, { prefix: `${apiPrefix}/attendance` });
  await app.register(companySettingsRoutes, { prefix: `${apiPrefix}/company-settings` });
  await app.register(webAuthnRoutes, { prefix: `${apiPrefix}/webauthn` });
  await app.register(adminAddressAuditRoutes, { prefix: `${apiPrefix}/admin/address-audit` });
  await app.register(dashboardRoutes, { prefix: `${apiPrefix}/dashboard` });
  await app.register(companyRoutes, { prefix: `${apiPrefix}/company` });
  await app.register(companyLocationsRoutes, { prefix: `${apiPrefix}/company-locations` });
  await app.register(subscriptionRoutes, { prefix: `${apiPrefix}/subscription` });
  await app.register(leaveRoutes, { prefix: `${apiPrefix}/leave` });
  await app.register(taskAssignmentRoutes, { prefix: `${apiPrefix}/task-assignments` });
  await app.register(tasksRoutes, { prefix: `${apiPrefix}/tasks` });
  await app.register(notificationRoutes, { prefix: `${apiPrefix}/notifications` });
  await app.register(locationRoutes, { prefix: `${apiPrefix}/location` });


  // Initialize auto attendance service
  if (process.env.NODE_ENV === 'production') {
    autoAttendanceService.initialize();
  }

  // Graceful shutdown
  const closeGracefully = async (signal: string) => {
    logger.info(`Received ${signal}, closing gracefully`);
    autoAttendanceService.stop();
    await DatabaseFactory.closeAll();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => closeGracefully('SIGINT'));
  process.on('SIGTERM', () => closeGracefully('SIGTERM'));

  return app;
}
