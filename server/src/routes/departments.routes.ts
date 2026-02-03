
import { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger';
import { departmentService } from '../services/DepartmentService';
import { requireFeature } from '../middleware/subscription.middleware';

export default async function departmentRoutes(fastify: FastifyInstance) {
  
  // Get all departments
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const depts = await departmentService.getDepartments(request.user);
      return reply.send({ success: true, data: depts });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to fetch departments');
      return reply.code(500).send({ success: false, message: error.message });
    }
  });

  // Get single department
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const dept = await departmentService.getDepartment(id, request.user);
      return reply.send({ success: true, data: dept });
    } catch (error: any) {
      return reply.code(error.message === 'Department not found' ? 404 : 500)
        .send({ success: false, message: error.message });
    }
  });

  // Create department
  fastify.post('/', {
    preHandler: [fastify.authenticate], // Add role check inside service or middleware
  }, async (request, reply) => {
    try {
      const dept = await departmentService.createDepartment(request.body as any, request.user);
      return reply.code(201).send({ success: true, data: dept, message: 'Department created successfully' });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to create department');
      return reply.code(400).send({ success: false, message: error.message });
    }
  });

  // Update department
  fastify.put('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const dept = await departmentService.updateDepartment(id, request.body as any, request.user);
      return reply.send({ success: true, data: dept, message: 'Department updated successfully' });
    } catch (error: any) {
      return reply.code(400).send({ success: false, message: error.message });
    }
  });

  // Delete department
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await departmentService.deleteDepartment(id, request.user);
      return reply.send({ success: true, message: 'Department deleted successfully' });
    } catch (error: any) {
      return reply.code(400).send({ success: false, message: error.message });
    }
  });

  // Add member
  fastify.post('/:id/members', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { userId } = request.body as { userId: string };
      await departmentService.addMember(id, userId, request.user);
      return reply.send({ success: true, message: 'Member added successfully' });
    } catch (error: any) {
      return reply.code(400).send({ success: false, message: error.message });
    }
  });

  // Remove member
  fastify.delete('/:id/members/:userId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id, userId } = request.params as { id: string, userId: string };
      await departmentService.removeMember(id, userId, request.user);
      return reply.send({ success: true, message: 'Member removed successfully' });
    } catch (error: any) {
      return reply.code(400).send({ success: false, message: error.message });
    }
  });
}
