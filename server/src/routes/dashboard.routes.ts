import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DashboardService } from '../services/DashboardService';
import { requireOnboarding } from '../middleware/onboarding.middleware';

const dashboardService = new DashboardService();

export default async function dashboardRoutes(fastify: FastifyInstance) {
  // Get dashboard statistics
  fastify.get('/stats', {
    onRequest: [fastify.authenticate],
    preHandler: [requireOnboarding]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const companyId = (request.user as any).companyId;
      const stats = await dashboardService.getDashboardStats(userId, companyId);
      return reply.code(200).send({ success: true, data: stats });
    } catch (error: any) {
      fastify.log.error('Error fetching dashboard stats:', error);
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to fetch dashboard stats'
      });
    }
  });

  // Get recent orders
  fastify.get('/recent-orders', {
    onRequest: [fastify.authenticate],
    preHandler: [requireOnboarding]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const companyId = (request.user as any).companyId;
      const orders = await dashboardService.getRecentOrders(userId, companyId);
      return reply.code(200).send({ success: true, data: orders });
    } catch (error: any) {
      fastify.log.error('Error fetching recent orders:', error);
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to fetch recent orders'
      });
    }
  });

  // Get recent leads
  fastify.get('/recent-leads', {
    onRequest: [fastify.authenticate],
    preHandler: [requireOnboarding]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const companyId = (request.user as any).companyId;
      const leads = await dashboardService.getRecentLeads(userId, companyId);
      return reply.code(200).send({ success: true, data: leads });
    } catch (error: any) {
      fastify.log.error('Error fetching recent leads:', error);
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to fetch recent leads'
      });
    }
  });

  // Get subscription info
  fastify.get('/subscription', {
    onRequest: [fastify.authenticate],
    preHandler: [requireOnboarding]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const companyId = (request.user as any).companyId;
      const { getSubscriptionInfo } = await import('../middleware/subscription.middleware');
      const subscriptionInfo = await getSubscriptionInfo(companyId);

      return reply.send({
        success: true,
        data: subscriptionInfo
      });
    } catch (error: any) {
      fastify.log.error('Error fetching subscription info:', error);
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to fetch subscription info'
      });
    }
  });
  // Get recent activity (HR context)
  fastify.get('/recent-activity', {
    onRequest: [fastify.authenticate],
    preHandler: [requireOnboarding]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const companyId = (request.user as any).companyId;
      const { auditService } = await import('../services/AuditService');

      // Fetch actual audit logs
      const activity = await auditService.getCompanyAuditLogs(companyId, 10);

      return reply.code(200).send({ success: true, data: activity });
    } catch (error: any) {
      fastify.log.error('Error fetching recent activity:', error);
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to fetch recent activity'
      });
    }
  });

  // Get employee stats
  fastify.get('/employee-stats', {
    onRequest: [fastify.authenticate],
    preHandler: [requireOnboarding]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Placeholder for employee stats
      return reply.code(200).send({ success: true, data: {} });
    } catch (error: any) {
      fastify.log.error('Error fetching employee stats:', error);
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to fetch employee stats'
      });
    }
  });
}
