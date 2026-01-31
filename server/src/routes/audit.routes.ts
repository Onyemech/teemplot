import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { auditService } from '../services/AuditService';
import { requireOnboarding } from '../middleware/onboarding.middleware';

export default async function auditRoutes(fastify: FastifyInstance) {
  fastify.get('/', {
    onRequest: [fastify.authenticate],
    preHandler: [requireOnboarding]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const companyId = (request.user as any).companyId;
      const { page, limit, userId, action, entityType, startDate, endDate } = request.query as any;
      
      const result = await auditService.getAuditLogs(companyId, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        userId,
        action,
        entityType,
        startDate,
        endDate
      });
      
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      fastify.log.error('Error fetching audit logs:', error);
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to fetch audit logs'
      });
    }
  });
}
