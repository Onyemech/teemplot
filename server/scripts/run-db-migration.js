require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runDatabaseMigration() {
  console.log('\n🚀 Teemplot Database Migration');
  console.log('='.repeat(70) + '\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔗 Testing database connection...');
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Connected successfully at:', testResult.rows[0].now);
    console.log('');

    const schemaPath = path.join(__dirname, '../database/schema.sql');
    console.log('📖 Reading schema file from:', schemaPath);
    const schema = fs.readFileSync(schemaPath, 'utf8');

    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 10 && !s.startsWith('--'));

    console.log(`✅ Parsed ${statements.length} SQL statements\n`);
    console.log('⚙️  Executing migration...\n');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.split('\n')[0].substring(0, 55);
      const counter = `[${String(i + 1).padStart(3, '0')}/${statements.length}]`;
      
      process.stdout.write(`${counter} ${preview}...`);

      try {
        await pool.query(stmt);
        console.log(' ✅');
        successCount++;
      } catch (err) {
        const msg = err.message.toLowerCase();
        if (msg.includes('already exists') || msg.includes('duplicate')) {
          console.log(' ⚠️ ');
          skipCount++;
        } else {
          console.log(' ❌');
          errorCount++;
          if (errorCount <= 3) {
            console.log(`   Error: ${err.message.split('\n')[0]}`);
          }
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Successful:  ${successCount}`);
    console.log(`⚠️  Skipped:     ${skipCount} (already exists)`);
    console.log(`❌ Errors:      ${errorCount}`);
    console.log(`📋 Total:       ${statements.length}`);
    console.log('='.repeat(70) + '\n');

    if (successCount > 0 || skipCount > statements.length / 2) {
      console.log('🌱 Seeding initial data...\n');
      
      console.log('📦 Inserting subscription plans...');
      const plans = [
        { name: 'Trial', slug: 'trial', desc: '14-day free trial', price: 0, max: 5 },
        { name: 'Starter', slug: 'starter', desc: 'For small teams', price: 5000, max: 20 },
        { name: 'Professional', slug: 'professional', desc: 'For growing companies', price: 15000, max: 100 },
        { name: 'Enterprise', slug: 'enterprise', desc: 'For large organizations', price: 50000, max: null }
      ];

      for (const plan of plans) {
        try {
          await pool.query(`
            INSERT INTO subscription_plans (name, slug, description, price, currency, billing_cycle, max_users, is_active)
            VALUES ($1, $2, $3, $4, 'NGN', 'monthly', $5, true)
            ON CONFLICT (slug) DO NOTHING
          `, [plan.name, plan.slug, plan.desc, plan.price, plan.max]);
          console.log(`   ✅ ${plan.name}`);
        } catch (e) {
          if (!e.message.includes('duplicate')) {
            console.log(`   ⚠️  ${plan.name}: ${e.message}`);
          }
        }
      }
      console.log('');

      console.log('🔍 Verifying database structure...\n');
      
      const tablesResult = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      
      console.log(`✅ ${tablesResult.rows.length} tables found:\n`);
      
      const expectedTables = {
        'super_admins': 'Platform administrators',
        'companies': 'Company accounts',
        'users': 'Users (partitioned)',
        'departments': 'Departments',
        'tasks': 'Task management',
        'attendance_records': 'Attendance (partitioned)',
        'subscription_plans': 'Pricing plans',
        'payment_transactions': 'Payment history',
        'refresh_tokens': 'Auth tokens',
        'email_verification_codes': 'Email verification',
        'invitations': 'Employee invites',
        'audit_logs': 'Audit trail (partitioned)'
      };

      const tableNames = tablesResult.rows.map(r => r.table_name);
      
      for (const [table, desc] of Object.entries(expectedTables)) {
        const exists = tableNames.some(t => t === table || t.startsWith(table + '_'));
        if (exists) {
          console.log(`   ✅ ${table.padEnd(30)} ${desc}`);
        } else {
          console.log(`   ❌ ${table.padEnd(30)} ${desc} (MISSING)`);
        }
      }
      console.log('');

      console.log('📊 Checking partitions...\n');
      const partitionsResult = await pool.query(`
        SELECT 
          parent.relname AS parent_table,
          COUNT(child.relname) as partition_count
        FROM pg_inherits
        JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
        JOIN pg_class child ON pg_inherits.inhrelid = child.oid
        WHERE parent.relname IN ('users', 'attendance_records', 'audit_logs')
        GROUP BY parent.relname
        ORDER BY parent.relname
      `);

      partitionsResult.rows.forEach(row => {
        console.log(`   ✅ ${row.parent_table.padEnd(20)} ${row.partition_count} partitions`);
      });
      console.log('');

      console.log('='.repeat(70));
      console.log('🎉 DATABASE SETUP COMPLETE!');
      console.log('='.repeat(70) + '\n');
      
      console.log('📋 Next Steps:\n');
      console.log('   1. ✅ Database schema deployed');
      console.log('   2. ✅ Initial data seeded');
      console.log('   3. 🔄 Start backend:  npm run dev');
      console.log('   4. 🔄 Start frontend: cd ../client && npm run dev');
      console.log('   5. 🌐 Open app:       http://localhost:3000\n');
      
    } else {
      console.log('⚠️  Migration incomplete. Please check errors above.\n');
    }

  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed.\n');
  }
}

runDatabaseMigration()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
