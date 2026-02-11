import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const getDatabaseUrl = (): string => {
  if (isDevelopment && process.env.DEV_DATABASE_URL) {
    return process.env.DEV_DATABASE_URL;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  return process.env.DATABASE_URL;
};

const connectionString = getDatabaseUrl();

const getSslConfig = (): PoolConfig['ssl'] => {
  if (isProduction) return { rejectUnauthorized: false };
  try {
    const url = new URL(connectionString);
    const hostname = url.hostname.toLowerCase();
    const isRemote = hostname !== 'localhost' && hostname !== '127.0.0.1';
    const isSupabase = hostname.endsWith('supabase.co') || hostname.endsWith('supabase.com');
    if (isRemote || isSupabase) return { rejectUnauthorized: false };
  } catch {
    return undefined;
  }
  return undefined;
};

// Optimized pool configuration for high-concurrency attendance operations
const poolConfig: PoolConfig = {
  connectionString,
  max: isProduction ? 50 : 20, // Increased from 20/10 for better concurrency
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // Reduced from 10000 for faster failover
  statement_timeout: 30000, // 30 second query timeout to prevent long-running queries
  query_timeout: 25000, // 25 second individual query timeout
  ssl: getSslConfig(),
  // Add connection pool monitoring
  allowExitOnIdle: false,
};

export const pool = new Pool(poolConfig);

// Connection pool monitoring
let poolStatsInterval: NodeJS.Timeout | null = null;

const logPoolStats = () => {
  const stats = {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    max: pool.options.max,
  };
  
  logger.debug(stats, 'Connection pool statistics');
  
  // Alert if pool is under stress
  if (stats.waitingCount > 5) {
    logger.warn({ stats }, 'High connection pool wait count detected');
  }
  
  if (stats.idleCount < 2 && stats.totalCount >= stats.max) {
    logger.warn({ stats }, 'Connection pool exhaustion imminent');
  }
};

export const startPoolMonitoring = () => {
  if (poolStatsInterval) {
    clearInterval(poolStatsInterval);
  }
  
  // Log stats every 30 seconds in production, every 10 seconds in development
  const interval = isProduction ? 30000 : 10000;
  poolStatsInterval = setInterval(logPoolStats, interval);
};

export const stopPoolMonitoring = () => {
  if (poolStatsInterval) {
    clearInterval(poolStatsInterval);
    poolStatsInterval = null;
  }
};

pool.on('connect', () => {
  logger.info(`Database connected: ${isDevelopment ? 'Development' : 'Production'} mode`);
  
  // Start monitoring when first connection is established
  if (!poolStatsInterval) {
    startPoolMonitoring();
  }
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected database error');
  // Don't exit process in serverless environments
});

// Monitor for slow queries
pool.on('connect', (client) => {
  const originalQuery = client.query.bind(client);
  
  client.query = async (...args: any[]) => {
    const start = Date.now();
    try {
      const result = await (originalQuery as any)(...args);
      const duration = Date.now() - start;
      
      if (duration > 1000) { // Log queries taking more than 1 second
        logger.warn({ 
          duration, 
          query: args[0]?.text || args[0],
          params: args[0]?.values || args[1] 
        }, 'Slow query detected');
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error({ 
        error, 
        duration, 
        query: args[0]?.text || args[0] 
      }, 'Query error');
      throw error;
    }
  };
});

pool.on('connect', (client) => {
  if (!isTest) return;

  (async () => {
    try {
      await client.query("SET app.current_tenant_id = '00000000-0000-0000-0000-000000000000'");
      await client.query("SET app.current_user_id = '00000000-0000-0000-0000-000000000000'");
    } catch (error) {
      logger.warn({ error }, 'Failed to set test session variables');
    }
  })();
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (isDevelopment) {
      logger.debug({ text, duration, rows: result.rowCount }, 'Executed query');
    }

    return result;
  } catch (error) {
    logger.error({ text, error }, 'Query error');
    throw error;
  }
};

export const getClient = () => pool.connect();

export const transaction = async <T>(
  callback: (client: any) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  const start = Date.now();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    
    const duration = Date.now() - start;
    if (duration > 5000) { // Log transactions taking more than 5 seconds
      logger.warn({ duration }, 'Long-running transaction detected');
    }
    
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const healthCheck = async (): Promise<boolean> => {
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const duration = Date.now() - start;
    
    if (duration > 100) { // Health check should be fast
      logger.warn({ duration }, 'Slow health check detected');
    }
    
    return true;
  } catch (error) {
    logger.error({ error }, 'Database health check failed');
    return false;
  }
};

// Graceful shutdown
export const closePool = async (): Promise<void> => {
  stopPoolMonitoring();
  await pool.end();
  logger.info('Database pool closed');
};