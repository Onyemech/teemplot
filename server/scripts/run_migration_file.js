#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ Missing DATABASE_URL in .env file');
  process.exit(1);
}

const client = new Client({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  const migrationFile = process.argv[2];
  if (!migrationFile) {
    console.error('❌ Please provide a migration file path');
    process.exit(1);
  }

  const absolutePath = path.resolve(migrationFile);
  console.log(`🚀 Starting migration from ${path.basename(absolutePath)}...`);

  try {
    await client.connect();
    const schema = fs.readFileSync(absolutePath, 'utf8');

    console.log(`📝 Executing SQL...`);
    
    // Postgres allows multiple statements in one query
    await client.query(schema);

    console.log('✅ Migration executed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
  });
