const fs = require('fs');
const path = require('path');

const fixes = [
  // Fix Link href to to
  { from: /<Link\s+href=/g, to: '<Link to=' },
  { from: /href:\s*string/g, to: 'to: string' },
  
  // Remove leftover router references
  { from: /router\.prefetch\([^)]+\)/g, to: '// prefetch removed' },
  { from: /const\s+router\s+=\s+useRouter\(\)\s*\n/g, to: '' },
  
  // Fix unused imports
  { from: /import\s+{\s*useSearchParams,\s*useLocation\s*}\s+from\s+'react-router-dom'/g, to: "import { useNavigate } from 'react-router-dom'" },
  { from: /import\s+{\s*useSearchParams\s*}\s+from\s+'react-router-dom'/g, to: "import { useNavigate } from 'react-router-dom'" },
  { from: /import\s+{\s*useLocation\s*}\s+from\s+'react-router-dom'/g, to: "import { useNavigate } from 'react-router-dom'" },
  
  // Remove priority prop from img
  { from: /\s+priority={true}/g, to: '' },
  { from: /\s+priority/g, to: '' },
  
  // Fix style jsx
  { from: /<style jsx>/g, to: '<style>' },
  { from: /<style jsx={true}>/g, to: '<style>' },
];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  fixes.forEach(({ from, to }) => {
    if (from.test(content)) {
      content = content.replace(from, to);
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Fixed: ${filePath}`);
    return true;
  }
  return false;
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  let count = 0;
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.includes('node_modules')) {
      count += walkDir(filePath);
    } else if ((file.endsWith('.tsx') || file.endsWith('.ts')) && !file.includes('.d.ts')) {
      if (fixFile(filePath)) count++;
    }
  });
  
  return count;
}

console.log('Fixing errors...\n');

const srcDir = path.join(__dirname, 'src');
const count = walkDir(srcDir);

console.log(`\n✅ Fixed ${count} files!`);
