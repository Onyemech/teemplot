const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📦 Installing required dependencies...\n');

const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (!packageJson.dependencies['@supabase/supabase-js']) {
  console.log('Installing @supabase/supabase-js...');
  execSync('npm install @supabase/supabase-js', { 
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit' 
  });
}

if (!packageJson.dependencies['dotenv']) {
  console.log('Installing dotenv...');
  execSync('npm install dotenv', { 
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit' 
  });
}

if (!packageJson.dependencies['bcrypt']) {
  console.log('Installing bcrypt...');
  execSync('npm install bcrypt', { 
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit' 
  });
}

console.log('\n✅ Dependencies installed!\n');
console.log('🚀 Running database migration...\n');

require('./migrate.js');
