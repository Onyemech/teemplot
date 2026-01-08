import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { companyService } from '../services/CompanyService';

export async function companyRoutes(fastify: FastifyInstance) {
  // Get company info
  fastify.get('/info', {
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const companyId = (request.user as any).companyId;

      if (!userId || !companyId) {
        return reply.code(401).send({ success: false, message: 'Unauthorized' });
      }

      const companyInfo = await companyService.getCompanyInfo(userId, companyId);

      return reply.send({
        success: true,
        data: companyInfo
      });
    } catch (error: any) {
      return reply.code(error.message === 'User not found' || error.message === 'Company not found' ? 404 : 500).send({
        success: false,
        message: error.message || 'Failed to get company info'
      });
    }
  });

  // Get subscription status
  fastify.get('/subscription-status', {
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const companyId = (request.user as any).companyId;

      if (!userId || !companyId) {
        return reply.code(401).send({ success: false, message: 'Unauthorized' });
      }

      const status = await companyService.getSubscriptionStatus(userId, companyId);

      return reply.send({
        success: true,
        data: status
      });
    } catch (error: any) {
      fastify.log.error('Failed to fetch subscription status:', error);
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });
}
