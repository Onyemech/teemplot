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
  // With api.teemplot.com subdomain, we can use same-site cookies
  const cookieOptions = {
    httpOnly: true, // Cannot be accessed by JavaScript (XSS protection)
    secure: true, // Always use HTTPS
    sameSite: 'lax' as const, // Can use 'lax' now (same root domain)
    domain: isProduction ? '.teemplot.com' : undefined, // Share across *.teemplot.com
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
