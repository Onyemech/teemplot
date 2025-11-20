import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger';
import { superAdminNotificationService } from '../services/SuperAdminNotificationService';

/**
 * Rate limiting configuration
 * Prevents brute force attacks and DDoS
 */
export const rateLimitConfig = {
  global: {
    max: 100, // requests
    timeWindow: '15 minutes',
  },
  auth: {
    max: 5, 
    timeWindow: '15 minutes',
  },
  passwordReset: {
    max: 3, 
    timeWindow: '15 minutes',
  },
  registration: {
    max: 3, 
    timeWindow: '1 hour',
  },
};


export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Remove potential XSS patterns
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }
  
  return input;
}

/**
 * Security headers middleware
 * Implements OWASP security headers
 */
export async function securityHeaders(
  request: FastifyRequest,
  reply: FastifyReply
) {
  reply.header('X-Frame-Options', 'DENY');
  
  reply.header('X-Content-Type-Options', 'nosniff');
  
  reply.header('X-XSS-Protection', '1; mode=block');
  
  reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  reply.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.supabase.co https://*.supabase.co"
  );
  
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  reply.header('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');
}


export async function requestLogger(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const startTime = Date.now();
  
  // Log request
  logger.info({
    type: 'request',
    method: request.method,
    url: request.url,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    timestamp: new Date().toISOString(),
  });
  
  reply.raw.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info({
      type: 'response',
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  });
}

/**
 * Validate JWT token and check for suspicious activity
 */
export async function validateToken(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    
    // Check for token expiration
    const decoded = request.user as any;
    const now = Math.floor(Date.now() / 1000);
    
    if (decoded.exp && decoded.exp < now) {
      return reply.code(401).send({
        success: false,
        message: 'Token expired',
      });
    }
    
    // Log authenticated request
    logger.info({
      type: 'authenticated_request',
      userId: decoded.userId,
      role: decoded.role,
      url: request.url,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return reply.code(401).send({
      success: false,
      message: 'Invalid or expired token',
    });
  }
}

/**
 * Password strength validator
 * Enforces strong password policy
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common passwords
  const commonPasswords = [
    'password', '12345678', 'qwerty', 'abc123', 'password123',
    'admin', 'letmein', 'welcome', 'monkey', '1234567890'
  ];
  
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    errors.push('Password is too common');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Email validation
 * Prevents disposable emails and validates format
 */
export function validateEmail(email: string): {
  valid: boolean;
  error?: string;
} {
  // Basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  // Block disposable email domains
  const disposableDomains = [
    'tempmail.com', 'throwaway.email', '10minutemail.com',
    'guerrillamail.com', 'mailinator.com', 'trashmail.com',
    'yopmail.com', 'fakeinbox.com', 'maildrop.cc'
  ];
  
  const domain = email.split('@')[1].toLowerCase();
  if (disposableDomains.includes(domain)) {
    return { valid: false, error: 'Disposable email addresses are not allowed' };
  }
  
  return { valid: true };
}

/**
 * SQL Injection prevention
 * Validates and sanitizes database inputs
 */
export function sanitizeSQLInput(input: string): string {
  // Remove SQL keywords and dangerous characters
  return input
    .replace(/['";\\]/g, '') // Remove quotes and backslashes
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove multi-line comments
    .replace(/\*\//g, '')
    .trim();
}

/**
 * File upload validation
 * Prevents malicious file uploads
 */
export function validateFileUpload(file: {
  filename: string;
  mimetype: string;
  size: number;
}): {
  valid: boolean;
  error?: string;
} {
  // Allowed file types
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return { valid: false, error: 'File type not allowed' };
  }
  
  // Max file size: 10MB
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 10MB limit' };
  }
  
  // Check for double extensions (e.g., file.pdf.exe)
  const filename = file.filename.toLowerCase();
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.php', '.js', '.jar'];
  if (dangerousExtensions.some(ext => filename.includes(ext))) {
    return { valid: false, error: 'Suspicious file extension detected' };
  }
  
  return { valid: true };
}

/**
 * CORS configuration
 * Restricts cross-origin requests
 */
export const corsConfig = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
};

/**
 * Detect suspicious activity patterns
 */
export function detectSuspiciousActivity(request: FastifyRequest): {
  suspicious: boolean;
  reason?: string;
} {
  // Check for SQL injection patterns in URL
  const sqlPatterns = /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/i;
  if (sqlPatterns.test(request.url)) {
    // Notify superadmin of SQL injection attempt
    superAdminNotificationService.notifySecurityEvent('SQL Injection Attempt', {
      url: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      timestamp: new Date().toISOString(),
    }).catch(err => logger.error('Failed to notify superadmin:', err));
    
    return { suspicious: true, reason: 'SQL injection attempt detected' };
  }
  
  // Check for XSS patterns
  const xssPatterns = /<script|javascript:|onerror=|onload=/i;
  if (xssPatterns.test(request.url)) {
    // Notify superadmin of XSS attempt
    superAdminNotificationService.notifySecurityEvent('XSS Attempt', {
      url: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      timestamp: new Date().toISOString(),
    }).catch(err => logger.error('Failed to notify superadmin:', err));
    
    return { suspicious: true, reason: 'XSS attempt detected' };
  }
  
  // Check for path traversal
  if (request.url.includes('../') || request.url.includes('..\\')) {
    // Notify superadmin of path traversal attempt
    superAdminNotificationService.notifySecurityEvent('Path Traversal Attempt', {
      url: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      timestamp: new Date().toISOString(),
    }).catch(err => logger.error('Failed to notify superadmin:', err));
    
    return { suspicious: true, reason: 'Path traversal attempt detected' };
  }
  
  return { suspicious: false };
}

/**
 * Audit log for security events
 */
export async function logSecurityEvent(event: {
  type: 'login' | 'logout' | 'failed_login' | 'password_reset' | 'suspicious_activity' | 'access_denied';
  userId?: string;
  ip: string;
  userAgent: string;
  details?: any;
}) {
  logger.warn({
    ...event,
    timestamp: new Date().toISOString(),
    severity: event.type.includes('suspicious') || event.type.includes('failed') ? 'high' : 'medium',
  });
  
  // TODO: Store in audit_logs table
}
