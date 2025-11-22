#!/usr/bin/env ts-node

/**
 * Database Initialization Script
 * 
 * This script initializes the database schema for development.
 * Run with: npm run init-db
 */

import { DatabaseFactory } from '../src/infrastructure/database/DatabaseFactory';
import { logger } from '../src/utils/logger';
import fs from 'fs';
import path from 'path';

async function initializeDatabase() {
  logger.info('Starting database initialization...');

  try {
    const db = DatabaseFactory.getPrimaryDatabase();
    const dbType = db.getType();

    logger.info(`Database type: ${dbType}`);

    if (dbType === 'sqlite') {
      // SQLite initialization
      const schemaPath = path.join(__dirname, '../../database/schema.sqlite.sql');
      
      if (fs.existsSync(schemaPath)) {
        logger.info('Loading SQLite schema from file...');
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        
        // Split by semicolon and execute each statement
        const statements = schema
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
          try {
            await db.query(statement);
          } catch (error: any) {
            // Ignore "table already exists" errors
            if (!error.message.includes('already exists')) {
              logger.error(`Failed to execute statement: ${error.message}`);
            }
          }
        }

        logger.info('✅ SQLite schema initialized successfully');
      } else {
        logger.error('❌ SQLite schema file not found');
        process.exit(1);
      }
    } else if (dbType === 'postgres') {
      // PostgreSQL initialization
      const schemaPath = path.join(__dirname, '../../database/schema.sql');
      
      if (fs.existsSync(schemaPath)) {
        logger.info('Loading PostgreSQL schema from file...');
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        
        await db.query(schema);
        logger.info('✅ PostgreSQL schema initialized successfully');
      } else {
        logger.error('❌ PostgreSQL schema file not found');
        process.exit(1);
      }
    }

    // Verify tables exist
    logger.info('Verifying tables...');
    
    const tables = [
      'companies',
      'users',
      'email_verification_codes',
      'departments',
      'tasks',
      'attendance_records',
      'notifications',
    ];

    for (const table of tables) {
      try {
        const result = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
        logger.info(`✅ Table '${table}' exists (${result.rows[0].count} rows)`);
      } catch (error: any) {
        logger.error(`❌ Table '${table}' not found: ${error.message}`);
      }
    }

    logger.info('✅ Database initialization complete!');
    process.exit(0);
  } catch (error: any) {
    logger.error(`❌ Database initialization failed: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Run initialization
initializeDatabase();
