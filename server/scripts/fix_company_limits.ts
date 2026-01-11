
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function fixCompanyLimits() {
  console.log('🔧 Starting Company Limit Fix...');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // 1. Get all companies with 0 or null limits
    const companies = await client.query(`
      SELECT id, name, subscription_status, employee_count, employee_limit 
      FROM companies 
    `);

    console.log(`🔍 Found ${companies.rows.length} companies`);

    for (const company of companies.rows) {
      console.log(`📋 Checking: ${company.name} | Status: ${company.subscription_status} | Limit: ${company.employee_limit} | Count: ${company.employee_count}`);
      
      let newLimit = 5; // Default

      // Check for Trial
      if (company.subscription_status === 'trial') {
        newLimit = 50;
      } 
      // Check for user input (legacy count)
      else if (company.employee_count && parseInt(company.employee_count) > 0) {
        newLimit = parseInt(company.employee_count);
      }

      // Special case: If user declared more employees than current limit, bump it up
      if (company.employee_count && parseInt(company.employee_count) > newLimit) {
        newLimit = parseInt(company.employee_count);
      }

      // Update if limit is too low or mismatch
      if (!company.employee_limit || company.employee_limit < newLimit) {
        console.log(`🛠️ Fixing company: ${company.name} (${company.id})`);
        console.log(`   - Status: ${company.subscription_status}`);
        console.log(`   - Old Limit: ${company.employee_limit}`);
        console.log(`   - New Limit: ${newLimit}`);

        await client.query(`
          UPDATE companies 
          SET employee_limit = $1 
          WHERE id = $2
        `, [newLimit, company.id]);
        
        console.log('   ✅ Fixed');
      }
    }

    console.log('\n🎉 All companies checked and fixed!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

fixCompanyLimits();
