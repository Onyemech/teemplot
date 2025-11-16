import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { config_env } from './config/environment';
import { db } from './config/database';
import { authRoutes } from './presentation/routes/authRoutes';
import { userRoutes } from './presentation/routes/userRoutes';
import { companyRoutes } from './presentation/routes/companyRoutes';
import { attendanceRoutes } from './presentation/routes/attendanceRoutes';
import { taskRoutes } from './presentation/routes/taskRoutes';

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
  });

  await server.register(jwt, {
    secret: config_env.jwt.accessSecret,
    sign: {
      expiresIn: config_env.jwt.accessExpiresIn,
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
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  server.get('/health', async (request, reply) => {
    const dbConnected = await db.testConnection();
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

  server.setErrorHandler((error, request, reply) => {
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
