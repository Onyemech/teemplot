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

const poolConfig: PoolConfig = {
  connectionString,
  max: isProduction ? 20 : 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: getSslConfig(),
};

export const pool = new Pool(poolConfig);

pool.on('connect', () => {
  logger.info(`Database connected: ${isDevelopment ? 'Development' : 'Production'} mode`);
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

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected database error');
  process.exit(-1);
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
    logger.error({ error }, 'Database health check failed');
    return false;
  }
};
