const fs = require('fs');
const path = require('path');
const base = 'c:/laragon/www/Accounting/src';

// Simple string replacements — remove ", borderLeft: '...'" from inline styles
const simpleReplacements = [
  // StatCard
  [
    "? { background: GRADIENTS[type], borderLeft: `4px solid ${BORDER_COLORS[type]}` }",
    "? { background: GRADIENTS[type] }"
  ],
  // BankCash
  [
    "borderLeft: `4px solid ${acc.is_bank ? '#0EA5E9' : '#7BC400'}`,",
    ""
  ],
  // Payables
  [
    ", borderLeft: '4px solid #D97706'",
    ""
  ],
  // Receivables
  [
    ", borderLeft: '4px solid #8B5CF6'",
    ""
  ],
  // PurchaseInvoice × 3
  [
    ", borderLeft: '4px solid #D97706' }}",
    " }}"
  ],
  [
    ", borderLeft: '4px solid #00B37A' }}",
    " }}"
  ],
  [
    ", borderLeft: '4px solid #FF6B4A' }}",
    " }}"
  ],
  // Payroll × 3
  [
    ", borderLeft: '4px solid #E879A0' }}",
    " }}"
  ],
  [
    ", borderLeft: '4px solid #00B37A' }}",
    " }}"
  ],
  [
    ", borderLeft: '4px solid #D97706' }}",
    " }}"
  ],
  // SalesInvoice × 3
  [
    ", borderLeft: '4px solid #7BC400' }}",
    " }}"
  ],
  [
    ", borderLeft: '4px solid #00B37A' }}",
    " }}"
  ],
  [
    ", borderLeft: '4px solid #FF6B4A' }}",
    " }}"
  ],
  // Expenses — Tailwind border-l classes
  [
    "border-l-4 border-l-orange-500 border border-[#EBEBEB]",
    "border border-[#EBEBEB]"
  ],
];

// Tailwind border-l- class patterns (catch-all for anything remaining)
function removeTailwindBorderL(content) {
  // Remove border-l-[number] border-l-[color] pairs like "border-l-4 border-l-green-500"
  content = content.replace(/\bborder-l-\d+\s+border-l-[\w-[\]#]+/g, '');
  // Remove standalone border-l-[color] leftover
  content = content.replace(/\bborder-l-[\w-[\]#]+/g, '');
  // Clean up double spaces
  content = content.replace(/  +/g, ' ');
  return content;
}

const files = [
  'components/common/StatCard.jsx',
  'pages/BankCash.jsx',
  'pages/Payables.jsx',
  'pages/Expenses.jsx',
  'pages/Receivables.jsx',
  'pages/PurchaseInvoice.jsx',
  'pages/Payroll.jsx',
  'pages/SalesInvoice.jsx',
];

files.forEach(f => {
  const full = path.join(base, f);
  if (!fs.existsSync(full)) { console.log('SKIP:', f); return; }
  let c = fs.readFileSync(full, 'utf8');
  let changed = false;

  simpleReplacements.forEach(([from, to]) => {
    if (c.includes(from)) { c = c.split(from).join(to); changed = true; }
  });

  const after = removeTailwindBorderL(c);
  if (after !== c) { c = after; changed = true; }

  if (changed) { fs.writeFileSync(full, c); console.log('Fixed:', f); }
  else console.log('OK:', f);
});

// Reports.jsx needs targeted fixes for the dynamic border variable
const reportsPath = path.join(base, 'pages/Reports.jsx');
let r = fs.readFileSync(reportsPath, 'utf8');

// Remove borderLeft from dynamic style objects in Reports
r = r.replace(/, borderLeft: `4px solid \$\{border\}`/g, '');
r = r.replace(/, borderLeft: `4px solid \$\{styles\[i\]\[1\]\}`/g, '');
// Also clean up the border variable from array destructuring
r = r.replace(/\[label, value, bg, border\]/g, '[label, value, bg]');
// Remove 4th element (hex color) from each report card array
r = r.replace(/, '#7BC400'\],\n/g, '],\n');
r = r.replace(/, '#EA580C'\],\n/g, '],\n');
r = r.replace(/, '#00B37A'\],\n/g, '],\n');
r = r.replace(/, '#FF6B4A'\],\n/g, '],\n');
r = r.replace(/, '#D97706'\],\n/g, '],\n');

fs.writeFileSync(reportsPath, r);
console.log('Fixed: pages/Reports.jsx');
console.log('All done.');
