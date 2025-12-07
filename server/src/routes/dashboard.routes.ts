import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DashboardService } from '../services/DashboardService';

const dashboardService = new DashboardService();

export default async function dashboardRoutes(fastify: FastifyInstance) {
  // Get dashboard statistics
  fastify.get('/stats', {
    onRequest: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const stats = await dashboardService.getDashboardStats(userId);
      return reply.send(stats);
    } catch (error: any) {
      fastify.log.error('Error fetching dashboard stats:', error);
      return reply.status(500).send({ 
        success: false,
        error: error.message || 'Failed to fetch dashboard stats' 
      });
    }
  });

  // Get recent orders
  fastify.get('/recent-orders', {
    onRequest: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const orders = await dashboardService.getRecentOrders(userId);
      return reply.send(orders);
    } catch (error: any) {
      fastify.log.error('Error fetching recent orders:', error);
      return reply.status(500).send({ 
        success: false,
        error: error.message || 'Failed to fetch recent orders' 
      });
    }
  });

  // Get recent leads
  fastify.get('/recent-leads', {
    onRequest: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const leads = await dashboardService.getRecentLeads(userId);
      return reply.send(leads);
    } catch (error: any) {
      fastify.log.error('Error fetching recent leads:', error);
      return reply.status(500).send({ 
        success: false,
        error: error.message || 'Failed to fetch recent leads' 
      });
    }
  });

  // Get subscription info
  fastify.get('/subscription', {
    onRequest: [fastify.authenticate]
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
}
