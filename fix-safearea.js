const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(fullPath);
    }
  });
  return results;
}

const files = [...walk('./app'), ...walk('./components')];
let changed = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('SafeAreaView') && content.includes("from 'react-native'")) {
    const original = content;
    
    // Replace "SafeAreaView," or ", SafeAreaView"
    content = content.replace(/,\s*SafeAreaView\b|\bSafeAreaView\s*,/g, '');
    
    // Replace "import { SafeAreaView } from 'react-native'"
    content = content.replace(/import\s*{\s*SafeAreaView\s*}\s*from\s*['"]react-native['"];?\n?/g, '');
    
    // Remove if left as import {  } from 'react-native'
    content = content.replace(/import\s*{\s*}\s*from\s*['"]react-native['"];?\n?/g, '');
    
    // Inject the new import at the top
    if (original !== content && !content.includes('react-native-safe-area-context')) {
      content = "import { SafeAreaView } from 'react-native-safe-area-context';\n" + content;
      fs.writeFileSync(file, content);
      changed++;
      console.log('Fixed:', file);
    }
  }
});

console.log('Total files changed:', changed);
