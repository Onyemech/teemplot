const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'teemplot.db');
console.log(`Applying geocoding migration to: ${dbPath}`);

try {
  const db = new Database(dbPath);
  
  // Check if columns already exist
  const tableInfo = db.prepare("PRAGMA table_info(companies)").all();
  const existingColumns = tableInfo.map(col => col.name);
  
  console.log('Existing columns:', existingColumns);
  
  // Add columns if they don't exist
  const columnsToAdd = [
    { name: 'formatted_address', type: 'TEXT' },
    { name: 'street_number', type: 'TEXT' },
    { name: 'street_name', type: 'TEXT' },
    { name: 'place_id', type: 'TEXT' },
    { name: 'geocoding_accuracy', type: 'TEXT' },
    { name: 'geocoding_source', type: 'TEXT', default: "'google_places'" },
    { name: 'geocoded_at', type: 'TEXT' }
  ];
  
  for (const col of columnsToAdd) {
    if (!existingColumns.includes(col.name)) {
      const defaultClause = col.default ? ` DEFAULT ${col.default}` : '';
      const sql = `ALTER TABLE companies ADD COLUMN ${col.name} ${col.type}${defaultClause}`;
      console.log(`Adding column: ${col.name}`);
      db.prepare(sql).run();
    } else {
      console.log(`Column ${col.name} already exists, skipping`);
    }
  }
  
  // Create indexes
  console.log('Creating indexes...');
  
  try {
    db.prepare('CREATE INDEX IF NOT EXISTS idx_companies_place_id ON companies(place_id)').run();
    console.log('✓ Created index: idx_companies_place_id');
  } catch (e) {
    console.log('Index idx_companies_place_id already exists or error:', e.message);
  }
  
  try {
    db.prepare('CREATE INDEX IF NOT EXISTS idx_companies_location ON companies(office_latitude, office_longitude)').run();
    console.log('✓ Created index: idx_companies_location');
  } catch (e) {
    console.log('Index idx_companies_location already exists or error:', e.message);
  }
  
  db.close();
  
  console.log('\n✅ Migration completed successfully!');
  console.log('\nNew columns added:');
  console.log('  - formatted_address');
  console.log('  - street_number');
  console.log('  - street_name');
  console.log('  - place_id');
  console.log('  - geocoding_accuracy');
  console.log('  - geocoding_source');
  console.log('  - geocoded_at');
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
