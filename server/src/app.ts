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

  // Security plugins (registered FIRST to ensure CORS/Security headers are set for all requests)
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

  await app.register(cors, {
    origin: (origin, callback) => {
      const allowedOrigins = [
        ...config_env.allowedOrigins,
        'https://teemplot.com',
        'https://www.teemplot.com',
        'https://dashboard.teemplot.com',
        'https://app.teemplot.com',
        'https://api.teemplot.com',
        'https://teemplot.vercel.app',
        'https://teemplot-frontend.vercel.app',
      ];

      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Check if origin is allowed (case-insensitive and trimmed)
      const normalizedOrigin = origin.trim().toLowerCase();
      const isAllowed = allowedOrigins.some(o => o.toLowerCase() === normalizedOrigin);

      if (isAllowed || process.env.NODE_ENV === 'development') {
        // Always return the exact origin for credentials validation
        callback(null, true);
      } else {
        logger.warn({ origin, allowedOrigins }, 'CORS: Origin not allowed');
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'Cache-Control', 
      'Pragma', 
      'Expires', 
      'X-Requested-With', 
      'X-CSRF-Token',
      'X-Job-Secret',
      'Last-Event-ID'
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400, // 24 hours
  });

  app.addHook('onRequest', securityHeaders);
  app.addHook('onRequest', requestLogger);
  app.addHook('onRequest', pathTraversalProtection);

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

  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET || process.env.JWT_ACCESS_SECRET || 'dev_secret_change_in_production',
  });

  await app.register(jwt, {
    secret: process.env.JWT_ACCESS_SECRET || 'dev_secret_change_in_production',
    cookie: {
      cookieName: 'accessToken',
      signed: false 
    }
  });

  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (error: any) {
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

  const apiPrefix = '/api';

  await app.register(authRoutes, { prefix: `${apiPrefix}/auth` });

  const { onboardingRoutes } = await import('./routes/onboarding.routes');
  await app.register(onboardingRoutes, { prefix: `${apiPrefix}/onboarding` });

  const { employeesRoutes } = await import('./routes/employees.routes');
  await app.register(employeesRoutes, { prefix: `${apiPrefix}/employees` });

  const { employeeInvitationRoutes } = await import('./routes/employee-invitation.routes');
  await app.register(employeeInvitationRoutes, { prefix: `${apiPrefix}/employee-invitations` });

  const { superAdminRoutes } = await import('./routes/superadmin.routes');
  await app.register(superAdminRoutes, { prefix: `${apiPrefix}/superadmin` });

  const filesRoutes = await import('./routes/files.routes');
  await app.register(filesRoutes.default, { prefix: `${apiPrefix}/files` });

  const attendanceRoutes = await import('./routes/attendance.routes');
  await app.register(attendanceRoutes.default, { prefix: `${apiPrefix}/attendance` });

  const companySettingsRoutes = await import('./routes/company-settings.routes');
  await app.register(companySettingsRoutes.default, { prefix: `${apiPrefix}/company-settings` });

  const webAuthnRoutes = await import('./routes/webauthn.routes');
  await app.register(webAuthnRoutes.default, { prefix: `${apiPrefix}/webauthn` });

  const adminAddressAuditRoutes = await import('./routes/admin-address-audit.routes');
  await app.register(adminAddressAuditRoutes.default, { prefix: `${apiPrefix}/admin/address-audit` });

  const dashboardRoutes = await import('./routes/dashboard.routes');
  await app.register(dashboardRoutes.default, { prefix: `${apiPrefix}/dashboard` });

  const { companyRoutes } = await import('./routes/company.routes');
  await app.register(companyRoutes, { prefix: `${apiPrefix}/company` });

  const { companyLocationsRoutes } = await import('./routes/company-locations.routes');
  await app.register(companyLocationsRoutes, { prefix: `${apiPrefix}/company-locations` });

  const { subscriptionRoutes } = await import('./routes/subscription.routes');
  await app.register(subscriptionRoutes, { prefix: `${apiPrefix}/subscription` });

  const leaveRoutes = await import('./routes/leave.routes');
  await app.register(leaveRoutes.default, { prefix: `${apiPrefix}/leave` });

  const taskAssignmentRoutes = await import('./routes/task-assignment.routes');
  await app.register(taskAssignmentRoutes.default, { prefix: `${apiPrefix}/task-assignments` });

  const tasksRoutes = await import('./routes/tasks.routes');
  await app.register(tasksRoutes.default, { prefix: `${apiPrefix}/tasks` });

  const userRoutes = await import('./routes/user.routes');
  await app.register(userRoutes.default, { prefix: `${apiPrefix}/user` });

  const { notificationRoutes } = await import('./routes/notifications.routes');
  await app.register(notificationRoutes, { prefix: `${apiPrefix}/notifications` });

  const locationRoutes = await import('./routes/location.routes');
  await app.register(locationRoutes.default, { prefix: `${apiPrefix}/location` });

  const { analyticsRoutes } = await import('./routes/analytics.routes');
  await app.register(analyticsRoutes, { prefix: `${apiPrefix}/analytics` });

  const auditRoutes = await import('./routes/audit.routes');
  await app.register(auditRoutes.default, { prefix: `${apiPrefix}/audit` });

  const { jobsRoutes } = await import('./routes/jobs.routes');
  await app.register(jobsRoutes, { prefix: `${apiPrefix}/jobs` });

  const departmentsRoutes = await import('./routes/departments.routes');
  await app.register(departmentsRoutes.default, { prefix: `${apiPrefix}/departments` });

  const pushRoutes = await import('./routes/push.routes');
  await app.register(pushRoutes.default, { prefix: `${apiPrefix}/push` });

  if (process.env.NODE_ENV === 'production') {
    autoAttendanceService.initialize();
    performanceSnapshotJobService.initialize();
  }

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
