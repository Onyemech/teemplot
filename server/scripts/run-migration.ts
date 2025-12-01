import { readFileSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';

const dbPath = join(__dirname, '../database/teemplot.db');
const migrationPath = join(__dirname, '../migrations/add_geocoding_columns.sql');

console.log('🔄 Running database migration...');
console.log('Database:', dbPath);
console.log('Migration:', migrationPath);

try {
  // Read migration SQL
  const migrationSQL = readFileSync(migrationPath, 'utf-8');
  
  // Connect to database
  const db = new Database(dbPath);
  
  // Split SQL by semicolons and execute each statement
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`\n📝 Found ${statements.length} SQL statements to execute\n`);
  
  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`[${i + 1}/${statements.length}] Executing:`, statement.substring(0, 60) + '...');
    
    try {
      db.exec(statement);
      console.log(`✅ Success\n`);
    } catch (error: any) {
      // Ignore "duplicate column" errors (column already exists)
      if (error.message.includes('duplicate column')) {
        console.log(`⚠️  Column already exists, skipping\n`);
      } else {
        throw error;
      }
    }
  }
  
  // Verify columns were added
  console.log('🔍 Verifying schema...');
  const tableInfo = db.prepare('PRAGMA table_info(companies)').all();
  const columnNames = tableInfo.map((col: any) => col.name);
  
  const requiredColumns = [
    'formatted_address',
    'street_number',
    'street_name',
    'place_id',
    'geocoding_accuracy',
    'geocoding_source',
    'geocoded_at'
  ];
  
  const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
  
  if (missingColumns.length === 0) {
    console.log('✅ All geocoding columns present!');
  } else {
    console.log('❌ Missing columns:', missingColumns);
    process.exit(1);
  }
  
  db.close();
  
  console.log('\n✅ Migration completed successfully!');
  console.log('You can now restart your server.\n');
  
} catch (error: any) {
  console.error('\n❌ Migration failed:', error.message);
  console.error(error);
  process.exit(1);
}
