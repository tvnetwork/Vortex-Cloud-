const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const replacements = [
  { search: /\btext-green-500\b/g, replace: 'text-success' },
  { search: /\bbg-green-500\b/g, replace: 'bg-success' },
  { search: /\bborder-green-500\b/g, replace: 'border-success' },
  
  { search: /\btext-red-500\b/g, replace: 'text-error' },
  { search: /\bbg-red-500\b/g, replace: 'bg-error' },
  { search: /\bborder-red-500\b/g, replace: 'border-error' },
  
  { search: /\btext-yellow-500\b/g, replace: 'text-warning' },
  { search: /\bbg-yellow-500\b/g, replace: 'bg-warning' },
  
  { search: /\btext-blue-500\b/g, replace: 'text-info' },
  { search: /\btext-blue-400\b/g, replace: 'text-info' },
  { search: /\bbg-blue-500\b/g, replace: 'bg-info' },
  { search: /\bbg-zinc-950\b/g, replace: 'bg-surface' }, // Just in case any slipped by
];

walkDir(path.join(__dirname, 'src'), (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    replacements.forEach(({ search, replace }) => {
      content = content.replace(search, replace);
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated status styles in: ${filePath}`);
    }
  }
});
