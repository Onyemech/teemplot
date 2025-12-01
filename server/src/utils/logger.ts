import pino from 'pino';
import path from 'path';
import fs from 'fs';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
// Server-side: check if running on localhost
const isLocalhost = process.env.HOST === 'localhost' || process.env.HOST === '127.0.0.1' || process.env.HOST === '0.0.0.0';
// Check if running in serverless environment (Vercel, AWS Lambda, etc.)
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT;

// Ensure logs directory exists (only in non-serverless environments)
const logsDir = path.join(process.cwd(), 'logs');
if (!isServerless && !fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
  } catch (error) {
    // Ignore errors in serverless - we'll log to console only
    console.warn('Could not create logs directory, using console only');
  }
}

const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

const baseConfig: pino.LoggerOptions = {
  level: logLevel,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    env: process.env.NODE_ENV,
    hostname: process.env.HOSTNAME || 'unknown',
  },
};

// Simple logger - no transports (works everywhere including serverless)
export const logger = pino(baseConfig);

// Smart logging helper - detects environment
export const smartLog = {
  info: (message: string, data?: any) => {
    if (isLocalhost || isDevelopment) {
      logger.info({ ...data, location: 'localhost' }, message);
    } else {
      logger.info({ ...data, location: 'production' }, message);
    }
  },
  
  error: (message: string, error?: any) => {
    if (isLocalhost || isDevelopment) {
      logger.error({ error, location: 'localhost' }, message);
    } else {
      logger.error({ error, location: 'production' }, message);
    }
  },
  
  warn: (message: string, data?: any) => {
    if (isLocalhost || isDevelopment) {
      logger.warn({ ...data, location: 'localhost' }, message);
    } else {
      logger.warn({ ...data, location: 'production' }, message);
    }
  },
  
  debug: (message: string, data?: any) => {
    if (isLocalhost || isDevelopment) {
      logger.debug({ ...data, location: 'localhost' }, message);
    }
  },
};

// Request logger middleware
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    
    if (res.statusCode >= 400) {
      smartLog.error('Request failed', logData);
    } else {
      smartLog.info('Request completed', logData);
    }
  });
  
  next();
};

export default logger;
