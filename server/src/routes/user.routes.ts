import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';

const db = DatabaseFactory.getPrimaryDatabase();

export async function userRoutes(fastify: FastifyInstance) {
  // Update current user profile
  fastify.patch('/profile', {
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      const { firstName, lastName, avatarUrl } = request.body as any;

      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (firstName !== undefined) {
        updateFields.push(`first_name = $${paramCount++}`);
        values.push(firstName);
      }
      if (lastName !== undefined) {
        updateFields.push(`last_name = $${paramCount++}`);
        values.push(lastName);
      }
      if (avatarUrl !== undefined) {
        updateFields.push(`avatar_url = $${paramCount++}`);
        values.push(avatarUrl);
      }

      if (updateFields.length === 0) {
        return reply.code(400).send({ success: false, message: 'No fields to update' });
      }

      values.push(user.userId);
      const updateQuery = await db.query(
        `UPDATE users 
         SET ${updateFields.join(', ')}, updated_at = NOW()
         WHERE id = $${paramCount} AND deleted_at IS NULL
         RETURNING id`,
        values
      );

      if (!updateQuery.rows[0]) {
        return reply.code(404).send({ success: false, message: 'User not found' });
      }

      return reply.send({ success: true, message: 'Profile updated successfully' });
    } catch (error: any) {
      fastify.log.error('Failed to update profile:', error);
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });
}
