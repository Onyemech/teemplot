import { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger';
import { requireFeature } from '../middleware/subscription.middleware';
import { LeaveService } from '../services/LeaveService';

export default async function leaveRoutes(fastify: FastifyInstance) {
  const leaveService = new LeaveService();

  // --- Leave Types (Owner Only) ---

  fastify.get('/types', {
    preHandler: [fastify.authenticate, requireFeature('leave')],
  }, async (request, reply) => {
    try {
      const { companyId } = request.user;
      const types = await leaveService.getLeaveTypes(companyId);
      return reply.send({ success: true, data: types });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to fetch leave types');
      return reply.code(500).send({ success: false, message: error.message });
    }
  });

  fastify.post('/types', {
    preHandler: [fastify.authenticate, requireFeature('leave')],
  }, async (request, reply) => {
    try {
      const { companyId, role } = request.user;
      if (role !== 'owner' && role !== 'admin') {
        return reply.code(403).send({ success: false, message: 'Only owners/admins can manage leave types' });
      }
      const type = await leaveService.createLeaveType(companyId, request.body);
      return reply.code(201).send({ success: true, data: type });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to create leave type');
      return reply.code(500).send({ success: false, message: error.message });
    }
  });

  fastify.put('/types/:id', {
    preHandler: [fastify.authenticate, requireFeature('leave')],
  }, async (request, reply) => {
    try {
      const { companyId, role } = request.user;
      const { id } = request.params as any;
      if (role !== 'owner' && role !== 'admin') {
        return reply.code(403).send({ success: false, message: 'Only owners/admins can manage leave types' });
      }
      const type = await leaveService.updateLeaveType(companyId, id, request.body);
      return reply.send({ success: true, data: type });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to update leave type');
      return reply.code(500).send({ success: false, message: error.message });
    }
  });

  fastify.delete('/types/:id', {
    preHandler: [fastify.authenticate, requireFeature('leave')],
  }, async (request, reply) => {
    try {
      const { companyId, role } = request.user;
      const { id } = request.params as any;
      if (role !== 'owner' && role !== 'admin') {
        return reply.code(403).send({ success: false, message: 'Only owners/admins can manage leave types' });
      }
      await leaveService.deleteLeaveType(companyId, id);
      return reply.send({ success: true, message: 'Leave type deleted' });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to delete leave type');
      return reply.code(500).send({ success: false, message: error.message });
    }
  });

  // --- Balances ---

  fastify.get('/balances/all', {
    preHandler: [fastify.authenticate, requireFeature('leave')],
  }, async (request, reply) => {
    try {
      const { companyId, role } = request.user;
      if (role !== 'owner' && role !== 'admin') {
        return reply.code(403).send({ success: false, message: 'Only owners/admins can view all balances' });
      }
      const balances = await leaveService.getAllEmployeeBalances(companyId);
      return reply.send({ success: true, data: balances });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to fetch all balances');
      return reply.code(500).send({ success: false, message: error.message });
    }
  });

  fastify.put('/balances/:id', {
    preHandler: [fastify.authenticate, requireFeature('leave')],
  }, async (request, reply) => {
    try {
      const { companyId, role } = request.user;
      const { id } = request.params as any;
      if (role !== 'owner' && role !== 'admin') {
        return reply.code(403).send({ success: false, message: 'Only owners/admins can update balances' });
      }
      const balance = await leaveService.updateBalance(companyId, id, request.body);
      return reply.send({ success: true, data: balance });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to update balance');
      return reply.code(500).send({ success: false, message: error.message });
    }
  });

  fastify.post('/balances/reset', {
    preHandler: [fastify.authenticate, requireFeature('leave')],
  }, async (request, reply) => {
    try {
      const { companyId, role } = request.user;
      if (role !== 'owner' && role !== 'admin') {
        return reply.code(403).send({ success: false, message: 'Only owners/admins can reset balances' });
      }
      await leaveService.bulkResetBalances(companyId, request.body);
      return reply.send({ success: true, message: 'Balances reset successfully' });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to reset balances');
      return reply.code(500).send({ success: false, message: error.message });
    }
  });

  fastify.get('/balances', {
    preHandler: [fastify.authenticate, requireFeature('leave')],
  }, async (request, reply) => {
    try {
      const { companyId, userId } = request.user;
      // Ensure balances exist
      await leaveService.initializeBalances(companyId, userId);
      const balances = await leaveService.getEmployeeBalance(companyId, userId);
      return reply.send({ success: true, data: balances });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to fetch balances');
      return reply.code(500).send({ success: false, message: error.message });
    }
  });

  // --- Requests ---

  fastify.post('/request', {
    preHandler: [fastify.authenticate, requireFeature('leave')],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user;
      
      if (role === 'owner') {
        return reply.code(400).send({ success: false, message: 'Owners do not need to request leave' });
      }

      const leaveRequest = await leaveService.createLeaveRequest(companyId, userId, request.body);
      return reply.code(201).send({ success: true, data: leaveRequest });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to create leave request');
      return reply.code(400).send({ success: false, message: error.message });
    }
  });

  fastify.get('/requests', {
    preHandler: [fastify.authenticate, requireFeature('leave')],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user;
      const filters = request.query as any || {};

      // Role-based filtering
      if (role === 'employee') {
        filters.employeeId = userId;
      }
      // Managers/Admins see all (or filtered by department in service if implemented)
      // For now, allow viewing all for managers/admins/owners as per basic requirement

      const requests = await leaveService.getLeaveRequests(companyId, filters);
      return reply.send({ success: true, data: requests });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to fetch leave requests');
      return reply.code(500).send({ success: false, message: error.message });
    }
  });

  fastify.post('/requests/:id/review', {
    preHandler: [fastify.authenticate, requireFeature('leave')],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user;
      const { id } = request.params as any;
      const { approved, reason } = request.body as any;

      if (role === 'employee') {
        return reply.code(403).send({ success: false, message: 'Employees cannot review requests' });
      }

      // In a real app, verify manager's department here. 
      // Assuming 'manager', 'department_head', 'admin', 'owner' are valid reviewers.

      const status = approved ? 'approved' : 'rejected';
      const result = await leaveService.reviewLeaveRequest(companyId, id, userId, status, reason);
      
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to review leave request');
      return reply.code(400).send({ success: false, message: error.message });
    }
  });
}
