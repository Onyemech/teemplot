import { FastifyInstance } from 'fastify';
import { birthdayService } from '../services/BirthdayService';
import { taskSchedulerService } from '../services/TaskSchedulerService';
import { logger } from '../utils/logger';

function verifyJobSecret(request: any): boolean {
  const expected = process.env.JOB_SECRET;
  if (!expected) return false;

  const provided = String(request.headers['x-job-secret'] || '');

  // Enhanced logging
  logger.info({
    providedHeader: provided,
    expectedHeader: expected,
    headers: request.headers,
  }, 'Verifying job secret');

  return provided === expected;
}

export async function jobsRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async () => {
    return { success: true };
  });

  fastify.get('/run-all', async (request, reply) => {
    if (!verifyJobSecret(request)) {
      return reply.code(401).send({ success: false, message: 'Unauthorized' });
    }

    const results = await Promise.allSettled([
      birthdayService.processDailyBirthdays(),
      taskSchedulerService.runOnce(),
    ]);

    const failures = results
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.status === 'rejected')
      .map(({ r, i }) => ({ job: i === 0 ? 'birthdays' : 'tasks', reason: (r as PromiseRejectedResult).reason?.message || 'failed' }));

    if (failures.length > 0) {
      logger.error({ failures }, 'One or more jobs failed');
      return reply.code(500).send({ success: false, failures });
    }

    return reply.send({ success: true });
  });

  fastify.post('/birthdays/run', async (request, reply) => {
    if (!verifyJobSecret(request)) {
      return reply.code(401).send({ success: false, message: 'Unauthorized' });
    }
    await birthdayService.processDailyBirthdays();
    return reply.send({ success: true });
  });

  fastify.post('/tasks/run', async (request, reply) => {
    if (!verifyJobSecret(request)) {
      return reply.code(401).send({ success: false, message: 'Unauthorized' });
    }
    await taskSchedulerService.runOnce();
    return reply.send({ success: true });
  });

  fastify.post('/run-all', async (request, reply) => {
    if (!verifyJobSecret(request)) {
      return reply.code(401).send({ success: false, message: 'Unauthorized' });
    }

    const results = await Promise.allSettled([
      birthdayService.processDailyBirthdays(),
      taskSchedulerService.runOnce(),
    ]);

    const failures = results
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.status === 'rejected')
      .map(({ r, i }) => ({ job: i === 0 ? 'birthdays' : 'tasks', reason: (r as PromiseRejectedResult).reason?.message || 'failed' }));

    if (failures.length > 0) {
      logger.error({ failures }, 'One or more jobs failed');
      return reply.code(500).send({ success: false, failures });
    }

    return reply.send({ success: true });
  });
}
