const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
// Adjust path to point to server root .env
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Please provide a file path relative to script execution or absolute path');
    process.exit(1);
  }

  const fullPath = path.resolve(filePath);
  console.log(`Reading file from: ${fullPath}`);

  try {
    const sql = fs.readFileSync(fullPath, 'utf8');
    console.log(`Executing SQL...`);
    
    // Split by semicolons to run statements individually if needed, 
    // but exec_sql might handle blocks. migrate.js splits them.
    // Let's try sending the whole block first as 003 uses blocks.
    // Actually 003 has multiple statements. migrate.js splits them. 
    // Let's follow migrate.js pattern for safety.
    
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
       // simple skip comments
       if (statement.startsWith('--')) continue;
       
       const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
       if (error) {
         console.error('Error executing statement:', statement.substring(0, 50) + '...');
         console.error(error);
         // Don't exit immediately, maybe subsequent statements work or are independent
       } else {
         console.log('Success:', statement.substring(0, 50) + '...');
       }
    }

    console.log('Done.');
  } catch (err) {
    console.error('Failed to read or execute:', err);
    process.exit(1);
  }
}

run();
