import { IDatabase } from './IDatabase';
import { PostgresDatabase } from './PostgresDatabase';
import { SQLiteDatabase } from './SQLiteDatabase';
import { ConvexDatabase } from './ConvexDatabase';
import { logger } from '../../utils/logger';

export type DatabaseType = 'postgres' | 'sqlite' | 'convex';

export class DatabaseFactory {
  private static instance: IDatabase | null = null;
  private static backupInstance: IDatabase | null = null;

  /**
   * Get primary database instance based on environment
   */
  static getPrimaryDatabase(): IDatabase {
    if (this.instance) {
      return this.instance;
    }

    const env = process.env.NODE_ENV || 'development';
    const dbType = this.detectDatabaseType();

    logger.info(`Initializing ${dbType} database for ${env} environment`);

    switch (dbType) {
      case 'sqlite':
        this.instance = new SQLiteDatabase();
        break;
      case 'postgres':
        this.instance = new PostgresDatabase();
        break;
      case 'convex':
        this.instance = new ConvexDatabase();
        break;
      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }

    return this.instance;
  }

  /**
   * Get backup database (Convex)
   */
  static getBackupDatabase(): IDatabase | null {
    if (!process.env.CONVEX_DEPLOYMENT_URL) {
      logger.warn('Convex backup database not configured');
      return null;
    }

    if (this.backupInstance) {
      return this.backupInstance;
    }

    this.backupInstance = new ConvexDatabase();
    logger.info('Convex backup database initialized');

    return this.backupInstance;
  }

  /**
   * Smart detection of database type based on environment
   */
  private static detectDatabaseType(): DatabaseType {
    const env = process.env.NODE_ENV;
    const forceDb = process.env.FORCE_DATABASE_TYPE as DatabaseType;

    // Explicit override
    if (forceDb) {
      logger.info(`Database type forced to: ${forceDb}`);
      return forceDb;
    }

    // Development: Use SQLite for easy local development
    if (env === 'development' || env === 'test') {
      if (process.env.DEV_DATABASE_URL?.includes('sqlite')) {
        return 'sqlite';
      }
      // Check if SQLite file exists
      const fs = require('fs');
      const sqlitePath = process.env.SQLITE_PATH || './data/teemplot.db';
      if (fs.existsSync(sqlitePath) || !process.env.DATABASE_URL) {
        return 'sqlite';
      }
    }

    // Production: Use Supabase (Postgres)
    if (process.env.DATABASE_URL || process.env.SUPABASE_URL) {
      return 'postgres';
    }

    // Fallback to SQLite
    logger.warn('No database configured, falling back to SQLite');
    return 'sqlite';
  }

  /**
   * Sync data from primary to backup database
   */
  static async syncToBackup(table: string, data: any): Promise<void> {
    const backup = this.getBackupDatabase();
    if (!backup) {
      return;
    }

    try {
      await backup.insert(table, data);
      logger.debug(`Synced data to backup: ${table}`);
    } catch (error: any) {
      logger.error(`Failed to sync to backup: ${table} - ${error?.message || 'Unknown error'}`);
      // Don't throw - backup sync should not break primary operations
    }
  }

  /**
   * Health check for all databases
   */
  static async healthCheck(): Promise<{
    primary: boolean;
    backup: boolean;
    type: DatabaseType;
  }> {
    const primary = this.getPrimaryDatabase();
    const backup = this.getBackupDatabase();

    const primaryHealth = await primary.healthCheck();
    const backupHealth = backup ? await backup.healthCheck() : false;

    return {
      primary: primaryHealth,
      backup: backupHealth,
      type: this.detectDatabaseType(),
    };
  }

  /**
   * Close all database connections
   */
  static async closeAll(): Promise<void> {
    if (this.instance) {
      await this.instance.close();
      this.instance = null;
    }

    if (this.backupInstance) {
      await this.backupInstance.close();
      this.backupInstance = null;
    }

    logger.info('All database connections closed');
  }
}
