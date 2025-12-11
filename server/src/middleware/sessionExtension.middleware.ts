import { FastifyRequest, FastifyReply } from 'fastify';
import { setAuthCookies, createAccessTokenPayload, createRefreshTokenPayload } from '../utils/jwt';
import { logger } from '../utils/logger';


export async function extendSessionForCriticalOperation(
  request: FastifyRequest, 
  reply: FastifyReply
) {
  try {
    // Only extend if user is authenticated
    if (!request.user) {
      return; // Let the authenticate middleware handle this
    }

    const { userId, companyId, email, role } = request.user;

    // Create new tokens with fresh expiration
    const accessTokenPayload = createAccessTokenPayload({
      id: userId,
      companyId,
      email,
      role
    });

    const refreshTokenPayload = createRefreshTokenPayload(userId);

    // Generate new tokens
    const accessToken = await reply.jwtSign(accessTokenPayload, { expiresIn: '2h' });
    const refreshToken = await reply.jwtSign(refreshTokenPayload, { expiresIn: '30d' });

    // Set new cookies with extended expiration
    const isProduction = process.env.NODE_ENV === 'production';
    setAuthCookies(reply, accessToken, refreshToken, isProduction);

    logger.info({
      userId,
      companyId,
      operation: 'session_extended',
      path: request.url
    }, 'Session extended for critical operation');

  } catch (error: any) {
    logger.error({
      error: error.message,
      userId: request.user?.userId,
      path: request.url
    }, 'Failed to extend session for critical operation');
    
    // Don't fail the request, just log the error
  }
}

/**
 * Middleware to check session health and refresh if needed
 * Use this for long-running operations
 */
export async function ensureSessionHealth(
  request: FastifyRequest, 
  reply: FastifyReply
) {
  try {
    if (!request.user) {
      return;
    }

    // Check if token is close to expiry (within 30 minutes)
    const token = request.cookies.accessToken;
    if (!token) {
      return;
    }

    // Decode token to check expiry (without verification to avoid errors)
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const expiryTime = decoded.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const timeUntilExpiry = expiryTime - currentTime;

    // If token expires within 30 minutes, refresh it
    if (timeUntilExpiry < 30 * 60 * 1000) {
      await extendSessionForCriticalOperation(request, reply);
      
      logger.info({
        userId: request.user.userId,
        timeUntilExpiry: Math.round(timeUntilExpiry / 1000 / 60),
        operation: 'proactive_session_refresh'
      }, 'Session proactively refreshed');
    }

  } catch (error: any) {
    logger.warn({
      error: error.message,
      userId: request.user?.userId
    }, 'Session health check failed');
  }
}

/**
 * Combined middleware for enterprise session management
 */
export async function enterpriseSessionManagement(
  request: FastifyRequest, 
  reply: FastifyReply
) {
  // First ensure user is authenticated
  try {
    await request.jwtVerify();
  } catch (error) {
    return reply.code(401).send({
      success: false,
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  // Then ensure session health
  await ensureSessionHealth(request, reply);
}