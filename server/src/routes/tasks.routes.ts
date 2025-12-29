import { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger';
import { taskService } from '../services/TaskService';
import { EventEmitter } from 'events';

const taskEvents = new EventEmitter();

export default async function tasksRoutes(fastify: FastifyInstance) {
  
  // SSE endpoint
  fastify.get('/updates', {
    preHandler: [fastify.authenticate],
  }, (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const sendUpdate = (data: any) => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    taskEvents.on('task_update', sendUpdate);

    request.raw.on('close', () => {
      taskEvents.off('task_update', sendUpdate);
    });
  });

  // Get department tasks
  fastify.get('/department', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const tasks = await taskService.getDepartmentTasks(request.user);
      return reply.send({
        success: true,
        data: tasks
      });
    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Failed to fetch department tasks');
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to fetch department tasks'
      });
    }
  });

  // Create task
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const task = await taskService.createTask(request.body as any, request.user);
      taskEvents.emit('task_update', { type: 'TASK_UPDATE', task });
      return reply.code(201).send({
        success: true,
        data: task,
        message: 'Task created successfully'
      });
    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Failed to create task');
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to create task'
      });
    }
  });

  // Get all tasks (with filters)
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { tasks, pagination } = await taskService.getTasks(request.query as any, request.user);
      return reply.send({
        success: true,
        data: {
          tasks,
          pagination
        }
      });
    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Failed to fetch tasks');
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to fetch tasks'
      });
    }
  });

  // Get single task
  fastify.get('/:taskId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { taskId } = request.params as { taskId: string };
      const task = await taskService.getTask(taskId, request.user);
      return reply.send({
        success: true,
        data: task
      });
    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Failed to fetch task');
      return reply.code(error.message === 'Task not found' ? 404 : 500).send({
        success: false,
        message: error.message || 'Failed to fetch task'
      });
    }
  });

  // Update task
  fastify.put('/:taskId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { taskId } = request.params as { taskId: string };
      const task = await taskService.updateTask(taskId, request.body as any, request.user);
      return reply.send({
        success: true,
        data: task,
        message: 'Task updated successfully'
      });
    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Failed to update task');
      return reply.code(error.message.includes('not found') ? 404 : 500).send({
        success: false,
        message: error.message || 'Failed to update task'
      });
    }
  });

  // Mark task as complete (by employee)
  fastify.post('/:taskId/complete', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { taskId } = request.params as { taskId: string };
      const task = await taskService.markTaskComplete(taskId, request.body as any, request.user);
      return reply.send({
        success: true,
        data: task,
        message: 'Task marked as complete and sent for review'
      });
    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Failed to mark task complete');
      return reply.code(error.message.includes('not found') ? 404 : 500).send({
        success: false,
        message: error.message || 'Failed to mark task as complete'
      });
    }
  });

  // Review task (by owner/admin)
  fastify.post('/:taskId/review', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { taskId } = request.params as { taskId: string };
      const reviewData = request.body as { approved: boolean; feedback?: string };
      const task = await taskService.reviewTask(taskId, reviewData, request.user);
      
      taskEvents.emit('task_update', { type: 'TASK_UPDATE', task });
      
      const message = reviewData.approved ? 'Task approved' : 'Task rejected and sent back';
      return reply.send({
        success: true,
        data: task,
        message
      });
    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Failed to review task');
      return reply.code(error.message.includes('not found') ? 404 : 500).send({
        success: false,
        message: error.message || 'Failed to review task'
      });
    }
  });

  // Get tasks awaiting review
  fastify.get('/awaiting-review', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const tasks = await taskService.getAwaitingReview(request.user);
      return reply.send({
        success: true,
        data: tasks
      });
    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Failed to fetch tasks awaiting review');
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to fetch tasks awaiting review'
      });
    }
  });

  // Delete task
  fastify.delete('/:taskId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { taskId } = request.params as { taskId: string };
      
      await taskService.deleteTask(taskId, request.user);

      return reply.send({
        success: true,
        message: 'Task deleted successfully'
      });

    } catch (error: any) {
      logger.error({ err: error, userId: request.user?.userId }, 'Failed to delete task');
      return reply.code(500).send({
        success: false,
        message: 'Failed to delete task'
      });
    }
  });
}
