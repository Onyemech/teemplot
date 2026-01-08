import { IDatabase } from './IDatabase';
import { PostgresDatabase } from './PostgresDatabase';
import { ConvexDatabase } from './ConvexDatabase';
import { logger } from '../../utils/logger';

export type DatabaseType = 'postgres' | 'convex';

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
      case 'postgres':
        this.instance = new PostgresDatabase();
        break;
      case 'convex':
        this.instance = new ConvexDatabase();
        break;
      default:
        throw new Error(`Unsupported database type: ${dbType}. Only 'postgres' and 'convex' are supported.`);
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


  private static detectDatabaseType(): DatabaseType {
    const forceDb = process.env.FORCE_DATABASE_TYPE as DatabaseType;

    // Explicit override
    if (forceDb) {
      logger.info(`Database type forced to: ${forceDb}`);
      return forceDb;
    }

    // Use SQLite for tests by default
    if (process.env.NODE_ENV === 'test' && !forceDb) {
      logger.info('Using Supabase for testing environment');
      return 'postgres';
    }

    // ALWAYS use Postgres (Supabase) for all environments
    if (process.env.DATABASE_URL || process.env.SUPABASE_URL) {
      logger.info('Using Postgres (Supabase) database');
      return 'postgres';
    }

    // No fallback - require DATABASE_URL
    throw new Error('DATABASE_URL is required. Please configure Supabase connection.');
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
