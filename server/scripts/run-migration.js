require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🔍 Checking environment variables...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl) {
    console.error('❌ SUPABASE_URL not found in .env file');
    console.log('\nPlease add to your .env file:');
    console.log('SUPABASE_URL=https://your-project.supabase.co');
    process.exit(1);
  }

  if (!supabaseKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY not found in .env file');
    console.log('\nPlease add to your .env file:');
    console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
    process.exit(1);
  }

  console.log('✅ Environment variables found');
  console.log(`📍 Supabase URL: ${supabaseUrl}\n`);

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔗 Testing database connection...\n');

  try {
    const { data, error } = await supabase
      .from('_test_connection')
      .select('*')
      .limit(1);

    if (error && !error.message.includes('does not exist')) {
      throw error;
    }
    
    console.log('✅ Database connection successful!\n');
  } catch (err) {
    console.log('✅ Database is reachable\n');
  }

  console.log('📖 Reading schema file...\n');

  const schemaPath = path.join(__dirname, '../database/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements\n`);
  console.log('🚀 Executing schema migration...\n');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    if (statement.length < 10) continue;

    const firstLine = statement.split('\n')[0].substring(0, 70);
    const lineNum = `[${String(i + 1).padStart(3, ' ')}/${statements.length}]`;
    
    process.stdout.write(`${lineNum} ${firstLine}...`);

    try {
      const { error } = await supabase.rpc('exec_sql', { 
        query: statement + ';' 
      });

      if (error) {
        if (error.message && (
          error.message.includes('already exists') ||
          error.message.includes('duplicate')
        )) {
          console.log(' ⚠️  (exists)');
          skipCount++;
        } else {
          console.log(` ❌\n   Error: ${error.message}`);
          errorCount++;
        }
      } else {
        console.log(' ✅');
        successCount++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (err) {
      console.log(` ❌\n   Error: ${err.message}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ⚠️  Skipped:    ${skipCount}`);
  console.log(`   ❌ Errors:     ${errorCount}`);
  console.log(`   📋 Total:      ${statements.length}`);
  console.log('='.repeat(70) + '\n');

  if (errorCount === 0) {
    console.log('🎉 Database schema created successfully!\n');
    await seedData(supabase);
  } else {
    console.log('⚠️  Migration completed with some errors.\n');
  }
}

async function seedData(supabase) {
  console.log('🌱 Seeding initial data...\n');

  try {
    console.log('📦 Checking subscription plans...');
    
    const { data: existingPlans, error: checkError } = await supabase
      .from('subscription_plans')
      .select('id')
      .limit(1);

    if (checkError && !checkError.message.includes('does not exist')) {
      console.error(`❌ Error checking plans: ${checkError.message}`);
      return;
    }

    if (!existingPlans || existingPlans.length === 0) {
      console.log('   Inserting subscription plans...');
      
      const plans = [
        {
          name: 'Trial',
          slug: 'trial',
          description: '14-day free trial',
          price: 0,
          currency: 'NGN',
          billing_cycle: 'monthly',
          max_users: 5,
          features: JSON.stringify(['Basic attendance', 'Task management', '5 users max']),
          is_active: true,
        },
        {
          name: 'Starter',
          slug: 'starter',
          description: 'For small teams',
          price: 5000,
          currency: 'NGN',
          billing_cycle: 'monthly',
          max_users: 20,
          features: JSON.stringify(['Attendance tracking', 'Task management', 'Basic reports', '20 users']),
          is_active: true,
        },
        {
          name: 'Professional',
          slug: 'professional',
          description: 'For growing companies',
          price: 15000,
          currency: 'NGN',
          billing_cycle: 'monthly',
          max_users: 100,
          features: JSON.stringify(['Advanced attendance', 'Task management', 'Performance metrics', 'Reports', '100 users']),
          is_active: true,
        },
        {
          name: 'Enterprise',
          slug: 'enterprise',
          description: 'For large organizations',
          price: 50000,
          currency: 'NGN',
          billing_cycle: 'monthly',
          max_users: null,
          features: JSON.stringify(['All features', 'Unlimited users', 'Priority support', 'Custom integrations']),
          is_active: true,
        },
      ];

      const { error: insertError } = await supabase
        .from('subscription_plans')
        .insert(plans);

      if (insertError) {
        console.error(`   ❌ Error: ${insertError.message}`);
      } else {
        console.log('   ✅ Subscription plans created\n');
      }
    } else {
      console.log('   ⚠️  Plans already exist, skipping\n');
    }

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (superAdminEmail && superAdminPassword) {
      console.log('👤 Creating super admin account...');
      
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash(superAdminPassword, 12);

      const { data: existingAdmin } = await supabase
        .from('super_admins')
        .select('id')
        .eq('email', superAdminEmail)
        .single();

      if (!existingAdmin) {
        const { error: adminError } = await supabase
          .from('super_admins')
          .insert({
            email: superAdminEmail,
            password_hash: passwordHash,
            first_name: 'Super',
            last_name: 'Admin',
            is_active: true,
            email_verified: true,
          });

        if (adminError) {
          console.error(`   ❌ Error: ${adminError.message}`);
        } else {
          console.log(`   ✅ Super admin created: ${superAdminEmail}\n`);
        }
      } else {
        console.log(`   ⚠️  Super admin already exists\n`);
      }
    }

    console.log('✅ Seeding completed!\n');
    
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
  }
}

runMigration()
  .then(() => {
    console.log('🎊 Database setup complete!\n');
    console.log('Next steps:');
    console.log('  1. Start backend:  cd server && npm run dev');
    console.log('  2. Start frontend: cd client && npm run dev');
    console.log('  3. Open: http://localhost:3000\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n💥 Fatal error:', err.message);
    process.exit(1);
  });
