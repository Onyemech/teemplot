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
  // Access token - short-lived (15 minutes)
  reply.setCookie('accessToken', accessToken, {
    httpOnly: true, // Cannot be accessed by JavaScript (XSS protection)
    secure: isProduction, // HTTPS only in production
    sameSite: 'strict', // CSRF protection
    path: '/',
    maxAge: 15 * 60 // 15 minutes in seconds
  });

  // Refresh token - long-lived (7 days)
  reply.setCookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
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
