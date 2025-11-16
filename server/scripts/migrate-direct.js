require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('\n🚀 Teemplot Database Migration\n');
  console.log('='.repeat(60) + '\n');

  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in .env file\n');
    process.exit(1);
  }

  console.log('✅ Database URL: Configured');
  
  let Client;
  try {
    Client = require('pg').Client;
    console.log('✅ pg library: Available\n');
  } catch (e) {
    console.error('❌ pg library not installed');
    console.log('\nPlease run: npm install pg\n');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  
  console.log('🔗 Connecting to database...');
  try {
    await client.connect();
    console.log('✅ Connected successfully!\n');
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, '../database/schema.sql');
  console.log('📖 Reading schema file...');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 10 && !s.startsWith('--'));

  console.log(`✅ Found ${statements.length} SQL statements\n`);
  console.log('⚙️  Executing migration...\n');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.split('\n')[0].substring(0, 50);
    const counter = `[${String(i + 1).padStart(3, ' ')}/${statements.length}]`;
    
    process.stdout.write(`${counter} ${preview}...`);

    try {
      await client.query(stmt);
      console.log(' ✅');
      successCount++;
    } catch (err) {
      const msg = err.message.toLowerCase();
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        console.log(' ⚠️');
        skipCount++;
      } else {
        console.log(' ❌');
        errorCount++;
        errors.push({ statement: preview, error: err.message.split('\n')[0] });
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Successful:  ${successCount}`);
  console.log(`⚠️  Skipped:     ${skipCount} (already exists)`);
  console.log(`❌ Errors:      ${errorCount}`);
  console.log(`📋 Total:       ${statements.length}`);
  console.log('='.repeat(60) + '\n');

  if (errorCount > 0 && errorCount < 10) {
    console.log('⚠️  Errors encountered:\n');
    errors.forEach((e, i) => {
      console.log(`${i + 1}. ${e.statement}`);
      console.log(`   Error: ${e.error}\n`);
    });
  }

  if (errorCount === 0 || errorCount < 5) {
    console.log('🌱 Seeding initial data...\n');
    
    try {
      const plans = [
        ['Trial', 'trial', '14-day free trial', 0, 5],
        ['Starter', 'starter', 'For small teams', 5000, 20],
        ['Professional', 'professional', 'For growing companies', 15000, 100],
        ['Enterprise', 'enterprise', 'For large organizations', 50000, null]
      ];

      console.log('📦 Creating subscription plans...');
      for (const [name, slug, desc, price, maxUsers] of plans) {
        try {
          await client.query(`
            INSERT INTO subscription_plans (name, slug, description, price, currency, billing_cycle, max_users, is_active)
            VALUES ($1, $2, $3, $4, 'NGN', 'monthly', $5, true)
            ON CONFLICT (slug) DO NOTHING
          `, [name, slug, desc, price, maxUsers]);
        } catch (e) {
          if (!e.message.includes('duplicate')) {
            console.log(`   ⚠️  ${name}: ${e.message}`);
          }
        }
      }
      console.log('✅ Subscription plans ready\n');

    } catch (err) {
      console.log('⚠️  Seeding warning:', err.message, '\n');
    }

    console.log('👤 Super admin account...');
    if (process.env.SUPER_ADMIN_EMAIL) {
      console.log('   ℹ️  To create super admin, you need bcrypt installed');
      console.log('   Run: npm install bcrypt');
      console.log(`   Then use: email=${process.env.SUPER_ADMIN_EMAIL}\n`);
    } else {
      console.log('   ℹ️  Set SUPER_ADMIN_EMAIL in .env to auto-create\n');
    }
  }

  console.log('🔍 Verifying tables...\n');
  
  try {
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`✅ ${result.rows.length} tables created:\n`);
    const tables = result.rows.map(r => r.table_name);
    
    const coreTables = ['super_admins', 'companies', 'users', 'departments', 'tasks', 
                        'attendance_records', 'subscription_plans', 'payment_transactions'];
    
    coreTables.forEach(table => {
      if (tables.some(t => t === table || t.startsWith(table + '_'))) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table} (missing)`);
      }
    });
    console.log();

  } catch (err) {
    console.log('⚠️  Could not verify tables:', err.message, '\n');
  }

  await client.end();
  
  console.log('='.repeat(60));
  console.log('🎉 Database migration complete!');
  console.log('='.repeat(60) + '\n');
  
  console.log('📋 Next steps:\n');
  console.log('   1. Verify tables in Supabase dashboard');
  console.log('   2. Start backend:  npm run dev');
  console.log('   3. Start frontend: cd ../client && npm run dev');
  console.log('   4. Open app:       http://localhost:3000\n');
}

runMigration()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n💥 Fatal error:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
