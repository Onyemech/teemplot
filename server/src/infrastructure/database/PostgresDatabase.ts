import { IDatabase, QueryResult } from './IDatabase';
import { Pool, PoolClient } from 'pg';
import { logger } from '../../utils/logger';

export class PostgresDatabase implements IDatabase {
  private pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL not configured');
    }

    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });

    this.pool.on('error', (err: Error) => {
      logger.error(`Unexpected PostgreSQL error: ${err.message}`);
    });

    logger.info('PostgreSQL database initialized');
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    try {
      const result = await this.pool.query(sql, params);
      
      return {
        rows: result.rows as T[],
        rowCount: result.rowCount || 0,
      };
    } catch (error: any) {
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
    // Check if table has deleted_at column (soft delete)
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

    try {
      await client.query('BEGIN');
      const result = await callback(this);
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
