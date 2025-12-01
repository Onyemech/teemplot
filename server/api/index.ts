import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';

// Import routes
import { authRoutes } from '../src/routes/auth.routes';
import { onboardingRoutes } from '../src/routes/onboarding.routes';
import attendanceRoutes from '../src/routes/attendance.routes';
import tasksRoutes from '../src/routes/tasks.routes';
import leaveRoutes from '../src/routes/leave.routes';
import dashboardRoutes from '../src/routes/dashboard.routes';
import companySettingsRoutes from '../src/routes/company-settings.routes';
import { employeesRoutes } from '../src/routes/employees.routes';
import filesRoutes from '../src/routes/files.routes';
import adminAddressAuditRoutes from '../src/routes/admin-address-audit.routes';

let app: any = null;

async function buildServerlessApp() {
  const fastify = Fastify({
    logger: {
      level: 'info',
      // Simple JSON logging for serverless (no transports)
    },
    trustProxy: true,
  });

  // Register plugins
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  });

  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
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

  // Register routes with /api prefix
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(onboardingRoutes, { prefix: '/api/onboarding' });
  await fastify.register(attendanceRoutes, { prefix: '/api/attendance' });
  await fastify.register(tasksRoutes, { prefix: '/api/tasks' });
  await fastify.register(leaveRoutes, { prefix: '/api/leave' });
  await fastify.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await fastify.register(companySettingsRoutes, { prefix: '/api/company-settings' });
  await fastify.register(employeesRoutes, { prefix: '/api/employees' });
  await fastify.register(filesRoutes, { prefix: '/api/files' });
  await fastify.register(adminAddressAuditRoutes, { prefix: '/api/admin/address-audit' });

  // 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      success: false,
      message: 'Route not found',
      path: request.url,
      method: request.method
    });
  });

  return fastify;
}

export default async function handler(req: any, res: any) {
  try {
    if (!app) {
      console.log('Initializing Fastify app...');
      app = await buildServerlessApp();
      await app.ready();
      console.log('Fastify app ready');
    }

    // Handle the request
    await app.ready();
    app.server.emit('request', req, res);
  } catch (error) {
    console.error('Serverless function error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
}
