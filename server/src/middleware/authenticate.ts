import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Authentication Middleware
 * Validates JWT from httpOnly cookie and attaches user to request
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Verify JWT from cookie (fastify-jwt automatically reads from cookie if configured)
    await request.jwtVerify();
    
    
  } catch (err) {
    reply.code(401).send({
      success: false,
      message: 'Authentication required. Please log in.',
      error: 'UNAUTHORIZED'
    });
  }
}


export async function optionalAuthenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
  }
}
