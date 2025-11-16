# Database Setup Instructions

Since I don't have direct access to execute Supabase MCP commands, here are the steps to set up your database:

## Option 1: Supabase Dashboard (Recommended for First-Time Setup)

1. **Login to Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project (hhynzmnijsqbkuvlfisq)

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Schema**
   - Copy the entire contents of `server/database/schema.sql`
   - Paste it into the SQL editor
   - Click "Run" or press Ctrl+Enter

4. **Verify Tables Created**
   - Go to "Table Editor" in the left sidebar
   - You should see all the tables listed:
     - super_admins
     - companies
     - users (with 8 partitions)
     - departments
     - attendance_records (with monthly partitions)
     - tasks
     - payment_transactions
     - subscription_plans
     - audit_logs
     - etc.

## Option 2: Run Migration Script (After Backend Setup)

1. **Setup Backend Environment**
   ```bash
   cd server
   npm install
   ```

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Fill in your Supabase credentials:
     ```env
     SUPABASE_URL=https://hhynzmnijsqbkuvlfisq.supabase.co
     SUPABASE_ANON_KEY=your_anon_key
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
     SUPER_ADMIN_EMAIL=admin@teemplot.com
     SUPER_ADMIN_PASSWORD=your_secure_password
     ```

3. **Run Migration**
   ```bash
   npm run db:migrate
   ```

   This will:
   - Create all tables with proper partitioning
   - Set up all indexes
   - Create triggers and functions
   - Seed subscription plans
   - Create super admin account

## Option 3: Manual SQL Execution (Advanced)

If you prefer to run SQL commands directly:

1. **Connect via psql**
   ```bash
   psql postgresql://postgres:[YOUR-PASSWORD]@db.hhynzmnijsqbkuvlfisq.supabase.co:5432/postgres
   ```

2. **Run Schema File**
   ```bash
   \i server/database/schema.sql
   ```

## Verify Database Setup

After running the migration, verify with these queries:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check user partitions
SELECT 
    parent.relname AS parent_table,
    child.relname AS partition_name
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname = 'users';

-- Check subscription plans
SELECT * FROM subscription_plans;

-- Check super admin
SELECT email, first_name, last_name, is_active 
FROM super_admins;
```

## Troubleshooting

### Error: Extension Already Exists
This is normal - just means extensions are already installed. Continue with the migration.

### Error: Permission Denied
Make sure you're using the SERVICE_ROLE_KEY, not the ANON_KEY.

### Error: Table Already Exists
If re-running migration, you may need to drop tables first:
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```
Then re-run the schema.

## Next Steps After Database Setup

1. ✅ Database schema created
2. ⏭️ Install backend dependencies: `cd server && npm install`
3. ⏭️ Install frontend dependencies: `cd client && npm install`
4. ⏭️ Configure all environment variables
5. ⏭️ Start backend: `npm run dev` (in server folder)
6. ⏭️ Start frontend: `npm run dev` (in client folder)
7. ⏭️ Access application at http://localhost:3000

## Database Configuration Summary

**Project**: hhynzmnijsqbkuvlfisq
**Host**: db.hhynzmnijsqbkuvlfisq.supabase.co
**Port**: 5432
**Database**: postgres

You'll need to get your password and keys from the Supabase dashboard under:
- Settings → Database → Connection string
- Settings → API → Project API keys
