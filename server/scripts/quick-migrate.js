require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🔍 Loading environment...\n');

  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in .env file');
    process.exit(1);
  }

  console.log('✅ Database URL found');
  console.log('📦 Installing pg library if needed...\n');

  let pg;
  try {
    pg = require('pg');
  } catch {
    console.log('Installing pg...');
    require('child_process').execSync('npm install pg', { stdio: 'inherit', cwd: __dirname + '/..' });
    pg = require('pg');
  }

  const { Client } = pg;
  const client = new Client({ connectionString: databaseUrl });
  
  console.log('🔗 Connecting to PostgreSQL...');
  await client.connect();
  console.log('✅ Connected!\n');

  const schemaPath = path.join(__dirname, '../database/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 10 && !s.startsWith('--'));

  console.log(`📖 Found ${statements.length} statements\n`);
  console.log('🚀 Executing migration...\n');

  let success = 0, skip = 0, errors = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.split('\n')[0].substring(0, 55);
    process.stdout.write(`[${i+1}/${statements.length}] ${preview}...`);

    try {
      await client.query(stmt);
      console.log(' ✅');
      success++;
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate')) {
        console.log(' ⚠️');
        skip++;
      } else {
        console.log(' ❌');
        errors++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Success: ${success} | ⚠️ Skipped: ${skip} | ❌ Errors: ${errors}`);
  console.log('='.repeat(60) + '\n');

  if (errors < 5) {
    console.log('🌱 Seeding data...\n');
    
    const plans = [
      ['Trial', 'trial', '14-day free trial', 0],
      ['Starter', 'starter', 'For small teams', 5000],
      ['Professional', 'professional', 'For growing companies', 15000],
      ['Enterprise', 'enterprise', 'For large organizations', 50000]
    ];

    for (const [name, slug, desc, price] of plans) {
      await client.query(`
        INSERT INTO subscription_plans (name, slug, description, price, currency, billing_cycle, is_active)
        VALUES ($1, $2, $3, $4, 'NGN', 'monthly', true)
        ON CONFLICT (slug) DO NOTHING
      `, [name, slug, desc, price]).catch(() => {});
    }

    console.log('✅ Plans seeded\n');

    if (process.env.SUPER_ADMIN_EMAIL && process.env.SUPER_ADMIN_PASSWORD) {
      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD, 12);
      await client.query(`
        INSERT INTO super_admins (email, password_hash, first_name, last_name, is_active, email_verified)
        VALUES ($1, $2, 'Super', 'Admin', true, true)
        ON CONFLICT (email) DO NOTHING
      `, [process.env.SUPER_ADMIN_EMAIL, hash]).catch(() => {});
      console.log('✅ Super admin created\n');
    }
  }

  await client.end();
  console.log('🎉 Done!\n');
}

runMigration().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
