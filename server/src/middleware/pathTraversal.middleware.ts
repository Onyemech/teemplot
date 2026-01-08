import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger';
import { logSecurityEvent } from './security.middleware';

const ALLOWED_DIRECTORIES = [
  'uploads',
  'temp',
  'public',
  'assets'
];

const BLOCKED_PATTERNS = [
  /^(?:\/|\\)*(?:etc|proc|sys|dev|boot|root|home|usr|var|tmp|private|Library|System|Windows|Program Files|ProgramData)(?:\/|\\)*/i,
  
  /\.(?:env|config|ini|cfg|properties|xml|json|yaml|yml|key|pem|crt|pub|priv)$/i,
  
  /(?:passwd|shadow|hosts|ssh|id_rsa|id_dsa|known_hosts|history|bash_history|profile|bashrc)$/i,
  
  /\$\{[^}]+\}/,
  /%[^%]+%/,
  
  /%25(?:2e|5c|2f|5e)/i,
];

function normalizeAndValidatePath(inputPath: string): { isValid: boolean; normalizedPath: string; reason?: string } {
  if (!inputPath || typeof inputPath !== 'string') {
    return { isValid: false, normalizedPath: '', reason: 'Invalid path type' };
  }

  let path = inputPath.replace(/[\x00-\x1f\x80-\x9f]/g, '');
  
  try {
    path = decodeURIComponent(path);
  } catch {
    return { isValid: false, normalizedPath: '', reason: 'Invalid URL encoding' };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(path)) {
      return { isValid: false, normalizedPath: '', reason: 'Blocked pattern detected' };
    }
  }

  // Resolve relative paths and normalize
  try {
    // Convert to absolute path for normalization
    const normalized = path
      .replace(/\\/g, '/') // Convert backslashes to forward slashes
      .replace(/\/\.\//g, '/') // Remove ./ segments
      .replace(/\/\.\.\//g, '/') // Remove ../ segments
      .replace(/^\.\//, '') // Remove leading ./
      .replace(/^\.\.\//, '') // Remove leading ../
      .replace(/\/\.$/, '') // Remove trailing .
      .replace(/\/\.\.$/, '') // Remove trailing ..
      .replace(/\/+/g, '/') // Collapse multiple slashes
      .replace(/^\.$/, '') // Remove single .
      .replace(/^\.\.$/, ''); // Remove single ..

    // Check for remaining relative path attempts
    if (normalized.includes('../') || normalized.includes('..\\')) {
      return { isValid: false, normalizedPath: '', reason: 'Relative path traversal detected' };
    }

    // Check if path starts with allowed directory
    const isAllowed = ALLOWED_DIRECTORIES.some(dir => 
      normalized.startsWith(dir + '/') || normalized === dir
    );

    if (!isAllowed) {
      return { isValid: false, normalizedPath: '', reason: 'Path not in allowed directories' };
    }

    return { isValid: true, normalizedPath: normalized };
  } catch (error) {
    return { isValid: false, normalizedPath: '', reason: 'Path normalization failed' };
  }
}

// Detect path traversal attempts in request parameters
function detectPathTraversal(request: FastifyRequest): { suspicious: boolean; details?: any } {
  const { url, query, params, headers } = request;
  
  const suspiciousPatterns: RegExp[] = [
    // Common traversal patterns
    /\.\.(?:\/|\\)/,
    /~/, // Home directory reference
    /\$\w+/, // Environment variables
    /%(?:2e|5c|2f|5e)/i, // URL-encoded path separators
    /\\x[0-9a-f]{2}/i, // Hex encoded characters
    /\|/, // Pipe characters
    /`/, // Backticks
    /\$\{/, // Bash variable syntax
    /\$\w*\(/, // Command substitution
  ];

  // Check URL
  if (suspiciousPatterns.some((pattern: RegExp) => pattern.test(url))) {
    return { 
      suspicious: true, 
      details: { 
        type: 'url_traversal', 
        url,
        detectedIn: 'URL' 
      } 
    };
  }

  // Check query parameters
  if (query && typeof query === 'object') {
    for (const [key, value] of Object.entries(query as any)) {
      if (typeof value === 'string' && suspiciousPatterns.some((pattern: RegExp) => pattern.test(value))) {
        return { 
          suspicious: true, 
          details: { 
            type: 'query_traversal', 
            parameter: key,
            value: value.substring(0, 100), // Limit logged value length
            detectedIn: 'query' 
          } 
        };
      }
    }
  }

  // Check route parameters
  if (params && typeof params === 'object') {
    for (const [key, value] of Object.entries(params as any)) {
      if (typeof value === 'string' && suspiciousPatterns.some((pattern: RegExp) => pattern.test(value))) {
        return { 
          suspicious: true, 
          details: { 
            type: 'param_traversal', 
            parameter: key,
            value: value.substring(0, 100),
            detectedIn: 'params' 
          } 
        };
      }
    }
  }

  // Check specific headers that might contain paths
  const pathHeaders = ['referer', 'origin', 'x-forwarded-for', 'x-real-ip'];
  for (const header of pathHeaders) {
    const value = headers[header];
    if (typeof value === 'string' && suspiciousPatterns.some((pattern: RegExp) => pattern.test(value))) {
      return { 
        suspicious: true, 
        details: { 
          type: 'header_traversal', 
          header,
          value: value.substring(0, 100),
          detectedIn: 'headers' 
        } 
      };
    }
  }

  return { suspicious: false };
}

// Main middleware function
export function pathTraversalProtection(request: FastifyRequest, reply: FastifyReply, next: () => void) {
  // Skip for health checks, static assets, and Google OAuth callback (which contains complex codes)
  if (request.url.startsWith('/health') || request.url.startsWith('/api/health') || 
      request.url.startsWith('/assets/') || request.url.startsWith('/public/') ||
      request.url.startsWith('/api/auth/google/callback') ||
      request.url.startsWith('/api/employee-invitations/')) {
    return next();
  }

  // Detect traversal attempts
  const traversalDetection = detectPathTraversal(request);
  
  if (traversalDetection.suspicious) {
    // Log security event
    logSecurityEvent({
      type: 'path_traversal_attempt',
      ip: request.ip,
      userAgent: request.headers['user-agent'] || '',
      details: {
        ...traversalDetection.details,
        url: request.url,
        blocked: true
      }
    });

    // Return generic error without revealing details
    reply.code(403).send({
      success: false,
      message: 'Access forbidden'
    });
    return;
  }

  // Validate file-related parameters
  if (request.query && typeof request.query === 'object') {
    const fileParams = ['file', 'path', 'filename', 'dir', 'directory'];
    
    for (const param of fileParams) {
      const value = (request.query as any)[param];
      if (value && typeof value === 'string') {
        const validation = normalizeAndValidatePath(value);
        
        if (!validation.isValid) {
          logSecurityEvent({
            type: 'invalid_file_path',
            ip: request.ip,
            userAgent: request.headers['user-agent'] || '',
            details: {
              url: request.url,
              parameter: param,
              value: value.substring(0, 100),
              reason: validation.reason,
              blocked: true
            }
          });

          reply.code(403).send({
            success: false,
            message: 'Invalid file path'
          });
          return;
        }
      }
    }
  }

  next();
}

// Utility function for file operations
export function validateFilePath(filePath: string, context: string = 'unknown'): { isValid: boolean; normalizedPath: string; error?: string } {
  const validation = normalizeAndValidatePath(filePath);
  
  if (!validation.isValid) {
    logger.warn({
      context: 'file_path_validation',
      operation: context,
      originalPath: filePath,
      reason: validation.reason
    }, 'Invalid file path detected');
  }
  
  return {
    isValid: validation.isValid,
    normalizedPath: validation.normalizedPath,
    error: validation.reason
  };
}

// Test function for verification
export function testPathTraversalProtection() {
  const testCases = [
    // Should be blocked
    '../../../etc/passwd',
    '../../config.json', 
    '/etc/passwd',
    'C:\\Windows\\System32',
    '%2e%2e%2fetc%2fpasswd', // URL encoded ../
    '..\\..\\file.txt',
    '$HOME/.ssh/id_rsa',
    '~/.bash_history',
    'file:///etc/passwd',
    
    // Should be allowed
    'uploads/profile.jpg',
    'temp/temp_file.txt',
    'public/images/logo.png',
    'assets/css/style.css'
  ];

  console.log('Testing path traversal protection:');
  testCases.forEach(testCase => {
    const result = normalizeAndValidatePath(testCase);
    console.log(`${testCase} -> ${result.isValid ? '✓ ALLOWED' : '✗ BLOCKED'} (${result.reason || 'valid'})`);
  });
}