import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { requireOnboarding } from '../middleware/onboarding.middleware';

const db = DatabaseFactory.getPrimaryDatabase();

export async function companyLocationsRoutes(fastify: FastifyInstance) {
  // GET / - List locations
  fastify.get('/', {
    preHandler: [fastify.authenticate, requireOnboarding]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      const result = await db.query(
        `SELECT * FROM company_locations WHERE company_id = $1 ORDER BY created_at DESC`,
        [user.companyId]
      );
      return reply.send({ success: true, data: result.rows });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
  });

  // POST / - Create location
  fastify.post('/', {
    preHandler: [fastify.authenticate, requireOnboarding]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      if (user.role !== 'owner' && user.role !== 'admin') {
        return reply.code(403).send({ success: false, message: 'Forbidden' });
      }
      const { name, address, latitude, longitude, geofence_radius_meters } = request.body as any;
      
      const result = await db.query(
        `INSERT INTO company_locations (company_id, name, address, latitude, longitude, geofence_radius_meters)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [user.companyId, name, address, latitude, longitude, geofence_radius_meters || 100]
      );
      return reply.send({ success: true, data: result.rows[0] });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
  });

  // DELETE /:id - Delete location
  fastify.delete('/:id', {
      preHandler: [fastify.authenticate, requireOnboarding]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      const { id } = request.params as any;
      if (user.role !== 'owner' && user.role !== 'admin') {
          return reply.code(403).send({ success: false, message: 'Forbidden' });
      }
      
      const result = await db.query(
          `DELETE FROM company_locations WHERE id = $1 AND company_id = $2 RETURNING id`,
          [id, user.companyId]
      );
      
      if (result.rowCount === 0) {
          return reply.code(404).send({ success: false, message: 'Location not found' });
      }
      
      return reply.send({ success: true, message: 'Deleted' });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
  });
  
  // Toggle Active Status
  fastify.patch('/:id/toggle', {
      preHandler: [fastify.authenticate, requireOnboarding]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      const { id } = request.params as any;
      if (user.role !== 'owner' && user.role !== 'admin') {
          return reply.code(403).send({ success: false, message: 'Forbidden' });
      }
      
      const result = await db.query(
          `UPDATE company_locations SET is_active = NOT is_active WHERE id = $1 AND company_id = $2 RETURNING *`,
          [id, user.companyId]
      );
      
      if (result.rowCount === 0) {
          return reply.code(404).send({ success: false, message: 'Location not found' });
      }
      
      return reply.send({ success: true, data: result.rows[0] });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
  });
}
