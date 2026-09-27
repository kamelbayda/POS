import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// List of expected tabs
const tabs = [
  { name: 'pos', start: "{activeTab === 'pos' && (" },
  { name: 'customers', start: "{activeTab === 'customers' && (" },
  { name: 'returns_waste', start: "{activeTab === 'returns_waste' && (" },
  { name: 'purchases', start: "{activeTab === 'purchases' && (" },
  { name: 'warehouse', start: "{activeTab === 'warehouse' && (" },
  { name: 'inventory', start: "{activeTab === 'inventory' && (" },
  { name: 'stock_count', start: "{activeTab === 'stock_count' && (" },
  { name: 'reports', start: "{activeTab === 'reports' && (" },
  { name: 'invoices', start: "{activeTab === 'invoices' && (" },
  { name: 'users', start: "{activeTab === 'users' && (" },
  { name: 'settings', start: "{activeTab === 'settings' && (" },
  { name: 'promotions', start: "{activeTab === 'promotions' && (" },
  { name: 'firebase_sync', start: "{activeTab === 'firebase_sync' && (" }
];

tabs.forEach((tab, index) => {
  const startIdx = content.indexOf(tab.start);
  if (startIdx === -1) {
    console.log(`Tab ${tab.name}: Not found`);
    return;
  }
  
  // End index is the start index of the next tab or end of main blocks
  let endIdx = content.length;
  if (index < tabs.length - 1) {
    const nextTab = tabs[index + 1];
    const nextIdx = content.indexOf(nextTab.start);
    if (nextIdx !== -1) {
      endIdx = nextIdx;
    }
  } else {
    // For firebase_sync, end index is before "</main>"
    const mainClose = content.indexOf('</main>', startIdx);
    if (mainClose !== -1) {
      endIdx = mainClose;
    }
  }
  
  const block = content.slice(startIdx, endIdx);
  
  // Count div, form, etc.
  const openDivs = (block.match(/<div(\s|>)/g) || []).length;
  const closeDivs = (block.match(/<\/div>/g) || []).length;
  
  const openForms = (block.match(/<form(\s|>)/g) || []).length;
  const closeForms = (block.match(/<\/form>/g) || []).length;
  
  const openBraces = (block.match(/\{/g) || []).length;
  const closeBraces = (block.match(/\}/g) || []).length;

  const openParens = (block.match(/\(/g) || []).length;
  const closeParens = (block.match(/\)/g) || []).length;

  console.log(`Tab ${tab.name}:`);
  console.log(`  Divs:  Open = ${openDivs}, Close = ${closeDivs}`);
  console.log(`  Forms: Open = ${openForms}, Close = ${closeForms}`);
  console.log(`  Braces: Open = ${openBraces}, Close = ${closeBraces}`);
  console.log(`  Parens: Open = ${openParens}, Close = ${closeParens}`);
  if (openDivs !== closeDivs) {
    console.log(`  🚨 Divs are MISMATCHED! Difference: ${openDivs - closeDivs}`);
  }
  if (openForms !== closeForms) {
    console.log(`  🚨 Forms are MISMATCHED! Difference: ${openForms - closeForms}`);
  }
});
