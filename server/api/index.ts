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
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: false,
          translateTime: 'SYS:standard',
        }
      }
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

  // Health check
  fastify.get('/health', async () => {
    return { 
      success: true, 
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production'
    };
  });

  // Register routes
  await fastify.register(authRoutes, { prefix: '/auth' });
  await fastify.register(onboardingRoutes, { prefix: '/onboarding' });
  await fastify.register(attendanceRoutes, { prefix: '/attendance' });
  await fastify.register(tasksRoutes, { prefix: '/tasks' });
  await fastify.register(leaveRoutes, { prefix: '/leave' });
  await fastify.register(dashboardRoutes, { prefix: '/dashboard' });
  await fastify.register(companySettingsRoutes, { prefix: '/company-settings' });
  await fastify.register(employeesRoutes, { prefix: '/employees' });
  await fastify.register(filesRoutes, { prefix: '/files' });
  await fastify.register(adminAddressAuditRoutes, { prefix: '/admin/address-audit' });

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
