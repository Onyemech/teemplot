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


export function setAuthCookies(
  reply: FastifyReply,
  accessToken: string,
  refreshToken: string,
  isProduction: boolean
) {
 
  const cookieOptions = {
    httpOnly: true, 
    secure: isProduction, 
    sameSite: 'lax' as const, 
    domain: isProduction ? '.teemplot.com' : undefined, 
    path: '/',
  };

  console.log('🍪 Setting auth cookies:', {
    domain: cookieOptions.domain || 'localhost',
    sameSite: cookieOptions.sameSite,
    secure: cookieOptions.secure,
    httpOnly: cookieOptions.httpOnly,
    isProduction
  });

  // Enterprise-standard session durations
  // Access token: 2 hours (long enough to prevent interruptions)
  // Refresh token: 30 days (enterprise standard)
  reply.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 2 * 60 * 60 // 2 hours in seconds
  });

  reply.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    path: '/', 
    maxAge: 30 * 24 * 60 * 60 // 30 days in seconds
  });
}


export function clearAuthCookies(reply: FastifyReply) {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    path: '/',
    domain: isProduction ? '.teemplot.com' : undefined,
  };
  
  reply.clearCookie('accessToken', cookieOptions);
  reply.clearCookie('refreshToken', cookieOptions);
}


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


export function createRefreshTokenPayload(userId: string): RefreshTokenPayload {
  return {
    userId
  };
}
