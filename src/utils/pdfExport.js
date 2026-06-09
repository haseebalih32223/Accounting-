import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatDate, numberToWords } from './accounting';

export function exportSalesInvoicePDF(invoice, settings) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const currency = settings.currency || 'Rs.';

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.company_name || 'Company Name', 14, 15);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(settings.company_address || '', 14, 22);
  doc.text(`Phone: ${settings.company_phone || ''} | Email: ${settings.company_email || ''}`, 14, 28);
  if (settings.company_ntn) doc.text(`NTN: ${settings.company_ntn}`, pageWidth - 60, 22);
  if (settings.company_strn) doc.text(`STRN: ${settings.company_strn}`, pageWidth - 60, 28);

  doc.setTextColor(59, 130, 246);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SALES INVOICE', pageWidth - 14, 15, { align: 'right' });

  // Invoice details box
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 40, pageWidth - 28, 30, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, 40, pageWidth - 28, 30, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice No:', 18, 48);
  doc.text('Date:', 18, 54);
  doc.text('Due Date:', 18, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoice_number, 45, 48);
  doc.text(formatDate(invoice.date), 45, 54);
  doc.text(invoice.due_date ? formatDate(invoice.due_date) : 'N/A', 45, 60);

  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', pageWidth / 2, 48);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(invoice.customer_name, pageWidth / 2, 55);
  if (invoice.customer_ntn) doc.text(`NTN: ${invoice.customer_ntn}`, pageWidth / 2, 62);

  // Items table
  const tableColumns = ['#', 'Description', 'Qty', 'Unit', 'Unit Price', 'Disc%', 'Tax%', 'Amount'];
  const tableRows = invoice.items.map((item, idx) => [
    idx + 1,
    item.product_name + (item.description ? `\n${item.description}` : ''),
    item.quantity,
    item.unit,
    `${currency} ${parseFloat(item.unit_price).toFixed(2)}`,
    item.discount > 0 ? `${item.discount}%` : '-',
    item.tax_percent > 0 ? `${item.tax_percent}%` : '-',
    `${currency} ${parseFloat(item.total).toFixed(2)}`,
  ]);

  doc.autoTable({
    head: [tableColumns],
    body: tableRows,
    startY: 75,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      2: { halign: 'right' },
      4: { halign: 'right' },
      7: { halign: 'right' },
    },
  });

  const finalY = doc.lastAutoTable.finalY + 5;

  // Totals
  const totalsX = pageWidth - 80;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsX, finalY + 8);
  doc.text(`${currency} ${parseFloat(invoice.subtotal).toFixed(2)}`, pageWidth - 14, finalY + 8, { align: 'right' });

  if (invoice.discount_amount > 0) {
    doc.setTextColor(239, 68, 68);
    doc.text(`Discount (${invoice.discount_percent}%):`, totalsX, finalY + 14);
    doc.text(`- ${currency} ${parseFloat(invoice.discount_amount).toFixed(2)}`, pageWidth - 14, finalY + 14, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  if (invoice.tax_amount > 0) {
    doc.text(`GST (${invoice.tax_percent}%):`, totalsX, finalY + 20);
    doc.text(`+ ${currency} ${parseFloat(invoice.tax_amount).toFixed(2)}`, pageWidth - 14, finalY + 20, { align: 'right' });
  }

  doc.setDrawColor(15, 23, 42);
  doc.line(totalsX, finalY + 22, pageWidth - 14, finalY + 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL:', totalsX, finalY + 28);
  doc.text(`${currency} ${parseFloat(invoice.total_amount).toFixed(2)}`, pageWidth - 14, finalY + 28, { align: 'right' });

  if (invoice.paid_amount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(16, 185, 129);
    doc.text('Paid:', totalsX, finalY + 34);
    doc.text(`${currency} ${parseFloat(invoice.paid_amount).toFixed(2)}`, pageWidth - 14, finalY + 34, { align: 'right' });
    doc.setTextColor(239, 68, 68);
    doc.setFont('helvetica', 'bold');
    doc.text('Balance Due:', totalsX, finalY + 40);
    doc.text(`${currency} ${parseFloat(invoice.balance_due).toFixed(2)}`, pageWidth - 14, finalY + 40, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  // Amount in words
  const wordsY = finalY + 50;
  doc.setFillColor(248, 250, 252);
  doc.rect(14, wordsY - 5, pageWidth - 28, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text('Amount in Words:', 18, wordsY + 2);
  doc.setFont('helvetica', 'normal');
  doc.text(numberToWords(parseFloat(invoice.total_amount)), 55, wordsY + 2);

  // Footer
  const footerY = wordsY + 20;
  if (settings.invoice_footer) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(settings.invoice_footer, pageWidth / 2, footerY, { align: 'center' });
  }

  if (settings.bank_name || settings.bank_account) {
    doc.setFontSize(8);
    doc.text(`Bank: ${settings.bank_name || ''} | Account: ${settings.bank_account || ''}`, 14, footerY + 6);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Authorized Signature: _______________', pageWidth - 14, footerY + 15, { align: 'right' });

  return doc;
}

export function exportTrialBalancePDF(data, settings, asOfDate) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.company_name || 'Company', 14, 12);
  doc.setFontSize(12);
  doc.text('TRIAL BALANCE', pageWidth / 2, 12, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`As of ${formatDate(asOfDate)}`, pageWidth / 2, 20, { align: 'center' });

  const rows = data.map(acc => [
    acc.code,
    acc.name,
    acc.type.charAt(0).toUpperCase() + acc.type.slice(1),
    acc.debit_total > 0 ? acc.debit_total.toFixed(2) : '',
    acc.credit_total > 0 ? acc.credit_total.toFixed(2) : '',
  ]);

  const totalDr = data.reduce((s, a) => s + (a.debit_total || 0), 0);
  const totalCr = data.reduce((s, a) => s + (a.credit_total || 0), 0);
  rows.push(['', 'TOTAL', '', totalDr.toFixed(2), totalCr.toFixed(2)]);

  doc.autoTable({
    head: [['Code', 'Account Name', 'Type', 'Debit', 'Credit']],
    body: rows,
    startY: 30,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } },
    didDrawRow: (data) => {
      if (data.row.index === rows.length - 1) {
        doc.setFont('helvetica', 'bold');
      }
    },
  });

  return doc;
}

export function exportProfitLossPDF(data, settings, from, to) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const currency = settings.currency || 'Rs.';

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.company_name || 'Company', 14, 12);
  doc.text('PROFIT & LOSS STATEMENT', pageWidth / 2, 12, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Period: ${formatDate(from)} to ${formatDate(to)}`, pageWidth / 2, 20, { align: 'center' });

  let y = 35;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('REVENUE', 14, y);
  doc.text(`${currency} ${data.revenue.toFixed(2)}`, pageWidth - 14, y, { align: 'right' });

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Less: Cost of Goods Sold', 14, y);
  doc.text(`(${currency} ${data.cogs.toFixed(2)})`, pageWidth - 14, y, { align: 'right' });

  y += 6;
  doc.line(14, y, pageWidth - 14, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('GROSS PROFIT', 14, y);
  doc.text(`${currency} ${data.gross_profit.toFixed(2)}`, pageWidth - 14, y, { align: 'right' });

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('OPERATING EXPENSES', 14, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  for (const exp of data.expenses) {
    if (exp.total <= 0) continue;
    doc.text(exp.name, 22, y);
    doc.text(`${currency} ${exp.total.toFixed(2)}`, pageWidth - 14, y, { align: 'right' });
    y += 6;
  }
  y += 2;
  doc.line(14, y, pageWidth - 14, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Total Expenses', 14, y);
  doc.text(`(${currency} ${data.total_expenses.toFixed(2)})`, pageWidth - 14, y, { align: 'right' });

  y += 8;
  doc.setFillColor(data.net_profit >= 0 ? 16 : 239, data.net_profit >= 0 ? 185 : 68, data.net_profit >= 0 ? 129 : 68, 0.1);
  doc.setDrawColor(data.net_profit >= 0 ? 16 : 239, data.net_profit >= 0 ? 185 : 68, data.net_profit >= 0 ? 129 : 68);
  doc.rect(14, y - 4, pageWidth - 28, 12, 'FD');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(data.net_profit >= 0 ? 'NET PROFIT' : 'NET LOSS', 18, y + 4);
  doc.text(`${currency} ${Math.abs(data.net_profit).toFixed(2)}`, pageWidth - 18, y + 4, { align: 'right' });

  return doc;
}
