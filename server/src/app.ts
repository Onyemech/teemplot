import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import { authRoutes } from './routes/auth.routes';
import { DatabaseFactory } from './infrastructure/database/DatabaseFactory';
import { autoAttendanceService } from './services/AutoAttendanceService';
import { performanceSnapshotJobService } from './services/PerformanceSnapshotJobService';
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
  await app.register(cookie, {
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

  // Import and register onboarding routes
  const { onboardingRoutes } = await import('./routes/onboarding.routes');
  await app.register(onboardingRoutes, { prefix: `${apiPrefix}/onboarding` });

  // Import and register employees routes
  const { employeesRoutes } = await import('./routes/employees.routes');
  await app.register(employeesRoutes, { prefix: `${apiPrefix}/employees` });

  // Import and register employee invitation routes
  const { employeeInvitationRoutes } = await import('./routes/employee-invitation.routes');
  await app.register(employeeInvitationRoutes, { prefix: `${apiPrefix}/employee-invitations` });

  // Import and register super admin routes
  const { superAdminRoutes } = await import('./routes/superadmin.routes');
  await app.register(superAdminRoutes, { prefix: `${apiPrefix}/superadmin` });

  // Import and register files routes
  const filesRoutes = await import('./routes/files.routes');
  await app.register(filesRoutes.default, { prefix: `${apiPrefix}/files` });

  // Import and register attendance routes
  const attendanceRoutes = await import('./routes/attendance.routes');
  await app.register(attendanceRoutes.default, { prefix: `${apiPrefix}/attendance` });

  // Import and register company settings routes
  const companySettingsRoutes = await import('./routes/company-settings.routes');
  await app.register(companySettingsRoutes.default, { prefix: `${apiPrefix}/company-settings` });

  // Import and register WebAuthn routes for biometric authentication
  const webAuthnRoutes = await import('./routes/webauthn.routes');
  await app.register(webAuthnRoutes.default, { prefix: `${apiPrefix}/webauthn` });

  // Import and register admin address audit routes
  const adminAddressAuditRoutes = await import('./routes/admin-address-audit.routes');
  await app.register(adminAddressAuditRoutes.default, { prefix: `${apiPrefix}/admin/address-audit` });

  // Import and register dashboard routes
  const dashboardRoutes = await import('./routes/dashboard.routes');
  await app.register(dashboardRoutes.default, { prefix: `${apiPrefix}/dashboard` });

  // Import and register company routes
  const { companyRoutes } = await import('./routes/company.routes');
  await app.register(companyRoutes, { prefix: `${apiPrefix}/company` });

  // Import and register company locations routes
  const { companyLocationsRoutes } = await import('./routes/company-locations.routes');
  await app.register(companyLocationsRoutes, { prefix: `${apiPrefix}/company-locations` });

  // Import and register subscription routes
  const { subscriptionRoutes } = await import('./routes/subscription.routes');
  await app.register(subscriptionRoutes, { prefix: `${apiPrefix}/subscription` });

  // Import and register leave management routes
  const leaveRoutes = await import('./routes/leave.routes');
  await app.register(leaveRoutes.default, { prefix: `${apiPrefix}/leave` });

  // Import and register task assignment routes
  const taskAssignmentRoutes = await import('./routes/task-assignment.routes');
  await app.register(taskAssignmentRoutes.default, { prefix: `${apiPrefix}/task-assignments` });

  // Import and register tasks routes
  const tasksRoutes = await import('./routes/tasks.routes');
  await app.register(tasksRoutes.default, { prefix: `${apiPrefix}/tasks` });

  // Import and register user routes (profile, etc.)
  const userRoutes = await import('./routes/user.routes');
  await app.register(userRoutes.default, { prefix: `${apiPrefix}/user` });

  // Import and register notification routes
  const { notificationRoutes } = await import('./routes/notifications.routes');
  await app.register(notificationRoutes, { prefix: `${apiPrefix}/notifications` });

  // Import and register device location routes
  const locationRoutes = await import('./routes/location.routes');
  await app.register(locationRoutes.default, { prefix: `${apiPrefix}/location` });

  // Import and register analytics routes
  const { analyticsRoutes } = await import('./routes/analytics.routes');
  await app.register(analyticsRoutes, { prefix: `${apiPrefix}/analytics` });

  // Import and register audit routes
  const auditRoutes = await import('./routes/audit.routes');
  await app.register(auditRoutes.default, { prefix: `${apiPrefix}/audit` });

  // Import and register internal job routes
  const { jobsRoutes } = await import('./routes/jobs.routes');
  await app.register(jobsRoutes, { prefix: `${apiPrefix}/jobs` });

  // Import and register departments routes
  const departmentsRoutes = await import('./routes/departments.routes');
  await app.register(departmentsRoutes.default, { prefix: `${apiPrefix}/departments` });

  // Initialize auto attendance service
  if (process.env.NODE_ENV === 'production') {
    autoAttendanceService.initialize();
    performanceSnapshotJobService.initialize();
  }

  // Graceful shutdown
  const closeGracefully = async (signal: string) => {
    logger.info(`Received ${signal}, closing gracefully`);
    autoAttendanceService.stop();
    performanceSnapshotJobService.stop();
    await DatabaseFactory.closeAll();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => closeGracefully('SIGINT'));
  process.on('SIGTERM', () => closeGracefully('SIGTERM'));

  return app;
}
