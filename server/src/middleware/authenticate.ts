import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Authentication Middleware
 * Validates JWT from httpOnly cookie and attaches user to request
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Verify JWT from cookie (fastify-jwt automatically reads from cookie if configured)
    await request.jwtVerify();
    
    // User data is now available in request.user
    // Contains: { userId, companyId, email, role, iat, exp }
    
  } catch (err) {
    // Token invalid or expired
    reply.code(401).send({
      success: false,
      message: 'Authentication required. Please log in.',
      error: 'UNAUTHORIZED'
    });
  }
}

/**
 * Optional Authentication Middleware
 * Doesn't fail if no token, just doesn't attach user
 */
export async function optionalAuthenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    // Silently fail - route can check if request.user exists
  }
}
