const sqlite3 = require('better-sqlite3');
const db = sqlite3('./database/teemplot.db');

try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables:', tables.map(t => t.name).join(', '));
  
  // Check companies table structure
  const columns = db.prepare("PRAGMA table_info(companies)").all();
  console.log('\nCompanies table columns:');
  columns.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });
} catch (error) {
  console.error('Error:', error.message);
} finally {
  db.close();
}
