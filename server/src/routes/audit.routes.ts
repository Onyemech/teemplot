import { FastifyInstance } from 'fastify';
import { auditService } from '../services/AuditService';
import { z } from 'zod';
import { requireFeature } from '../middleware/subscription.middleware';

export default async function auditRoutes(fastify: FastifyInstance) {
  // Get company audit logs
  fastify.get('/', {
    preHandler: [fastify.authenticate, requireFeature('audit_logs')]
  }, async (request, reply) => {
    try {
      const { role, companyId } = request.user;

      // Only allow admins/owners/managers to view audit logs
      if (!['owner', 'admin', 'manager'].includes(role)) {
        return reply.code(403).send({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      // Parse query params
      const querySchema = z.object({
        limit: z.coerce.number().min(1).max(100).default(20),
        offset: z.coerce.number().min(0).default(0)
      });

      const { limit, offset } = querySchema.parse(request.query);

      const logs = await auditService.getCompanyAuditLogs(companyId, limit, offset);

      return reply.code(200).send({
        success: true,
        data: logs
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch audit logs'
      });
    }
  });
}
