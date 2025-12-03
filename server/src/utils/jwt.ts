import { FastifyReply } from 'fastify';

export interface TokenPayload {
  userId: string;
  companyId: string;
  email: string;
  role: string;
}

export interface RefreshTokenPayload {
  userId: string;
}

/**
 * Set authentication cookies (access + refresh tokens)
 */
export function setAuthCookies(
  reply: FastifyReply,
  accessToken: string,
  refreshToken: string,
  isProduction: boolean
) {
  // For cross-domain cookies (frontend and backend on different domains)
  // we need sameSite: 'none' and secure: true
  const cookieOptions = {
    httpOnly: true, // Cannot be accessed by JavaScript (XSS protection)
    secure: true, // Always use HTTPS (required for sameSite: 'none')
    sameSite: isProduction ? 'none' as const : 'lax' as const, // Allow cross-domain in production
    path: '/',
  };

  // Access token - short-lived (15 minutes)
  reply.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 // 15 minutes in seconds
  });

  // Refresh token - long-lived (7 days)
  reply.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    path: '/api/auth/refresh', // Only sent to refresh endpoint
    maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
  });
}

/**
 * Clear authentication cookies
 */
export function clearAuthCookies(reply: FastifyReply) {
  reply.clearCookie('accessToken', { path: '/' });
  reply.clearCookie('refreshToken', { path: '/api/auth/refresh' });
}

/**
 * Generate access token payload
 */
export function createAccessTokenPayload(user: {
  id: string;
  companyId: string;
  email: string;
  role: string;
}): TokenPayload {
  return {
    userId: user.id,
    companyId: user.companyId,
    email: user.email,
    role: user.role
  };
}

/**
 * Generate refresh token payload
 */
export function createRefreshTokenPayload(userId: string): RefreshTokenPayload {
  return {
    userId
  };
}
