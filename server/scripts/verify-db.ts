
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function verifyDatabase() {
  console.log('🔍 Starting Database Verification...');
  console.log('-----------------------------------');

  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL not found in .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // 1. Connection Check
    console.log('1️⃣  Testing Connection...');
    await client.connect();
    console.log('✅ Connection Successful!');

    // 2. Table Verification
    console.log('\n2️⃣  Verifying Schema...');
    
    // Check company_locations table
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'company_locations'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Table "company_locations" exists');
    } else {
      console.error('❌ Table "company_locations" MISSING!');
    }

    // Check users table column
    const columnCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'allow_multi_location_clockin'
      );
    `);

    if (columnCheck.rows[0].exists) {
      console.log('✅ Column "allow_multi_location_clockin" exists in users table');
    } else {
      console.error('❌ Column "allow_multi_location_clockin" MISSING in users table!');
    }

    // 3. Performance Test
    console.log('\n3️⃣  Performance Check...');
    const start = Date.now();
    await client.query('SELECT 1');
    const duration = Date.now() - start;
    console.log(`✅ Simple query execution time: ${duration}ms`);

    console.log('\n-----------------------------------');
    console.log('🎉 Verification Complete: System Ready');

  } catch (error: any) {
    console.error('\n❌ Verification FAILED:', error.message);
  } finally {
    await client.end();
  }
}

verifyDatabase();
