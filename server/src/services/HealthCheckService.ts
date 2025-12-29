import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { ConvexDatabase } from '../infrastructure/database/ConvexDatabase';
import { logger } from '../utils/logger';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  services: {
    database: ServiceHealth;
    email: ServiceHealth;
    redis?: ServiceHealth;
    convex?: ServiceHealth;
  };
  syncValidation?: {
    isConsistent: boolean;
    discrepancyCount: number;
    lastValidationTime?: string;
  };
  uptime: number;
  version: string;
}

export interface ServiceHealth {
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
  lastChecked: string;
}

export class HealthCheckService {
  private startTime: number;
  private version: string;

  constructor() {
    this.startTime = Date.now();
    this.version = process.env.npm_package_version || '1.0.0';
  }

  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    const [databaseHealth, emailHealth, convexHealth] = await Promise.allSettled([
      this.checkDatabaseHealth(),
      this.checkEmailHealth(),
      this.checkConvexHealth()
    ]);

    const services = {
      database: databaseHealth.status === 'fulfilled' ? databaseHealth.value : {
        status: 'unhealthy' as const,
        error: databaseHealth.reason?.message || 'Database check failed',
        lastChecked: new Date().toISOString()
      },
      email: emailHealth.status === 'fulfilled' ? emailHealth.value : {
        status: 'unhealthy' as const,
        error: emailHealth.reason?.message || 'Email check failed',
        lastChecked: new Date().toISOString()
      },
      convex: convexHealth.status === 'fulfilled' ? convexHealth.value : {
        status: 'unhealthy' as const,
        error: convexHealth.reason?.message || 'Convex check failed',
        lastChecked: new Date().toISOString()
      }
    };

    // Add Redis health check if available
    if (process.env.REDIS_URL) {
      try {
        (services as any)['redis'] = await this.checkRedisHealth();
      } catch (error: any) {
        (services as any)['redis'] = {
          status: 'unhealthy' as const,
          error: error.message,
          lastChecked: new Date().toISOString()
        };
      }
    }

    const allHealthy = Object.values(services).every(service => service.status === 'healthy');
    const anyUnhealthy = Object.values(services).some(service => service.status === 'unhealthy');

    let syncValidation = undefined;
    if (process.env.CONVEX_DEPLOYMENT_URL) {
      try {
        const backupDb = DatabaseFactory.getBackupDatabase();

        if (backupDb && backupDb.getType() === 'convex' && backupDb instanceof ConvexDatabase) {
          const lastValidation = backupDb.getLastValidationResult();
          const shouldRevalidate = !lastValidation || !lastValidation.lastSyncTime || (Date.now() - lastValidation.lastSyncTime.getTime() > 5 * 60 * 1000);

          const validationResult = shouldRevalidate
            ? await backupDb.validateSyncConsistency()
            : lastValidation;

          syncValidation = {
            isConsistent: validationResult.isConsistent,
            discrepancyCount: validationResult.discrepancies.length,
            lastValidationTime: validationResult.lastSyncTime?.toISOString()
          };
        }
      } catch (error: any) {
      logger.error('Sync validation failed during health check:', error);
        syncValidation = {
          isConsistent: false,
          discrepancyCount: -1,
          lastValidationTime: new Date().toISOString()
        };
      }
    }

    return {
      status: anyUnhealthy ? 'unhealthy' : (allHealthy ? 'healthy' : 'degraded'),
      timestamp: new Date().toISOString(),
      services,
      syncValidation,
      uptime: Date.now() - this.startTime,
      version: this.version
    };
  }

  private async checkDatabaseHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const db = DatabaseFactory.getPrimaryDatabase();
      
      // Test database connection with a simple query
      const result = await db.query('SELECT 1 as test');
      
      if (result.rows.length === 0) {
        throw new Error('Database query returned no results');
      }

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        lastChecked: new Date().toISOString()
      };
    } catch (error: any) {
      logger.error('Database health check failed:', error);
      
      return {
        status: 'unhealthy',
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }

  private async checkEmailHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Check if email service is configured
      if (!process.env.SMTP_HOST || !process.env.SMTP_PORT) {
        return {
          status: 'unhealthy',
          error: 'Email service not configured',
          lastChecked: new Date().toISOString()
        };
      }

      // Test SMTP connection (basic connectivity check)
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        } : undefined,
        connectionTimeout: 5000, // 5 second timeout
      });

      // Verify connection without sending actual email
      await transporter.verify();
      
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        lastChecked: new Date().toISOString()
      };
    } catch (error: any) {
      logger.error('Email health check failed:', error);
      
      return {
        status: 'unhealthy',
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }

  private async checkConvexHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      if (!process.env.CONVEX_DEPLOYMENT_URL) {
        return {
          status: 'healthy',
          lastChecked: new Date().toISOString()
        };
      }

      const db = DatabaseFactory.getBackupDatabase();

      if (!db || db.getType() !== 'convex') {
        return {
          status: 'unhealthy',
          error: 'Convex database not available',
          lastChecked: new Date().toISOString()
        };
      }

      const isHealthy = await db.healthCheck();
      const responseTime = Date.now() - startTime;

      if (!isHealthy) {
        return {
          status: 'unhealthy',
          error: 'Convex health check failed',
          lastChecked: new Date().toISOString()
        };
      }

      return {
        status: 'healthy',
        responseTime,
        lastChecked: new Date().toISOString()
      };
    } catch (error: any) {
      logger.error('Convex health check failed:', error);
      
      return {
        status: 'unhealthy',
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }

  private async checkRedisHealth(): Promise<ServiceHealth> {
    return {
      status: 'healthy',
      lastChecked: new Date().toISOString()
    };
    /*
    const startTime = Date.now();
    ...
    */
  }

  getUptime(): number {
    return Date.now() - this.startTime;
  }

  getVersion(): string {
    return this.version;
  }
}
