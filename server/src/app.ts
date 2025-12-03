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

  // Intelligent CORS configuration
  await app.register(cors, {
    origin: (origin, callback) => {
      const { config_env } = require('./config/environment');
      const allowedOrigins = config_env.allowedOrigins;
      
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Check if origin is allowed
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
    maxAge: 86400, // 24 hours
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

  // Health check
  app.get('/health', async () => {
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
  });

  // Routes
  await app.register(authRoutes, { prefix: '/api/auth' });

  // Import and register onboarding routes
  const { onboardingRoutes } = await import('./routes/onboarding.routes');
  await app.register(onboardingRoutes, { prefix: '/api/onboarding' });

  // Import and register employees routes
  const { employeesRoutes } = await import('./routes/employees.routes');
  await app.register(employeesRoutes, { prefix: '/api/employees' });

  // Import and register super admin routes
  const { superAdminRoutes } = await import('./routes/superadmin.routes');
  await app.register(superAdminRoutes, { prefix: '/api/superadmin' });

  // Import and register files routes
  const filesRoutes = await import('./routes/files.routes');
  await app.register(filesRoutes.default, { prefix: '/api/files' });

  // Import and register attendance routes
  const attendanceRoutes = await import('./routes/attendance.routes');
  await app.register(attendanceRoutes.default, { prefix: '/api/attendance' });

  // Import and register company settings routes
  const companySettingsRoutes = await import('./routes/company-settings.routes');
  await app.register(companySettingsRoutes.default, { prefix: '/api/company-settings' });

  // Import and register admin address audit routes
  const adminAddressAuditRoutes = await import('./routes/admin-address-audit.routes');
  await app.register(adminAddressAuditRoutes.default, { prefix: '/api/admin/address-audit' });

  // Import and register dashboard routes
  const dashboardRoutes = await import('./routes/dashboard.routes');
  await app.register(dashboardRoutes.default, { prefix: '/api/dashboard' });

  // Import and register company routes
  const { companyRoutes } = await import('./routes/company.routes');
  await app.register(companyRoutes, { prefix: '/api/company' });

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
