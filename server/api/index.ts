import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';

import { authRoutes } from '../src/routes/auth.routes';
import { onboardingRoutes } from '../src/routes/onboarding.routes';
import attendanceRoutes from '../src/routes/attendance.routes';
import tasksRoutes from '../src/routes/tasks.routes';
import leaveRoutes from '../src/routes/leave.routes';
import dashboardRoutes from '../src/routes/dashboard.routes';
import companySettingsRoutes from '../src/routes/company-settings.routes';
import { employeesRoutes } from '../src/routes/employees.routes';
import { companyRoutes } from '../src/routes/company.routes';
import filesRoutes from '../src/routes/files.routes';
import adminAddressAuditRoutes from '../src/routes/admin-address-audit.routes';
import userRoutes from '../src/routes/user.routes';
import auditRoutes from '../src/routes/audit.routes';
import { analyticsRoutes } from '../src/routes/analytics.routes';
import { notificationRoutes } from '../src/routes/notifications.routes';
import locationRoutes from '../src/routes/location.routes';
import departmentRoutes from '../src/routes/departments.routes';
import { subscriptionRoutes } from '../src/routes/subscription.routes';
import { superAdminRoutes } from '../src/routes/superadmin.routes';
import { jobsRoutes } from '../src/routes/jobs.routes';
import multipart from '@fastify/multipart';

let app: any = null;

export async function buildServerlessApp() {
  const fastify = Fastify({
    logger: {
      level: 'info',
    },
    trustProxy: true,
  });

  await fastify.register(cors, {
    origin: (origin, callback) => {
      const allowedOrigins = [
        'https://teemplot.com',
        'https://www.teemplot.com',
        'https://app.teemplot.com',
        'https://api.teemplot.com',
        'https://teemplot.vercel.app',
        'https://teemplot-frontend.vercel.app',
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5000',
      ];

      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        callback(null, origin);
      } else {
        console.warn('[CORS] Origin not allowed:', origin);
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires', 'X-Requested-With', 'X-CSRF-Token'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400,
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  });

  // Cookie plugin (must be registered before JWT)
  await fastify.register(cookie, {
    secret: process.env.COOKIE_SECRET || process.env.JWT_ACCESS_SECRET || 'dev_secret_change_in_production',
  });

  // JWT plugin with cookie support
  await fastify.register(jwt, {
    secret: process.env.JWT_ACCESS_SECRET || 'your-secret-key-change-in-production',
    cookie: {
      cookieName: 'accessToken',
      signed: false
    }
  });

  // Authentication decorator
  fastify.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ success: false, message: 'Unauthorized' });
    }
  });

  // Health check (both with and without /api prefix)
  fastify.get('/health', async () => {
    return {
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      routes: 'Registered'
    };
  });

  fastify.get('/api/health', async () => {
    return {
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      routes: 'Registered'
    };
  });

  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(onboardingRoutes, { prefix: '/api/onboarding' });
  await fastify.register(attendanceRoutes, { prefix: '/api/attendance' });
  await fastify.register(tasksRoutes, { prefix: '/api/tasks' });
  await fastify.register(leaveRoutes, { prefix: '/api/leave' });
  await fastify.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await fastify.register(companySettingsRoutes, { prefix: '/api/company-settings' });
  await fastify.register(employeesRoutes, { prefix: '/api/employees' });
  await fastify.register(companyRoutes, { prefix: '/api/company' });
  await fastify.register(filesRoutes, { prefix: '/api/files' });
  await fastify.register(adminAddressAuditRoutes, { prefix: '/api/admin/address-audit' });
  await fastify.register(userRoutes, { prefix: '/api/user' });
  await fastify.register(auditRoutes, { prefix: '/api/audit' });
  await fastify.register(analyticsRoutes, { prefix: '/api/analytics' });
  await fastify.register(notificationRoutes, { prefix: '/api/notifications' });
  await fastify.register(locationRoutes, { prefix: '/api/location' });
  await fastify.register(departmentRoutes, { prefix: '/api/departments' });
  await fastify.register(subscriptionRoutes, { prefix: '/api/subscription' });
  await fastify.register(multipart);
  await fastify.register(superAdminRoutes, { prefix: '/api/super-admin' });
  await fastify.register(jobsRoutes, { prefix: '/api/jobs' });

  // Import and register employee invitation routes
  const { employeeInvitationRoutes } = await import('../src/routes/employee-invitation.routes');
  await fastify.register(employeeInvitationRoutes, { prefix: '/api/employee-invitations' });

  // Debug route to list all routes
  fastify.get('/api/debug/routes', async () => {
    return {
      success: true,
      routes: fastify.printRoutes({ commonPrefix: false })
    };
  });

  fastify.setNotFoundHandler((request, reply) => {
    console.log('[404] Route not found:', request.method, request.url);
    reply.code(404).send({
      success: false,
      message: 'Route not found',
      path: request.url,
      method: request.method,
      availableRoutes: 'Check /api/debug/routes for all routes'
    });
  });

  return fastify;
}

async function handler(req: any, res: any) {
  try {
    if (!app) {
      console.log('[Serverless] Initializing Fastify app...');
      app = await buildServerlessApp();
      await app.ready();
      console.log('[Serverless] Fastify app ready');
      console.log('[Serverless] Registered routes:', app.printRoutes());
    }

    // Handle the request
    app.server.emit('request', req, res);
  } catch (error) {
    console.error('[Serverless] Function error:', error);

    // Make sure response hasn't been sent
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      }));
    }
  }
}

export default handler;
