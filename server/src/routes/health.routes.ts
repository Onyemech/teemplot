import { FastifyInstance } from 'fastify';
import { HealthCheckService } from '../services/HealthCheckService';
import { logger } from '../utils/logger';

const healthCheckService = new HealthCheckService();

export async function healthRoutes(fastify: FastifyInstance) {
  
  fastify.get('/health', async (request, reply) => {
    try {
      const health = await healthCheckService.performHealthCheck();
      
      // Return appropriate HTTP status based on overall health
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      
      return reply.code(statusCode).send({
        success: true,
        data: health
      });
    } catch (error) {
      logger.error({ error }, 'Health check failed:');
      
      return reply.code(503).send({
        success: false,
        message: 'Health check failed',
        data: { timestamp: new Date().toISOString() }
      });
    }
  });

  
  fastify.get('/health/ready', async (request, reply) => {
    try {
      // Liveness check - basic service availability
      const health = await healthCheckService.performHealthCheck();
      
      // For readiness, we require core services to be healthy
      const coreServicesHealthy = 
        health.services.database.status === 'healthy' &&
        health.services.email.status === 'healthy';
      
      return reply.code(coreServicesHealthy ? 200 : 503).send({
        success: coreServicesHealthy,
        data: {
          status: coreServicesHealthy ? 'ready' : 'not_ready',
          timestamp: new Date().toISOString(),
          services: {
            database: health.services.database.status,
            email: health.services.email.status
          }
        }
      });
    } catch (error) {
      logger.error({ error }, 'Readiness check failed:');
      
      return reply.code(503).send({
        success: false,
        status: 'not_ready',
        error: 'Readiness check failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  
  fastify.get('/health/live', async (request, reply) => {
    // Simple liveness check - just verify the service is running
    return reply.code(200).send({
      success: true,
      data: {
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: healthCheckService.getUptime(),
        version: healthCheckService.getVersion()
      }
    });
  });

  
  fastify.get('/health/detailed', async (request, reply) => {
    try {
      const health = await healthCheckService.performHealthCheck();
      
      // Detailed health check with additional system information
      const detailedHealth = {
        ...health,
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          memory: process.memoryUsage(),
          environment: process.env.NODE_ENV || 'development',
          pid: process.pid,
          ppid: process.ppid
        }
      };
      
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      
      return reply.code(statusCode).send({
        success: true,
        data: detailedHealth
      });
    } catch (error) {
      logger.error({ error }, 'Detailed health check failed:');
      
      return reply.code(503).send({
        success: false,
        message: 'Detailed health check failed',
        data: { timestamp: new Date().toISOString() }
      });
    }
  });
}
