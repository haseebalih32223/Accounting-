// Double-entry accounting utility functions

export function numberToWords(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return 'Zero Rupees Only';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertHundreds(n) {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertHundreds(n % 100) : '');
  }

  function convert(n) {
    if (n === 0) return 'Zero';
    let result = '';
    if (n >= 10000000) {
      result += convertHundreds(Math.floor(n / 10000000)) + ' Crore ';
      n %= 10000000;
    }
    if (n >= 100000) {
      result += convertHundreds(Math.floor(n / 100000)) + ' Lakh ';
      n %= 100000;
    }
    if (n >= 1000) {
      result += convertHundreds(Math.floor(n / 1000)) + ' Thousand ';
      n %= 1000;
    }
    if (n > 0) result += convertHundreds(n);
    return result.trim();
  }

  const intPart = Math.floor(Math.abs(amount));
  const decPart = Math.round((Math.abs(amount) - intPart) * 100);

  let words = convert(intPart) + ' Rupees';
  if (decPart > 0) {
    words += ' and ' + convert(decPart) + ' Paisas';
  }
  words += ' Only';
  return words;
}

export function calcInvoiceTotals(items, discountPercent = 0, discountAmount = 0, taxPercent = 0) {
  const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const disc = discountAmount > 0 ? discountAmount : (subtotal * discountPercent / 100);
  const taxable = subtotal - disc;
  const tax = taxable * taxPercent / 100;
  const total = taxable + tax;
  return { subtotal, discount_amount: disc, tax_amount: tax, total_amount: total };
}

export function calcItemTotal(quantity, unitPrice, discountPercent = 0, taxPercent = 0) {
  const gross = quantity * unitPrice;
  const discount = gross * discountPercent / 100;
  const taxable = gross - discount;
  const tax = taxable * taxPercent / 100;
  const total = taxable + tax;
  return { gross, discount, taxable, tax_amount: tax, total };
}

export function formatPKR(amount) {
  const num = parseFloat(amount) || 0;
  return `Rs. ${num.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2,'0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

export function getDaysOverdue(dueDate) {
  if (!dueDate) return 0;
  const today = new Date();
  const due = new Date(dueDate);
  const diff = Math.floor((today - due) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

export function getPaymentStatusColor(status) {
  switch (status) {
    case 'paid': return 'bg-green-100 text-green-800';
    case 'partial': return 'bg-yellow-100 text-yellow-800';
    case 'unpaid': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}
