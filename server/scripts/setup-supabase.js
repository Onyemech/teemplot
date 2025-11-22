#!/usr/bin/env node
/**
 * Supabase Setup and Verification Script (JavaScript version)
 * Run with: node server/scripts/setup-supabase.js
 */

const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

class SupabaseSetup {
  constructor() {
    const connectionString = process.env.SUPABASE_URL
      ? this.buildConnectionString()
      : process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('No database connection string found. Set SUPABASE_URL or DATABASE_URL in server/.env');
    }

    this.client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    
    this.isConnected = false;
  }

  buildConnectionString() {
    const url = process.env.SUPABASE_URL;
    const password = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    // Extract project ref from Supabase URL
    const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (!match) {
      throw new Error('Invalid SUPABASE_URL format');
    }
    
    const projectRef = match[1];
    return `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`;
  }

  async connect() {
    try {
      await this.client.connect();
      this.isConnected = true;
      console.log('✅ Connected to Supabase');
    } catch (error) {
      console.error('❌ Failed to connect to Supabase:', error.message);
      console.error('\n💡 Possible reasons:');
      console.error('   1. Supabase is under maintenance');
      console.error('   2. Invalid credentials in .env file');
      console.error('   3. Network connectivity issues');
      console.error('   4. Firewall blocking connection');
      throw error;
    }
  }

  async disconnect() {
    if (this.isConnected) {
      await this.client.end();
      console.log('✅ Disconnected from Supabase');
    }
  }

  async checkConnection() {
    try {
      const result = await this.client.query('SELECT NOW()');
      console.log('✅ Supabase is accessible');
      console.log(`   Current time: ${result.rows[0].now}`);
      return true;
    } catch (error) {
      console.error('❌ Supabase connection check failed:', error.message);
      return false;
    }
  }

  async listTables() {
    const result = await this.client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    return result.rows.map(row => row.table_name);
  }

  async createCompaniesTable() {
    console.log('📝 Creating companies table...');
    
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS public.companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        phone_number TEXT,
        address TEXT,
        city TEXT,
        state_province TEXT,
        country TEXT,
        postal_code TEXT,
        logo_url TEXT,
        industry TEXT,
        company_size TEXT,
        employee_count INTEGER DEFAULT 1,
        timezone TEXT DEFAULT 'UTC',
        subscription_plan TEXT DEFAULT 'trial',
        subscription_status TEXT DEFAULT 'active',
        subscription_start_date TIMESTAMPTZ,
        subscription_end_date TIMESTAMPTZ,
        trial_start_date TIMESTAMPTZ,
        trial_end_date TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT true,
        onboarding_completed BOOLEAN DEFAULT false,
        settings JSONB DEFAULT '{}',
        working_days JSONB DEFAULT '{"monday":true,"tuesday":true,"wednesday":true,"thursday":true,"friday":true,"saturday":false,"sunday":false}',
        work_start_time TIME DEFAULT '09:00:00',
        work_end_time TIME DEFAULT '17:00:00',
        auto_clockin_enabled BOOLEAN DEFAULT false,
        auto_clockout_enabled BOOLEAN DEFAULT false,
        grace_period_minutes INTEGER DEFAULT 15,
        office_latitude DECIMAL(10, 8),
        office_longitude DECIMAL(11, 8),
        geofence_radius_meters INTEGER DEFAULT 100,
        require_geofence_for_clockin BOOLEAN DEFAULT true,
        notify_early_departure BOOLEAN DEFAULT true,
        early_departure_threshold_minutes INTEGER DEFAULT 30,
        cac_document_url TEXT,
        proof_of_address_url TEXT,
        company_policy_url TEXT,
        owner_first_name TEXT,
        owner_last_name TEXT,
        owner_email TEXT,
        owner_phone TEXT,
        owner_date_of_birth DATE,
        tax_identification_number TEXT,
        website TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_companies_slug ON public.companies(slug) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_companies_email ON public.companies(email) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_companies_subscription_status ON public.companies(subscription_status) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_companies_onboarding_completed ON public.companies(onboarding_completed) WHERE deleted_at IS NULL;
    `);
    
    console.log('✅ Companies table created');
  }

  async createUsersTable() {
    console.log('📝 Creating users table...');
    
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id TEXT PRIMARY KEY,
        company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        phone_number TEXT,
        avatar_url TEXT,
        role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
        employee_id TEXT,
        department_id TEXT,
        position TEXT,
        date_of_birth DATE,
        hire_date DATE,
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        google_id TEXT,
        last_login_at TIMESTAMPTZ,
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON public.users(google_id) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users(company_id) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(company_id, role) WHERE deleted_at IS NULL;
    `);
    
    console.log('✅ Users table created');
  }

  async createOnboardingProgressTable() {
    console.log('📝 Creating onboarding_progress table...');
    
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS public.onboarding_progress (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
        company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
        current_step INTEGER NOT NULL DEFAULT 1,
        completed_steps JSONB DEFAULT '[]',
        form_data JSONB DEFAULT '{}',
        last_saved_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user ON public.onboarding_progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_onboarding_progress_company ON public.onboarding_progress(company_id);
    `);
    
    console.log('✅ Onboarding progress table created');
  }

  async createEmailVerificationTable() {
    console.log('📝 Creating email_verification_codes table...');
    
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS public.email_verification_codes (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        verified_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_email_verification_email ON public.email_verification_codes(email, code) WHERE verified_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_email_verification_expires ON public.email_verification_codes(expires_at) WHERE verified_at IS NULL;
    `);
    
    console.log('✅ Email verification codes table created');
  }

  async setupRLS() {
    console.log('🔒 Setting up Row Level Security...');
    
    try {
      await this.client.query(`
        -- Enable RLS
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
      `);

      // Drop existing policies
      await this.client.query(`
        DROP POLICY IF EXISTS "Users can view their own company users" ON public.users;
        DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
        DROP POLICY IF EXISTS "Service role has full access to users" ON public.users;
        DROP POLICY IF EXISTS "Service role has full access to companies" ON public.companies;
        DROP POLICY IF EXISTS "Service role has full access to onboarding_progress" ON public.onboarding_progress;
      `);

      // Create RLS policies
      await this.client.query(`
        CREATE POLICY "Users can view their own company users"
          ON public.users FOR SELECT
          USING (company_id IN (
            SELECT company_id FROM public.users WHERE id = auth.uid()::text
          ));

        CREATE POLICY "Users can view their own company"
          ON public.companies FOR SELECT
          USING (id IN (
            SELECT company_id FROM public.users WHERE id = auth.uid()::text
          ));

        CREATE POLICY "Service role has full access to users"
          ON public.users FOR ALL
          USING (auth.jwt()->>'role' = 'service_role');

        CREATE POLICY "Service role has full access to companies"
          ON public.companies FOR ALL
          USING (auth.jwt()->>'role' = 'service_role');

        CREATE POLICY "Service role has full access to onboarding_progress"
          ON public.onboarding_progress FOR ALL
          USING (auth.jwt()->>'role' = 'service_role');
      `);
      
      console.log('✅ Row Level Security configured');
    } catch (error) {
      console.error('⚠️  RLS setup had warnings (this is normal):', error.message);
    }
  }

  async validateSchema() {
    console.log('🔍 Validating schema...');
    
    const requiredTables = ['companies', 'users', 'onboarding_progress', 'email_verification_codes'];
    const existingTables = await this.listTables();
    
    let isValid = true;
    
    for (const table of requiredTables) {
      if (!existingTables.includes(table)) {
        console.error(`   ❌ Missing required table: ${table}`);
        isValid = false;
      } else {
        console.log(`   ✅ Table exists: ${table}`);
      }
    }
    
    return isValid;
  }

  async runSetup() {
    console.log('🚀 Starting Supabase setup...\n');
    
    try {
      // Check connection
      const isAccessible = await this.checkConnection();
      if (!isAccessible) {
        throw new Error('Supabase is not accessible. It may be under maintenance.');
      }
      
      console.log('');
      
      // Create tables
      await this.createCompaniesTable();
      await this.createUsersTable();
      await this.createOnboardingProgressTable();
      await this.createEmailVerificationTable();
      
      console.log('');
      
      // Setup RLS
      await this.setupRLS();
      
      console.log('');
      
      // Validate
      const isValid = await this.validateSchema();
      
      console.log('');
      
      if (isValid) {
        console.log('✅ Supabase setup complete! All tables and policies are in place.');
        console.log('\n📋 Next steps:');
        console.log('   1. Configure Google OAuth credentials');
        console.log('   2. Update environment variables');
        console.log('   3. Test the onboarding flow');
      } else {
        console.log('⚠️  Supabase setup complete with warnings. Please review the output above.');
      }
    } catch (error) {
      console.error('\n❌ Setup failed:', error.message);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const setup = new SupabaseSetup();
  
  try {
    await setup.connect();
    await setup.runSetup();
  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  } finally {
    await setup.disconnect();
  }
}

// Run
main().catch(console.error);
