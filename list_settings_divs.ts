import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'App.tsx');
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

const licKey = "{activeTab === 'settings' && (";
const promoKey = "{activeTab === 'promotions' && (";

let startLineIdx = -1;
let endLineIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes(licKey)) startLineIdx = i;
  if (lines[i].includes(promoKey)) {
    endLineIdx = i;
    break;
  }
}

let depth = 0;

for (let i = startLineIdx; i < endLineIdx; i++) {
  const line = lines[i];
  
  let idx = 0;
  while (true) {
    const openIdx = line.indexOf('<div', idx);
    const closeIdx = line.indexOf('</div>', idx);
    
    if (openIdx === -1 && closeIdx === -1) {
      break;
    }
    
    if (openIdx !== -1 && (closeIdx === -1 || openIdx < closeIdx)) {
      depth++;
      console.log(`Line ${i + 1}: [OPEN]  --> depth: ${depth} (tag: ${line.substring(openIdx, openIdx + 40).trim()})`);
      idx = openIdx + 4;
    } else {
      depth--;
      console.log(`Line ${i + 1}: [CLOSE] --> depth: ${depth}`);
      idx = closeIdx + 6;
    }
  }
}

console.log(`Final depth: ${depth}`);
