/**
 * Migration Script: Add Geocoding Columns
 * 
 * Adds geocoding-related columns to the companies table
 */

const { DatabaseFactory } = require('../dist/infrastructure/database/DatabaseFactory');
const { logger } = require('../dist/utils/logger');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  logger.info('Starting geocoding columns migration...');

  try {
    const db = DatabaseFactory.getPrimaryDatabase();
    const dbType = db.getType();

    logger.info(`Database type: ${dbType}`);

    // Read migration file
    const migrationPath = path.join(__dirname, '../database/migrations/add_geocoding_columns.sql');
    
    if (!fs.existsSync(migrationPath)) {
      logger.error('❌ Migration file not found');
      process.exit(1);
    }

    const migration = fs.readFileSync(migrationPath, 'utf-8');
    
    // Split by semicolon and execute each statement
    const statements = migration
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    logger.info(`Executing ${statements.length} migration statements...`);

    for (const statement of statements) {
      try {
        await db.query(statement);
        logger.info(`✅ Executed: ${statement.substring(0, 50)}...`);
      } catch (error) {
        // Ignore "duplicate column" errors (column already exists)
        if (error.message.includes('duplicate column') || error.message.includes('already exists')) {
          logger.info(`⚠️  Column already exists, skipping: ${statement.substring(0, 50)}...`);
        } else {
          logger.error(`❌ Failed to execute statement: ${error.message}`);
          logger.error(`Statement: ${statement}`);
          throw error;
        }
      }
    }

    // Verify columns exist
    logger.info('Verifying new columns...');
    
    const testQuery = `
      SELECT 
        formatted_address,
        street_number,
        street_name,
        place_id,
        geocoding_accuracy,
        geocoding_source,
        geocoded_at
      FROM companies
      LIMIT 1
    `;

    try {
      await db.query(testQuery);
      logger.info('✅ All geocoding columns verified successfully!');
    } catch (error) {
      logger.error(`❌ Column verification failed: ${error.message}`);
      throw error;
    }

    logger.info('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error(`❌ Migration failed: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Run migration
runMigration();
