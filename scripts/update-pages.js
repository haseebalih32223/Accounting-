const fs = require('fs');
const path = require('path');

const base = 'c:/laragon/www/Accounting';

const pages = [
  'src/pages/Vouchers.jsx',
  'src/pages/SalesInvoice.jsx',
  'src/pages/PurchaseInvoice.jsx',
  'src/pages/Expenses.jsx',
  'src/pages/BankCash.jsx',
  'src/pages/Receivables.jsx',
  'src/pages/Payables.jsx',
  'src/pages/Payroll.jsx',
  'src/pages/Tax.jsx',
  'src/pages/Reports.jsx',
  'src/pages/Settings.jsx',
  'src/pages/ChartOfAccounts.jsx',
];

// [from, to] — more specific patterns first
const replacements = [
  // Page outer padding
  ['p-6 space-y-6', 'p-7 space-y-5'],
  ['p-6 space-y-4', 'p-7 space-y-5'],

  // Cards
  ['rounded-xl shadow-sm border border-gray-100', 'rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-[#EBEBEB]'],
  ['rounded-xl shadow-sm border border-gray-200', 'rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-[#EBEBEB]'],
  ['rounded-xl border border-gray-100', 'rounded-2xl border border-[#EBEBEB]'],
  ['rounded-xl border border-gray-200', 'rounded-2xl border border-[#EBEBEB]'],

  // Table headers
  ['bg-[#FAFAFA] text-[#AAAAAA]', '__SKIP__'], // already done, don't double-process
  ['bg-gray-100 text-gray-700', 'bg-[#FAFAFA] text-[#AAAAAA]'],

  // Table row hover
  ['hover:bg-gray-50/60', 'hover:bg-[#F8FFE8]'],
  ['hover:bg-gray-50/50', 'hover:bg-[#F8FFE8]'],
  ['hover:bg-gray-50/30', 'hover:bg-[#F8FFE8]'],

  // Input focus
  ['focus:border-green-500 focus:ring-1 focus:ring-green-500', 'focus:border-[#B8F53A] focus:bg-white focus:shadow-[0_0_0_3px_rgba(184,245,58,0.15)]'],
  ['focus:outline-none focus:border-green-400 focus:bg-white', 'focus:outline-none focus:border-[#B8F53A] focus:bg-white'],
  ['focus:outline-none focus:border-green-400', 'focus:outline-none focus:border-[#B8F53A] focus:bg-white'],
  ['focus:border-green-500', 'focus:border-[#B8F53A]'],

  // Primary buttons
  ['bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg',
   'bg-[#B8F53A] hover:bg-[#A8E52A] disabled:opacity-50 text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95'],
  ['bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg',
   'bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95'],
  ['bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg',
   'bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95'],
  ['bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg',
   'bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] font-semibold rounded-full active:scale-95'],
  // any remaining green-600 buttons
  ['bg-green-600 hover:bg-green-700', 'bg-[#B8F53A] hover:bg-[#A8E52A]'],

  // Dark secondary buttons
  ['bg-gray-700 hover:bg-gray-800 text-white text-sm font-medium rounded-lg',
   'bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white text-sm font-semibold rounded-full active:scale-95'],
  ['bg-gray-700 hover:bg-gray-800 text-white text-sm font-semibold rounded-lg',
   'bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white text-sm font-semibold rounded-full active:scale-95'],
  ['bg-gray-700 hover:bg-gray-800', 'bg-[#1A1A1A] hover:bg-[#2A2A2A]'],

  // Ghost buttons
  ['bg-gray-50 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg',
   'border border-[#EBEBEB] hover:border-[#1A1A1A] text-[#6B6B6B] hover:text-[#1A1A1A] text-sm font-medium rounded-full'],
  ['bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-lg',
   'border border-[#EBEBEB] hover:border-[#1A1A1A] text-[#6B6B6B] hover:text-[#1A1A1A] text-sm font-medium rounded-full'],

  // Danger buttons
  ['bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg',
   'bg-[#FF4444] hover:bg-[#E03030] text-white text-sm font-semibold rounded-full active:scale-95'],
  ['bg-red-600 hover:bg-red-700 text-white rounded-lg',
   'bg-[#FF4444] hover:bg-[#E03030] text-white rounded-full active:scale-95'],

  // Active tab/filter pills
  ['bg-green-500 text-white font-medium', 'bg-[#1A1A1A] text-white font-semibold'],
  ['bg-green-600 text-white font-medium', 'bg-[#1A1A1A] text-white font-semibold'],

  // Input background
  ['bg-gray-50 border border-gray-200 rounded-lg', 'bg-[#F5F5F0] border border-transparent rounded-xl'],
  ['bg-gray-50 border border-gray-300 rounded-lg', 'bg-[#F5F5F0] border border-transparent rounded-xl'],
  ['bg-white border border-gray-200 rounded-lg', 'bg-[#F5F5F0] border border-transparent rounded-xl'],

  // Border colors in dividers/tables
  ['border-gray-100', 'border-[#EBEBEB]'],
  ['border-gray-200', 'border-[#EBEBEB]'],
];

pages.forEach(p => {
  const fullPath = path.join(base, p);
  if (!fs.existsSync(fullPath)) { console.log('SKIP (not found):', p); return; }
  let content = fs.readFileSync(fullPath, 'utf8');
  let changed = false;
  replacements.forEach(([from, to]) => {
    if (to === '__SKIP__') return;
    while (content.includes(from)) {
      content = content.split(from).join(to);
      changed = true;
    }
  });
  if (changed) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Updated:', p);
  } else {
    console.log('No change:', p);
  }
});
console.log('All done.');
