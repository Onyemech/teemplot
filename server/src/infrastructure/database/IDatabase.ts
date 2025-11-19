/**
 * Database abstraction interface for loose coupling
 * Supports: PostgreSQL (Supabase), SQLite (local dev), Convex (backup)
 */

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface IDatabase {
  /**
   * Execute a raw SQL query
   */
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;

  /**
   * Insert a record
   */
  insert<T = any>(table: string, data: Partial<T>): Promise<T>;

  /**
   * Update records
   */
  update<T = any>(
    table: string,
    data: Partial<T>,
    where: Record<string, any>
  ): Promise<T[]>;

  /**
   * Delete records (soft delete if deleted_at column exists)
   */
  delete(table: string, where: Record<string, any>): Promise<number>;

  /**
   * Find records
   */
  find<T = any>(
    table: string,
    where?: Record<string, any>,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      select?: string[];
    }
  ): Promise<T[]>;

  /**
   * Find one record
   */
  findOne<T = any>(table: string, where: Record<string, any>): Promise<T | null>;

  /**
   * Count records
   */
  count(table: string, where?: Record<string, any>): Promise<number>;

  /**
   * Execute in transaction
   */
  transaction<T>(callback: (db: IDatabase) => Promise<T>): Promise<T>;

  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;

  /**
   * Close connection
   */
  close(): Promise<void>;

  /**
   * Get database type
   */
  getType(): 'postgres' | 'sqlite' | 'convex';
}
