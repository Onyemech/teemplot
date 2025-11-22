#!/usr/bin/env node
/**
 * Test Supabase Connection
 * This script only tests the connection without making any changes
 * Run with: node server/scripts/test-supabase-connection.js
 */

const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');

  // Check if environment variables are set
  if (!process.env.SUPABASE_URL) {
    console.error('❌ SUPABASE_URL not found in .env file');
    console.log('\n💡 Please add SUPABASE_URL to server/.env');
    process.exit(1);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY not found in .env file');
    console.log('\n💡 Please add Supabase keys to server/.env');
    process.exit(1);
  }

  console.log('✅ Environment variables found');
  console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL}`);
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '***' + process.env.SUPABASE_SERVICE_ROLE_KEY.slice(-4) : 'not set'}`);
  console.log(`   SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '***' + process.env.SUPABASE_ANON_KEY.slice(-4) : 'not set'}`);
  console.log('');

  // Build connection string
  const url = process.env.SUPABASE_URL;
  const password = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) {
    console.error('❌ Invalid SUPABASE_URL format');
    console.log('   Expected format: https://YOUR_PROJECT_REF.supabase.co');
    process.exit(1);
  }
  
  const projectRef = match[1];
  const connectionString = `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`;

  console.log('📡 Attempting to connect...');
  console.log(`   Project Ref: ${projectRef}`);
  console.log('');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000, // 10 second timeout
  });

  try {
    await client.connect();
    console.log('✅ Successfully connected to Supabase!');
    console.log('');

    // Test query
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('📊 Database Info:');
    console.log(`   Current Time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL Version: ${result.rows[0].pg_version.split(',')[0]}`);
    console.log('');

    // List existing tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('📋 Existing Tables:');
    if (tablesResult.rows.length === 0) {
      console.log('   (No tables found - database is empty)');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    }
    console.log('');

    // Check for required tables
    const requiredTables = ['companies', 'users', 'onboarding_progress', 'email_verification_codes'];
    const existingTables = tablesResult.rows.map(r => r.table_name);
    
    console.log('🔍 Required Tables Status:');
    let allTablesExist = true;
    requiredTables.forEach(table => {
      if (existingTables.includes(table)) {
        console.log(`   ✅ ${table} - exists`);
      } else {
        console.log(`   ❌ ${table} - missing`);
        allTablesExist = false;
      }
    });
    console.log('');

    if (allTablesExist) {
      console.log('✅ All required tables exist!');
      console.log('\n📋 Next steps:');
      console.log('   1. Configure Google OAuth in Supabase Dashboard');
      console.log('   2. Update client/.env with Supabase credentials');
      console.log('   3. Test the onboarding flow');
    } else {
      console.log('⚠️  Some tables are missing.');
      console.log('\n📋 Next steps:');
      console.log('   1. Run: node server/scripts/setup-supabase.js');
      console.log('   2. This will create all required tables');
    }

    await client.end();
    console.log('\n✅ Connection test complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('');
    console.log('💡 Possible reasons:');
    console.log('   1. Supabase is under maintenance');
    console.log('   2. Invalid credentials in .env file');
    console.log('   3. Network connectivity issues');
    console.log('   4. Firewall blocking connection');
    console.log('   5. Project is paused (free tier)');
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Check if you can access Supabase Dashboard');
    console.log('   2. Verify your credentials in server/.env');
    console.log('   3. Try again in a few minutes if under maintenance');
    
    await client.end().catch(() => {});
    process.exit(1);
  }
}

testConnection();
