import { IDatabase, QueryResult } from './IDatabase';
import { logger } from '../../utils/logger';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export class SQLiteDatabase implements IDatabase {
  private db: Database.Database;
  private dbPath: string;

  constructor() {
    this.dbPath = process.env.SQLITE_PATH || path.join(process.cwd(), 'data', 'teemplot.db');
    
    // Ensure data directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL'); // Better concurrency
    this.db.pragma('foreign_keys = ON'); // Enforce foreign keys

    logger.info(`SQLite database initialized: ${this.dbPath}`);
    this.initializeSchema();
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    try {
      const stmt = this.db.prepare(sql);
      const rows = stmt.all(...params) as T[];
      
      return {
        rows,
        rowCount: rows.length,
      };
    } catch (error: any) {
      logger.error(`SQLite query error: ${error?.message || 'Unknown error'} - SQL: ${sql}`);
      throw error;
    }
  }

  async insert<T = any>(table: string, data: Partial<T>): Promise<T> {
    const keys = Object.keys(data);
    // Convert booleans to 0/1 for SQLite
    const values = Object.values(data).map(val => 
      typeof val === 'boolean' ? (val ? 1 : 0) : val
    );
    const placeholders = keys.map(() => '?').join(', ');

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
    const setClause = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(', ');

    const whereClause = Object.keys(where)
      .map((key) => `${key} = ?`)
      .join(' AND ');

    const sql = `
      UPDATE ${table}
      SET ${setClause}, updated_at = datetime('now')
      WHERE ${whereClause}
      RETURNING *
    `;

    // Convert booleans to 0/1 for SQLite
    const dataValues = Object.values(data).map(val => 
      typeof val === 'boolean' ? (val ? 1 : 0) : val
    );
    const whereValues = Object.values(where).map(val => 
      typeof val === 'boolean' ? (val ? 1 : 0) : val
    );
    
    const params = [...dataValues, ...whereValues];
    const result = await this.query<T>(sql, params);
    return result.rows;
  }

  async delete(table: string, where: Record<string, any>): Promise<number> {
    // Check if table has deleted_at column (soft delete)
    const hasDeletedAt = await this.hasColumn(table, 'deleted_at');

    if (hasDeletedAt) {
      // Soft delete
      const whereClause = Object.keys(where)
        .map((key) => `${key} = ?`)
        .join(' AND ');

      const sql = `
        UPDATE ${table}
        SET deleted_at = datetime('now')
        WHERE ${whereClause}
      `;

      const stmt = this.db.prepare(sql);
      const result = stmt.run(...Object.values(where));
      return result.changes;
    } else {
      // Hard delete
      const whereClause = Object.keys(where)
        .map((key) => `${key} = ?`)
        .join(' AND ');

      const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...Object.values(where));
      return result.changes;
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

    if (where && Object.keys(where).length > 0) {
      const whereClause = Object.keys(where)
        .map((key) => `${key} = ?`)
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

    if (where && Object.keys(where).length > 0) {
      const whereClause = Object.keys(where)
        .map((key) => `${key} = ?`)
        .join(' AND ');
      sql += ` WHERE ${whereClause}`;
      params.push(...Object.values(where));
    }

    const hasDeletedAt = await this.hasColumn(table, 'deleted_at');
    if (hasDeletedAt) {
      sql += where ? ' AND deleted_at IS NULL' : ' WHERE deleted_at IS NULL';
    }

    const result = await this.query<{ count: number }>(sql, params);
    return result.rows[0].count;
  }

  async transaction<T>(callback: (db: IDatabase) => Promise<T>): Promise<T> {
    // SQLite better-sqlite3 transactions are synchronous, but we need async for interface
    // Execute the callback and return its result
    return await callback(this);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error: any) {
      logger.error(`SQLite health check failed: ${error?.message || 'Unknown error'}`);
      return false;
    }
  }

  async close(): Promise<void> {
    this.db.close();
    logger.info('SQLite database connection closed');
  }

  getType(): 'sqlite' {
    return 'sqlite';
  }

  /**
   * Check if table has a specific column
   */
  private async hasColumn(table: string, column: string): Promise<boolean> {
    try {
      const result = await this.query(
        `SELECT COUNT(*) as count FROM pragma_table_info(?) WHERE name = ?`,
        [table, column]
      );
      return result.rows[0].count > 0;
    } catch {
      return false;
    }
  }

  /**
   * Initialize schema from SQL file
   */
  private initializeSchema(): void {
    try {
      const schemaPath = path.join(process.cwd(), 'database', 'schema.sqlite.sql');
      
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        this.db.exec(schema);
        logger.info('SQLite schema initialized from file');
      } else {
        logger.warn('SQLite schema file not found, creating basic tables');
        this.createBasicTables();
      }
    } catch (error: any) {
      logger.error(`Failed to initialize SQLite schema: ${error?.message || 'Unknown error'}`);
      this.createBasicTables();
    }
  }

  /**
   * Create basic tables if schema file doesn't exist
   */
  private createBasicTables(): void {
    const tables = [
      `CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        phone_number TEXT,
        address TEXT,
        logo_url TEXT,
        industry TEXT,
        company_size TEXT,
        timezone TEXT DEFAULT 'UTC',
        subscription_plan TEXT DEFAULT 'trial',
        subscription_status TEXT DEFAULT 'active',
        is_active INTEGER DEFAULT 1,
        settings TEXT DEFAULT '{}',
        working_days TEXT DEFAULT '{"monday":true,"tuesday":true,"wednesday":true,"thursday":true,"friday":true,"saturday":false,"sunday":false}',
        work_start_time TEXT DEFAULT '09:00:00',
        work_end_time TEXT DEFAULT '17:00:00',
        auto_clockin_enabled INTEGER DEFAULT 0,
        auto_clockout_enabled INTEGER DEFAULT 0,
        grace_period_minutes INTEGER DEFAULT 15,
        office_latitude REAL,
        office_longitude REAL,
        geofence_radius_meters INTEGER DEFAULT 100,
        require_geofence_for_clockin INTEGER DEFAULT 1,
        notify_early_departure INTEGER DEFAULT 1,
        early_departure_threshold_minutes INTEGER DEFAULT 30,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        deleted_at TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        phone_number TEXT,
        avatar_url TEXT,
        role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
        employee_id TEXT,
        department_id TEXT,
        position TEXT,
        is_active INTEGER DEFAULT 1,
        email_verified INTEGER DEFAULT 0,
        last_login_at TEXT,
        settings TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        deleted_at TEXT,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        UNIQUE(company_id, email)
      )`,
    ];

    tables.forEach((sql) => {
      this.db.exec(sql);
    });

    logger.info('Basic SQLite tables created');
  }
}
