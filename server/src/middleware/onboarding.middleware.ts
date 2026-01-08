import { FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';

/**
 * Middleware to ensure the user's company has completed onboarding.
 * Blocks access to dashboard and business logic routes for incomplete accounts.
 */
export async function requireOnboarding(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    
    if (!user || !user.companyId) {
      // Should be caught by authenticate middleware, but safety first
      return reply.code(401).send({ success: false, message: 'Unauthorized' });
    }

    const db = DatabaseFactory.getPrimaryDatabase();
    
    const result = await db.query(
      'SELECT onboarding_completed FROM companies WHERE id = $1',
      [user.companyId]
    );

    const company = result.rows[0];

    if (!company) {
      return reply.code(404).send({ success: false, message: 'Company not found' });
    }

    // Check if onboarding is completed
    if (!company.onboarding_completed) {
      return reply.code(403).send({ 
        success: false, 
        message: 'Onboarding incomplete. Please complete company setup.',
        code: 'ONBOARDING_REQUIRED',
        requiresOnboarding: true
      });
    }
  } catch (error) {
    request.log.error(error, 'Error in requireOnboarding middleware');
    // If column doesn't exist or DB error, fail closed
    return reply.code(500).send({ success: false, message: 'Internal server error during authorization' });
  }
}
