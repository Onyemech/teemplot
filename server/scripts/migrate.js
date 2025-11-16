#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting database migration...\n');

  try {
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.length < 10) continue;

      const preview = statement.substring(0, 60).replace(/\n/g, ' ');
      process.stdout.write(`[${i + 1}/${statements.length}] ${preview}...`);

      try {
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        });

        if (error) {
          if (error.message.includes('already exists')) {
            console.log(' ⚠️  (already exists)');
          } else {
            throw error;
          }
        } else {
          console.log(' ✅');
          successCount++;
        }
      } catch (err) {
        console.log(` ❌ Error: ${err.message}`);
        errorCount++;
        
        if (err.message.includes('does not exist') || 
            err.message.includes('already exists')) {
          continue;
        }
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📋 Total: ${statements.length}\n`);

    console.log('🎉 Database migration completed!\n');
    
    await seedInitialData();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function seedInitialData() {
  console.log('🌱 Seeding initial data...\n');

  try {
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('count');

    if (!plansError && plans && plans.length === 0) {
      console.log('📦 Inserting subscription plans...');
      
      const { error: insertError } = await supabase
        .from('subscription_plans')
        .insert([
          {
            name: 'Trial',
            slug: 'trial',
            description: '14-day free trial',
            price: 0,
            currency: 'NGN',
            billing_cycle: 'monthly',
            max_users: 5,
            features: ['Basic attendance', 'Task management', '5 users max'],
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
            features: ['Attendance tracking', 'Task management', 'Basic reports', '20 users'],
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
            features: ['Advanced attendance', 'Task management', 'Performance metrics', 'Reports', '100 users'],
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
            features: ['All features', 'Unlimited users', 'Priority support', 'Custom integrations'],
            is_active: true,
          },
        ]);

      if (insertError) {
        console.error('❌ Error inserting subscription plans:', insertError);
      } else {
        console.log('✅ Subscription plans inserted successfully\n');
      }
    } else {
      console.log('⚠️  Subscription plans already exist, skipping...\n');
    }

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (superAdminEmail && superAdminPassword) {
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash(superAdminPassword, 12);

      console.log('👤 Creating super admin account...');
      
      const { error: adminError } = await supabase
        .from('super_admins')
        .upsert({
          email: superAdminEmail,
          password_hash: passwordHash,
          first_name: 'Super',
          last_name: 'Admin',
          is_active: true,
          email_verified: true,
        }, {
          onConflict: 'email',
        });

      if (adminError) {
        console.error('❌ Error creating super admin:', adminError);
      } else {
        console.log('✅ Super admin account ready\n');
      }
    }

    console.log('✅ Initial data seeding completed!\n');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
}

runMigration()
  .then(() => {
    console.log('🎊 All done! Your database is ready to use.\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
  });
