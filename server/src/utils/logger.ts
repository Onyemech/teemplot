import pino from 'pino';
import path from 'path';
import fs from 'fs';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
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

// Development: Pretty print to console
const developmentTransport = pino.transport({
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'HH:MM:ss Z',
    ignore: 'pid,hostname',
    singleLine: false,
  },
});

// Production: JSON to file and console
const productionTransports = pino.transport({
  targets: [
    {
      target: 'pino/file',
      options: {
        destination: path.join(logsDir, 'app.log'),
        mkdir: true,
      },
      level: 'info',
    },
    {
      target: 'pino/file',
      options: {
        destination: path.join(logsDir, 'error.log'),
        mkdir: true,
      },
      level: 'error',
    },
    {
      target: 'pino-pretty',
      options: {
        colorize: false,
        translateTime: 'SYS:standard',
      },
      level: 'info',
    },
  ],
});

export const logger = pino(
  baseConfig,
  isDevelopment ? developmentTransport : productionTransports
);

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
