import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { config_env } from './config/environment';
import { DatabaseFactory } from './infrastructure/database/DatabaseFactory';
import { authRoutes } from './presentation/routes/authRoutes';
import { userRoutes } from './presentation/routes/userRoutes';
import { companyRoutes } from './presentation/routes/companyRoutes';
import { attendanceRoutes } from './presentation/routes/attendanceRoutes';

import { taskRoutes } from './presentation/routes/taskRoutes';
import { notificationRoutes } from './routes/notifications.routes';
import dashboardRoutes from './routes/dashboard.routes';
import { healthRoutes } from './routes/health.routes';

export async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      transport: config_env.isDevelopment
        ? {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
        : undefined,
    },
    requestIdLogLabel: 'reqId',
    disableRequestLogging: false,
    trustProxy: true,
  });

  await server.register(helmet, {
    contentSecurityPolicy: config_env.isProduction,
  });

  await server.register(cors, {
    origin: config_env.frontendUrl,
    credentials: true,
  });

  await server.register(rateLimit, {
    max: config_env.rateLimit.max,
    timeWindow: config_env.rateLimit.timeWindow,
    errorResponseBuilder: (request, context) => {
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded. You have 0 requests remaining. Please retry in ${context.after}.`,
        remaining: 0,
        limit: context.max,
        retryAfter: context.after
      };
    },
  });

  await server.register(jwt, {
    secret: config_env.jwt.accessSecret,
    sign: {
      expiresIn: config_env.jwt.accessExpiresIn,
    },
    // Configure JWT to read from cookies
    cookie: {
      cookieName: 'accessToken',
      signed: false,
    },
  });

  await server.register(cookie, {
    secret: config_env.jwt.refreshSecret,
    parseOptions: {},
  });

  await server.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  });

  server.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({
        success: false,
        message: 'Authentication required. Please log in.',
        error: 'UNAUTHORIZED'
      });
    }
  });

  server.get('/health', async (request, reply) => {
    const db = DatabaseFactory.getPrimaryDatabase();
    const dbConnected = await db.healthCheck();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'connected' : 'disconnected',
    };
  });

  await server.register(authRoutes, { prefix: '/api/auth' });
  await server.register(userRoutes, { prefix: '/api/users' });
  await server.register(companyRoutes, { prefix: '/api/companies' });
  await server.register(attendanceRoutes, { prefix: '/api/attendance' });
  await server.register(taskRoutes, { prefix: '/api/tasks' });
  await server.register(notificationRoutes, { prefix: '/api/notifications' });
  await server.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await server.register(healthRoutes); // Health check routes don't need prefix

  server.setErrorHandler((error: any, request, reply) => {
    request.log.error(error);

    if (error.validation) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: error.message,
        details: error.validation,
      });
    }

    if (error.statusCode) {
      return reply.code(error.statusCode).send({
        error: error.name,
        message: error.message,
      });
    }

    return reply.code(500).send({
      error: 'Internal Server Error',
      message: config_env.isDevelopment ? error.message : 'An unexpected error occurred',
    });
  });

  return server;
}
