import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import { authRoutes } from './routes/auth.routes';
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
      },
    },
  });

  await app.register(cors, {
    origin: (origin, callback) => {
      const allowedOrigins = config_env.allowedOrigins;
      
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn({ origin, allowedOrigins }, 'CORS: Origin not allowed');
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400,
  });

  await app.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '15 minutes',
    errorResponseBuilder: (request, context) => {
      const retryAfter = Math.ceil(Number(context.after) / 1000 / 60);
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Too many attempts. Please try again in ${retryAfter} minute${retryAfter > 1 ? 's' : ''}.`,
        retryAfter: context.after,
        success: false
      };
    }
  });

  await app.register(require('@fastify/cookie'), {
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

  const adminAddressAuditRoutes = await import('./routes/admin-address-audit.routes');
  await app.register(adminAddressAuditRoutes.default, { prefix: `${apiPrefix}/admin/address-audit` });

  const dashboardRoutes = await import('./routes/dashboard.routes');
  await app.register(dashboardRoutes.default, { prefix: `${apiPrefix}/dashboard` });

  const { companyRoutes } = await import('./routes/company.routes');
  await app.register(companyRoutes, { prefix: `${apiPrefix}/company` });

  const { subscriptionRoutes } = await import('./routes/subscription.routes');
  await app.register(subscriptionRoutes, { prefix: `${apiPrefix}/subscription` });

  if (process.env.NODE_ENV === 'production') {
    autoAttendanceService.initialize();
  }

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
