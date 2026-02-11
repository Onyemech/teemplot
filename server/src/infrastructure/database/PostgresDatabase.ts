import { IDatabase, QueryResult } from './IDatabase';
import { Pool, PoolClient } from 'pg';
import { logger } from '../../utils/logger';

export class PostgresDatabase implements IDatabase {
  private pool: Pool;
  private columnCache: Map<string, boolean> = new Map();

  constructor() {
    // Prefer DEV_DATABASE_URL in development mode if available
    const isDevelopment = process.env.NODE_ENV === 'development';
    const connectionString = (isDevelopment && process.env.DEV_DATABASE_URL) 
      ? process.env.DEV_DATABASE_URL 
      : process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL not configured');
    }

    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 10000, 
      connectionTimeoutMillis: 20000, // Increased to 20s for slow networks
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });

    this.pool.on('error', (err: Error) => {
      logger.error(`Unexpected PostgreSQL error: ${err.message}`);
    });

    logger.info('PostgreSQL database initialized');
  }

  public getPool(): Pool {
    return this.pool;
  }

  async query<T = any>(sql: string, params: any[] = [], retries = 3): Promise<QueryResult<T>> {
    try {
      const start = Date.now();
      const result = await this.pool.query(sql, params);
      const duration = Date.now() - start;

      if (duration > 1000) {
        logger.warn({ sql, duration, rows: result.rowCount }, 'Slow query detected');
      }

      return {
        rows: result.rows as T[],
        rowCount: result.rowCount || 0,
      };
    } catch (error: any) {
      // Retry on connection errors (reset, timeout, dns)
      if (retries > 0 && (
        error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.message?.includes('ECONNRESET') || 
        error.code === '57P01'
      )) {
        logger.warn(`Retrying query due to connection error (${error.code || error.message})... (${retries} attempts left)`);
        await new Promise(res => setTimeout(res, 500)); // Increased delay for stability
        return this.query(sql, params, retries - 1);
      }
      
      logger.error(`PostgreSQL query error: ${error?.message || 'Unknown error'} - SQL: ${sql}`);
      throw error;
    }
  }

  async insert<T = any>(table: string, data: Partial<T>): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `
      INSERT INTO ${table} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await this.query<T>(sql, values);
    return result.rows[0];
  }

  async update<T = any>(
    table: string,
    data: Partial<T>,
    where: Record<string, any>
  ): Promise<T[]> {
    const dataKeys = Object.keys(data);
    const whereKeys = Object.keys(where);

    const setClause = dataKeys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const whereClause = whereKeys
      .map((key, i) => `${key} = $${dataKeys.length + i + 1}`)
      .join(' AND ');

    const sql = `
      UPDATE ${table}
      SET ${setClause}, updated_at = NOW()
      WHERE ${whereClause}
      RETURNING *
    `;

    const params = [...Object.values(data), ...Object.values(where)];
    const result = await this.query<T>(sql, params);
    return result.rows;
  }

  async delete(table: string, where: Record<string, any>): Promise<number> {
    const hasDeletedAt = await this.hasColumn(table, 'deleted_at');

    if (hasDeletedAt) {
      // Soft delete
      const whereKeys = Object.keys(where);
      const whereClause = whereKeys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');

      const sql = `
        UPDATE ${table}
        SET deleted_at = NOW()
        WHERE ${whereClause}
      `;

      const result = await this.query(sql, Object.values(where));
      return result.rowCount;
    } else {
      // Hard delete
      const whereKeys = Object.keys(where);
      const whereClause = whereKeys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');

      const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
      const result = await this.query(sql, Object.values(where));
      return result.rowCount;
    }
  }

  async find<T = any>(
    table: string,
    where?: Record<string, any>,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      select?: string[];
    }
  ): Promise<T[]> {
    const select = options?.select?.join(', ') || '*';
    let sql = `SELECT ${select} FROM ${table}`;
    const params: any[] = [];
    let paramIndex = 1;

    if (where && Object.keys(where).length > 0) {
      const whereClause = Object.keys(where)
        .map((key) => `${key} = $${paramIndex++}`)
        .join(' AND ');
      sql += ` WHERE ${whereClause}`;
      params.push(...Object.values(where));
    }

    // Always filter out soft-deleted records
    const hasDeletedAt = await this.hasColumn(table, 'deleted_at');
    if (hasDeletedAt) {
      sql += where ? ' AND deleted_at IS NULL' : ' WHERE deleted_at IS NULL';
    }

    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`;
    }

    if (options?.offset) {
      sql += ` OFFSET ${options.offset}`;
    }

    const result = await this.query<T>(sql, params);
    return result.rows;
  }

  async findOne<T = any>(table: string, where: Record<string, any>): Promise<T | null> {
    const results = await this.find<T>(table, where, { limit: 1 });
    return results[0] || null;
  }

  async count(table: string, where?: Record<string, any>): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${table}`;
    const params: any[] = [];
    let paramIndex = 1;

    if (where && Object.keys(where).length > 0) {
      const whereClause = Object.keys(where)
        .map((key) => `${key} = $${paramIndex++}`)
        .join(' AND ');
      sql += ` WHERE ${whereClause}`;
      params.push(...Object.values(where));
    }

    const hasDeletedAt = await this.hasColumn(table, 'deleted_at');
    if (hasDeletedAt) {
      sql += where ? ' AND deleted_at IS NULL' : ' WHERE deleted_at IS NULL';
    }

    const result = await this.query<{ count: string }>(sql, params);
    return parseInt(result.rows[0].count);
  }

  async transaction<T>(callback: (db: IDatabase) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    
    // Create a wrapper that forces usage of this specific client
    const transactionDb: IDatabase = {
      getPool: () => this.pool, // Return main pool, though generally shouldn't be used inside tx for tx-bound ops
      query: async <T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> => {
        const start = Date.now();
        try {
          const result = await client.query(sql, params);
          const duration = Date.now() - start;
          if (duration > 1000) logger.warn({ sql, duration, rows: result.rowCount }, 'Slow query in transaction');
          return { rows: result.rows as T[], rowCount: result.rowCount || 0 };
        } catch (error: any) {
          logger.error(`Transaction query error: ${error?.message || 'Unknown error'} - SQL: ${sql}`);
          throw error;
        }
      },
      insert: async <T = any>(table: string, data: Partial<T>): Promise<T> => {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
        const result = await client.query(sql, values);
        return result.rows[0];
      },
      update: async <T = any>(table: string, data: Partial<T>, where: Record<string, any>): Promise<T[]> => {
        const dataKeys = Object.keys(data);
        const whereKeys = Object.keys(where);
        const setClause = dataKeys.map((key, i) => `${key} = $${i + 1}`).join(', ');
        const whereClause = whereKeys.map((key, i) => `${key} = $${dataKeys.length + i + 1}`).join(' AND ');
        const sql = `UPDATE ${table} SET ${setClause}, updated_at = NOW() WHERE ${whereClause} RETURNING *`;
        const params = [...Object.values(data), ...Object.values(where)];
        const result = await client.query(sql, params);
        return result.rows;
      },
      delete: async (table: string, where: Record<string, any>): Promise<number> => {
        const hasDeletedAt = await this.hasColumn(table, 'deleted_at'); // This uses main pool, acceptable as schema doesn't change
        const whereKeys = Object.keys(where);
        const whereClause = whereKeys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
        let sql;
        if (hasDeletedAt) {
          sql = `UPDATE ${table} SET deleted_at = NOW() WHERE ${whereClause}`;
        } else {
          sql = `DELETE FROM ${table} WHERE ${whereClause}`;
        }
        const result = await client.query(sql, Object.values(where));
        return result.rowCount || 0;
      },
      find: async <T = any>(table: string, where?: Record<string, any>, options?: any): Promise<T[]> => {
        const select = options?.select?.join(', ') || '*';
        let sql = `SELECT ${select} FROM ${table}`;
        const params: any[] = [];
        let paramIndex = 1;

        if (where && Object.keys(where).length > 0) {
          const whereClause = Object.keys(where).map((key) => `${key} = $${paramIndex++}`).join(' AND ');
          sql += ` WHERE ${whereClause}`;
          params.push(...Object.values(where));
        }

        const hasDeletedAt = await this.hasColumn(table, 'deleted_at');
        if (hasDeletedAt) {
          sql += where ? ' AND deleted_at IS NULL' : ' WHERE deleted_at IS NULL';
        }

        if (options?.orderBy) sql += ` ORDER BY ${options.orderBy}`;
        if (options?.limit) sql += ` LIMIT ${options.limit}`;
        if (options?.offset) sql += ` OFFSET ${options.offset}`;

        const result = await client.query(sql, params);
        return result.rows;
      },
      findOne: async <T = any>(table: string, where: Record<string, any>): Promise<T | null> => {
        const results = await transactionDb.find<T>(table, where, { limit: 1 });
        return results[0] || null;
      },
      count: async (table: string, where?: Record<string, any>): Promise<number> => {
        let sql = `SELECT COUNT(*) as count FROM ${table}`;
        const params: any[] = [];
        let paramIndex = 1;
        if (where && Object.keys(where).length > 0) {
          const whereClause = Object.keys(where).map((key) => `${key} = $${paramIndex++}`).join(' AND ');
          sql += ` WHERE ${whereClause}`;
          params.push(...Object.values(where));
        }
        const hasDeletedAt = await this.hasColumn(table, 'deleted_at');
        if (hasDeletedAt) {
          sql += where ? ' AND deleted_at IS NULL' : ' WHERE deleted_at IS NULL';
        }
        const result = await client.query(sql, params);
        return parseInt(result.rows[0].count);
      },
      transaction: async <U>(cb: (db: IDatabase) => Promise<U>): Promise<U> => {
        // Nested transaction (savepoint) support could be added here, 
        // but for now we just reuse the same client/transaction
        return cb(transactionDb);
      },
      healthCheck: async () => true,
      close: async () => {}, // No-op inside transaction
      getType: () => 'postgres',
    };

    try {
      await client.query('BEGIN');
      const result = await callback(transactionDb); // Pass the WRAPPER
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error: any) {
      logger.error(`PostgreSQL health check failed: ${error?.message || 'Unknown error'}`);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    logger.info('PostgreSQL database connection closed');
  }

  getType(): 'postgres' {
    return 'postgres';
  }

  /**
   * Check if table has a specific column
   */
  private async hasColumn(table: string, column: string): Promise<boolean> {
    try {
      const result = await this.query(
        `SELECT COUNT(*) as count 
         FROM information_schema.columns 
         WHERE table_name = $1 AND column_name = $2`,
        [table, column]
      );
      return parseInt(result.rows[0].count) > 0;
    } catch {
      return false;
    }
  }
}
