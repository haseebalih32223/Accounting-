import * as XLSX from 'xlsx';

export function exportToExcel(data, sheetName, fileName) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

export function exportSalesReport(invoices, settings) {
  const currency = settings.currency || 'Rs.';
  const data = invoices.map(inv => ({
    'Invoice #': inv.invoice_number,
    'Date': inv.date,
    'Customer': inv.customer_name,
    'Subtotal': inv.subtotal,
    'Discount': inv.discount_amount,
    'Tax': inv.tax_amount,
    'Total': inv.total_amount,
    'Paid': inv.paid_amount,
    'Balance': inv.balance_due,
    'Status': inv.payment_status,
  }));
  exportToExcel(data, 'Sales Report', `Sales_Report_${new Date().toISOString().split('T')[0]}`);
}

export function exportPurchaseReport(invoices, settings) {
  const data = invoices.map(inv => ({
    'Invoice #': inv.invoice_number,
    'Supplier Invoice #': inv.supplier_invoice_no,
    'Date': inv.date,
    'Supplier': inv.supplier_name,
    'Subtotal': inv.subtotal,
    'Tax': inv.tax_amount,
    'Total': inv.total_amount,
    'Paid': inv.paid_amount,
    'Balance': inv.balance_due,
    'Status': inv.payment_status,
  }));
  exportToExcel(data, 'Purchase Report', `Purchase_Report_${new Date().toISOString().split('T')[0]}`);
}

export function exportTrialBalance(data) {
  const rows = data.map(acc => ({
    'Code': acc.code,
    'Account Name': acc.name,
    'Type': acc.type,
    'Debit': acc.debit_total || 0,
    'Credit': acc.credit_total || 0,
  }));
  const totalDr = data.reduce((s, a) => s + (a.debit_total || 0), 0);
  const totalCr = data.reduce((s, a) => s + (a.credit_total || 0), 0);
  rows.push({ 'Code': '', 'Account Name': 'TOTAL', 'Type': '', 'Debit': totalDr, 'Credit': totalCr });
  exportToExcel(rows, 'Trial Balance', `Trial_Balance_${new Date().toISOString().split('T')[0]}`);
}

export function exportPayrollSheet(records) {
  const data = records.map(r => ({
    'Employee': r.employee_name,
    'Basic Salary': r.basic_salary,
    'Allowances': r.allowances,
    'Overtime': r.overtime,
    'Gross Salary': r.gross_salary,
    'Income Tax': r.income_tax,
    'Provident Fund': r.provident_fund,
    'Other Deductions': r.other_deductions,
    'Net Salary': r.net_salary,
    'Status': r.payment_status,
  }));
  exportToExcel(data, 'Payroll', `Payroll_${new Date().toISOString().split('T')[0]}`);
}

export function exportExpenseReport(expenses) {
  const data = expenses.map(e => ({
    'Expense #': e.expense_number,
    'Date': e.date,
    'Category': e.account_name,
    'Amount': e.amount,
    'Tax': e.tax_amount,
    'Description': e.description,
    'Reference': e.reference,
  }));
  exportToExcel(data, 'Expenses', `Expense_Report_${new Date().toISOString().split('T')[0]}`);
}
