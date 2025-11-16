import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

const getDatabaseUrl = (): string => {
  if (isDevelopment && process.env.DEV_DATABASE_URL) {
    return process.env.DEV_DATABASE_URL;
  }
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  return process.env.DATABASE_URL;
};

const poolConfig: PoolConfig = {
  connectionString: getDatabaseUrl(),
  max: isProduction ? 20 : 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
};

export const pool = new Pool(poolConfig);

pool.on('connect', () => {
  logger.info(`Database connected: ${isDevelopment ? 'Development' : 'Production'} mode`);
});

pool.on('error', (err) => {
  logger.error('Unexpected database error', err);
  process.exit(-1);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (isDevelopment) {
      logger.debug('Executed query', { text, duration, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    logger.error('Query error', { text, error });
    throw error;
  }
};

export const getClient = () => pool.connect();

export const transaction = async <T>(
  callback: (client: any) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
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
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    logger.error('Database health check failed', error);
    return false;
  }
};
