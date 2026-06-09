const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/Payroll.jsx',
  'src/pages/Tax.jsx',
  'src/pages/Settings.jsx',
  'src/pages/Reports.jsx',
  'src/pages/Vouchers.jsx',
  'src/pages/BankCash.jsx',
];

const fixes = [
  // Active tab green → dark
  ['bg-green-600 text-white', 'bg-[#1A1A1A] text-white'],
  ['bg-green-500 text-white', 'bg-[#1A1A1A] text-white'],
  // Lime button text should be dark, not white
  ['bg-[#B8F53A] hover:bg-[#A8E52A] text-white', 'bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A]'],
  // Any remaining green-600 occurrences
  ['bg-green-600', 'bg-[#B8F53A]'],
  // Tab buttons should be rounded-full
  ['text-sm font-medium rounded-lg', 'text-sm font-medium rounded-full'],
  ['text-xs font-medium rounded-lg', 'text-xs font-medium rounded-full'],
];

const base = 'c:/laragon/www/Accounting';

files.forEach(f => {
  const full = path.join(base, f);
  if (!fs.existsSync(full)) return;
  let c = fs.readFileSync(full, 'utf8');
  let changed = false;
  fixes.forEach(([from, to]) => {
    while (c.includes(from)) { c = c.split(from).join(to); changed = true; }
  });
  if (changed) { fs.writeFileSync(full, c); console.log('Fixed:', f); }
  else console.log('OK:', f);
});
