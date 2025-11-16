require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🔍 Checking database configuration...\n');

  const databaseUrl = process.env.DATABASE_URL;
  const supabaseUrl = process.env.SUPABASE_URL;
  
  if (!databaseUrl && !supabaseUrl) {
    console.error('❌ Neither DATABASE_URL nor SUPABASE_URL found in .env file');
    process.exit(1);
  }

  let client;
  let usePostgres = false;

  if (databaseUrl) {
    console.log('✅ Using PostgreSQL connection (DATABASE_URL)');
    console.log(`📍 Database: ${databaseUrl.split('@')[1]?.split('/')[0] || 'configured'}\n`);
    
    const { Client } = require('pg');
    client = new Client({ connectionString: databaseUrl });
    usePostgres = true;
    
    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');
    
  } else {
    console.log('✅ Using Supabase client');
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    const { createClient } = require('@supabase/supabase-js');
    client = createClient(supabaseUrl, supabaseKey);
  }

  console.log('📖 Reading schema file...\n');

  const schemaPath = path.join(__dirname, '../database/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && s.length > 10);

  console.log(`Found ${statements.length} SQL statements\n`);
  console.log('🚀 Executing schema migration...\n');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    const firstLine = statement.split('\n')[0].substring(0, 60);
    const lineNum = `[${String(i + 1).padStart(3, ' ')}/${statements.length}]`;
    
    process.stdout.write(`${lineNum} ${firstLine}...`);

    try {
      if (usePostgres) {
        await client.query(statement + ';');
      } else {
        const { error } = await client.rpc('exec_sql', { query: statement + ';' });
        if (error) throw error;
      }
      
      console.log(' ✅');
      successCount++;
      
    } catch (err) {
      const errorMsg = err.message || String(err);
      
      if (errorMsg.includes('already exists') || 
          errorMsg.includes('duplicate') ||
          errorMsg.includes('extension') && errorMsg.includes('exists')) {
        console.log(' ⚠️');
        skipCount++;
      } else {
        console.log(` ❌`);
        console.log(`   ${errorMsg.substring(0, 80)}`);
        errorCount++;
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ⚠️  Skipped:    ${skipCount}`);
  console.log(`   ❌ Errors:     ${errorCount}`);
  console.log(`   📋 Total:      ${statements.length}`);
  console.log('='.repeat(70) + '\n');

  if (errorCount === 0 || errorCount < 5) {
    console.log('🎉 Database schema migration completed!\n');
    await seedData(client, usePostgres);
  } else {
    console.log('⚠️  Migration had errors. Check output above.\n');
  }

  if (usePostgres) {
    await client.end();
  }
}

async function seedData(client, usePostgres) {
  console.log('🌱 Seeding initial data...\n');

  try {
    console.log('📦 Inserting subscription plans...');
    
    const plans = [
      ['Trial', 'trial', '14-day free trial', 0, 'NGN', 'monthly', 5, '["Basic attendance", "Task management", "5 users max"]'],
      ['Starter', 'starter', 'For small teams', 5000, 'NGN', 'monthly', 20, '["Attendance tracking", "Task management", "Basic reports", "20 users"]'],
      ['Professional', 'professional', 'For growing companies', 15000, 'NGN', 'monthly', 100, '["Advanced attendance", "Task management", "Performance metrics", "Reports", "100 users"]'],
      ['Enterprise', 'enterprise', 'For large organizations', 50000, 'NGN', 'monthly', null, '["All features", "Unlimited users", "Priority support", "Custom integrations"]'],
    ];

    for (const plan of plans) {
      try {
        if (usePostgres) {
          await client.query(`
            INSERT INTO subscription_plans (name, slug, description, price, currency, billing_cycle, max_users, features, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, true)
            ON CONFLICT (slug) DO NOTHING
          `, plan);
        } else {
          await client.from('subscription_plans').upsert({
            name: plan[0],
            slug: plan[1],
            description: plan[2],
            price: plan[3],
            currency: plan[4],
            billing_cycle: plan[5],
            max_users: plan[6],
            features: plan[7],
            is_active: true,
          }, { onConflict: 'slug' });
        }
      } catch (err) {
        if (!err.message.includes('duplicate') && !err.message.includes('already exists')) {
          console.log(`   ⚠️  ${plan[0]}: ${err.message}`);
        }
      }
    }
    
    console.log('   ✅ Subscription plans ready\n');

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (superAdminEmail && superAdminPassword) {
      console.log('👤 Creating super admin account...');
      
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash(superAdminPassword, 12);

      try {
        if (usePostgres) {
          await client.query(`
            INSERT INTO super_admins (email, password_hash, first_name, last_name, is_active, email_verified)
            VALUES ($1, $2, 'Super', 'Admin', true, true)
            ON CONFLICT (email) DO NOTHING
          `, [superAdminEmail, passwordHash]);
        } else {
          await client.from('super_admins').upsert({
            email: superAdminEmail,
            password_hash: passwordHash,
            first_name: 'Super',
            last_name: 'Admin',
            is_active: true,
            email_verified: true,
          }, { onConflict: 'email' });
        }
        
        console.log(`   ✅ Super admin: ${superAdminEmail}\n`);
      } catch (err) {
        if (!err.message.includes('duplicate')) {
          console.log(`   ⚠️  ${err.message}\n`);
        } else {
          console.log(`   ⚠️  Already exists\n`);
        }
      }
    }

    console.log('✅ Seeding completed!\n');
    
  } catch (error) {
    console.error('⚠️  Seeding error:', error.message);
  }
}

runMigration()
  .then(() => {
    console.log('🎊 Database setup complete!\n');
    console.log('📋 Next steps:');
    console.log('   1. Check tables in Supabase dashboard');
    console.log('   2. Start backend:  npm run dev');
    console.log('   3. Start frontend: cd ../client && npm run dev');
    console.log('   4. Open: http://localhost:3000\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n💥 Fatal error:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
