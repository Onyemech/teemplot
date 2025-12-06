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
    sameSite: isProduction ? ('none' as const) : ('lax' as const), 
    domain: isProduction ? '.teemplot.com' : undefined, 
    path: '/',
  };

  reply.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 
  });

  reply.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    path: '/', 
    maxAge: 7 * 24 * 60 * 60 
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
