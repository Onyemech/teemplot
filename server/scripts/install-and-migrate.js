const { execSync } = require('child_process');
const path = require('path');

console.log('📦 Installing database dependencies...\n');

const deps = ['pg', 'dotenv', 'bcrypt'];
const serverDir = path.join(__dirname, '..');

for (const dep of deps) {
  try {
    require.resolve(dep);
    console.log(`✅ ${dep} already installed`);
  } catch {
    console.log(`📥 Installing ${dep}...`);
    execSync(`npm install ${dep}`, { 
      cwd: serverDir,
      stdio: 'inherit' 
    });
  }
}

console.log('\n✅ Dependencies ready!\n');
console.log('🚀 Starting database migration...\n');

require('./db-migrate.js');
