import { useState } from 'react';
import {
  BarChart3, Download, Printer, RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { exportTrialBalance, exportSalesReport, exportPurchaseReport, exportExpenseReport } from '../utils/excelExport';
import { exportTrialBalancePDF, exportProfitLossPDF } from '../utils/pdfExport';

const REPORTS = [
  { id: 'trial_balance', label: 'Trial Balance' },
  { id: 'profit_loss', label: 'Profit & Loss' },
  { id: 'balance_sheet', label: 'Balance Sheet' },
  { id: 'sales_report', label: 'Sales Report' },
  { id: 'purchase_report', label: 'Purchase Report' },
  { id: 'expense_report', label: 'Expense Report' },
  { id: 'ar_aging', label: 'AR Aging' },
  { id: 'ap_aging', label: 'AP Aging' },
];

export default function Reports() {
  const { formatCurrency, formatDate, settings, getToday } = useApp();
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const [activeReport, setActiveReport] = useState('trial_balance');
  const [filters, setFilters] = useState({ from: firstOfMonth, to: getToday(), date: getToday() });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    try {
      let result;
      switch (activeReport) {
        case 'trial_balance': result = await window.electronAPI.getTrialBalance(filters.date); break;
        case 'profit_loss': result = await window.electronAPI.getProfitLoss(filters.from, filters.to); break;
        case 'balance_sheet': result = await window.electronAPI.getBalanceSheet(filters.date); break;
        case 'sales_report': result = await window.electronAPI.getSalesReport(filters.from, filters.to); break;
        case 'purchase_report': result = await window.electronAPI.getPurchaseReport(filters.from, filters.to); break;
        case 'expense_report': result = await window.electronAPI.getExpenseReport(filters.from, filters.to); break;
        case 'ar_aging': result = await window.electronAPI.getARAgingReport(); break;
        case 'ap_aging': result = await window.electronAPI.getAPAgingReport(); break;
      }
      setData(result);
    } finally {
      setLoading(false);
    }
  };

  const handleExcelExport = () => {
    if (!data) return;
    switch (activeReport) {
      case 'trial_balance': exportTrialBalance(data); break;
      case 'sales_report': exportSalesReport(data.invoices, settings); break;
      case 'purchase_report': exportPurchaseReport(data.invoices, settings); break;
      case 'expense_report': exportExpenseReport(data.expenses); break;
    }
  };

  const handlePDFExport = () => {
    if (!data) return;
    let doc;
    switch (activeReport) {
      case 'trial_balance':
        doc = exportTrialBalancePDF(data, settings, filters.date);
        doc.save(`Trial_Balance_${filters.date}.pdf`);
        break;
      case 'profit_loss':
        doc = exportProfitLossPDF(data, settings, filters.from, filters.to);
        doc.save(`Profit_Loss_${filters.from}_${filters.to}.pdf`);
        break;
    }
  };

  const showDateRange = !['trial_balance', 'balance_sheet', 'ar_aging', 'ap_aging'].includes(activeReport);
  const showAsOfDate = ['trial_balance', 'balance_sheet'].includes(activeReport);

  return (
    <div className="p-6 flex gap-4">
      {/* Sidebar */}
      <div className="w-52 shrink-0">
        <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm overflow-hidden">
          {REPORTS.map(r => (
            <button
              key={r.id}
              onClick={() => { setActiveReport(r.id); setData(null); }}
              className={`w-full text-left px-4 py-3 text-sm border-b border-[#EBEBEB] last:border-0 transition-colors ${activeReport === r.id ? 'bg-[#1A1A1A] text-white font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Report content */}
      <div className="flex-1">
        <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm">
          {/* Report header */}
          <div className="flex items-center justify-between p-5 border-b border-[#EBEBEB]">
            <div>
              <h3 className="font-semibold text-gray-800">{REPORTS.find(r => r.id === activeReport)?.label}</h3>
              <p className="text-xs text-gray-400">{settings.company_name}</p>
            </div>
            <div className="flex items-center gap-3">
              {showDateRange && (
                <>
                  <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} className="px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm" />
                  <span className="text-gray-400">to</span>
                  <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} className="px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm" />
                </>
              )}
              {showAsOfDate && (
                <input type="date" value={filters.date} onChange={e => setFilters(f => ({ ...f, date: e.target.value }))} className="px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm" />
              )}
              <button onClick={loadReport} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95 disabled:opacity-50">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Loading...' : 'Generate'}
              </button>
              {data && (
                <>
                  <button onClick={handlePDFExport} className="flex items-center gap-2 px-3 py-2 border border-[#EBEBEB] text-sm text-gray-600 rounded-lg hover:bg-gray-50"><Printer size={14} /> PDF</button>
                  <button onClick={handleExcelExport} className="flex items-center gap-2 px-3 py-2 border border-[#EBEBEB] text-sm text-gray-600 rounded-lg hover:bg-gray-50"><Download size={14} /> Excel</button>
                </>
              )}
            </div>
          </div>

          {/* Report body */}
          <div className="p-5">
            {!data && !loading && (
              <div className="text-center py-20 text-gray-400">
                <BarChart3 size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium mb-1">Select a report and click Generate</p>
                <p className="text-sm">Configure date range and generate the report</p>
              </div>
            )}
            {loading && (
              <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div></div>
            )}

            {data && activeReport === 'trial_balance' && (
              <TrialBalanceReport data={data} formatCurrency={formatCurrency} asOfDate={filters.date} formatDate={formatDate} />
            )}
            {data && activeReport === 'profit_loss' && (
              <ProfitLossReport data={data} formatCurrency={formatCurrency} from={filters.from} to={filters.to} formatDate={formatDate} />
            )}
            {data && activeReport === 'balance_sheet' && (
              <BalanceSheetReport data={data} formatCurrency={formatCurrency} asOfDate={filters.date} formatDate={formatDate} />
            )}
            {data && activeReport === 'sales_report' && (
              <SalesReportView data={data} formatCurrency={formatCurrency} formatDate={formatDate} />
            )}
            {data && activeReport === 'purchase_report' && (
              <PurchaseReportView data={data} formatCurrency={formatCurrency} formatDate={formatDate} />
            )}
            {data && activeReport === 'expense_report' && (
              <ExpenseReportView data={data} formatCurrency={formatCurrency} formatDate={formatDate} />
            )}
            {data && activeReport === 'ar_aging' && (
              <AgingReport data={data} formatCurrency={formatCurrency} formatDate={formatDate} type="AR" />
            )}
            {data && activeReport === 'ap_aging' && (
              <AgingReport data={data} formatCurrency={formatCurrency} formatDate={formatDate} type="AP" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TrialBalanceReport({ data, formatCurrency, asOfDate, formatDate }) {
  const totalDr = data.reduce((s, a) => s + (a.debit_total || 0), 0);
  const totalCr = data.reduce((s, a) => s + (a.credit_total || 0), 0);
  return (
    <div>
      <div className="text-center mb-4">
        <p className="text-sm text-gray-500">As of {formatDate(asOfDate)}</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#FAFAFA] text-[#AAAAAA]">
            <th className="text-left py-2 px-3 text-xs">Code</th>
            <th className="text-left py-2 px-3 text-xs">Account Name</th>
            <th className="text-left py-2 px-3 text-xs">Type</th>
            <th className="text-right py-2 px-3 text-xs">Debit</th>
            <th className="text-right py-2 px-3 text-xs">Credit</th>
          </tr>
        </thead>
        <tbody>
          {data.map((acc, i) => (
            <tr key={i} className="border-b border-[#EBEBEB] hover:bg-gray-50">
              <td className="py-2 px-3 font-mono text-xs text-gray-400">{acc.code}</td>
              <td className="py-2 px-3 font-medium text-gray-800">{acc.name}</td>
              <td className="py-2 px-3 text-gray-500 capitalize">{acc.type}</td>
              <td className="py-2 px-3 text-right font-mono">{acc.debit_total > 0 ? formatCurrency(acc.debit_total) : '-'}</td>
              <td className="py-2 px-3 text-right font-mono">{acc.credit_total > 0 ? formatCurrency(acc.credit_total) : '-'}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-gray-700 bg-gray-50 font-bold">
            <td colSpan="3" className="py-3 px-3 text-right text-gray-800">TOTALS:</td>
            <td className="py-3 px-3 text-right font-mono font-bold">{formatCurrency(totalDr)}</td>
            <td className="py-3 px-3 text-right font-mono font-bold">{formatCurrency(totalCr)}</td>
          </tr>
        </tbody>
      </table>
      <div className={`mt-3 text-center text-sm font-medium ${Math.abs(totalDr - totalCr) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
        {Math.abs(totalDr - totalCr) < 0.01 ? '✓ Balanced — Debit equals Credit' : `× Not Balanced — Difference: ${formatCurrency(Math.abs(totalDr - totalCr))}`}
      </div>
    </div>
  );
}

function ProfitLossReport({ data, formatCurrency, from, to, formatDate }) {
  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-6"><p className="text-sm text-gray-500">Period: {formatDate(from)} to {formatDate(to)}</p></div>
      <div className="space-y-4">
        <div className="flex justify-between text-sm font-semibold py-2 border-b-2 border-gray-700">
          <span className="text-lg text-gray-900">Revenue</span>
          <span className="font-mono text-lg font-bold text-green-700">{formatCurrency(data.revenue)}</span>
        </div>
        <div className="flex justify-between text-sm py-2">
          <span className="text-gray-500">Less: Cost of Goods Sold</span>
          <span className="font-mono text-red-600">({formatCurrency(data.cogs)})</span>
        </div>
        <div className="flex justify-between text-sm font-semibold py-2 bg-gray-50 px-3 rounded-lg">
          <span>Gross Profit</span>
          <span className="font-mono">{formatCurrency(data.gross_profit)}</span>
        </div>
        <div className="mt-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Operating Expenses:</p>
          {data.expenses.map((exp, i) => exp.total > 0 && (
            <div key={i} className="flex justify-between text-sm py-1.5 border-b border-[#EBEBEB] pl-4">
              <span className="text-gray-600">{exp.name}</span>
              <span className="font-mono">{formatCurrency(exp.total)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-semibold py-2 border-t border-[#EBEBEB] mt-1">
            <span>Total Expenses</span>
            <span className="font-mono text-red-600">({formatCurrency(data.total_expenses)})</span>
          </div>
        </div>
        <div className={`flex justify-between p-4 rounded-xl border-2 ${data.net_profit >= 0 ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
          <span className="font-bold text-lg">{data.net_profit >= 0 ? 'NET PROFIT' : 'NET LOSS'}</span>
          <span className={`font-mono font-bold text-xl ${data.net_profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(Math.abs(data.net_profit))}</span>
        </div>
      </div>
    </div>
  );
}

function BalanceSheetReport({ data, formatCurrency, asOfDate, formatDate }) {
  return (
    <div className="grid grid-cols-2 gap-8">
      <div>
        <h4 className="font-bold text-gray-800 mb-3 text-base border-b-2 border-gray-700 pb-2">ASSETS</h4>
        {data.assets.map((a, i) => (
          <div key={i} className="flex justify-between text-sm py-1.5 border-b border-[#EBEBEB]">
            <span className="text-gray-700">{a.name}</span>
            <span className="font-mono">{formatCurrency(a.balance)}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold text-sm py-2 border-t-2 border-gray-700 mt-2">
          <span>TOTAL ASSETS</span>
          <span className="font-mono">{formatCurrency(data.total_assets)}</span>
        </div>
      </div>
      <div>
        <h4 className="font-bold text-gray-800 mb-3 text-base border-b-2 border-gray-700 pb-2">LIABILITIES & EQUITY</h4>
        {data.liabilities.map((a, i) => (
          <div key={i} className="flex justify-between text-sm py-1.5 border-b border-[#EBEBEB]">
            <span className="text-gray-700">{a.name}</span>
            <span className="font-mono">{formatCurrency(a.balance)}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm font-semibold py-1.5 border-t border-[#EBEBEB]">
          <span>Total Liabilities</span>
          <span className="font-mono">{formatCurrency(data.total_liabilities)}</span>
        </div>
        <div className="mt-3">
          {data.equity.map((a, i) => (
            <div key={i} className="flex justify-between text-sm py-1.5 border-b border-[#EBEBEB]">
              <span className="text-gray-700">{a.name}</span>
              <span className="font-mono">{formatCurrency(a.balance)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm py-1.5 border-b border-[#EBEBEB]">
            <span className="text-gray-700">Retained Earnings</span>
            <span className="font-mono">{formatCurrency(data.retained_earnings)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold py-1.5 border-t border-[#EBEBEB]">
            <span>Total Equity</span>
            <span className="font-mono">{formatCurrency(data.total_equity)}</span>
          </div>
        </div>
        <div className="flex justify-between font-bold text-sm py-2 border-t-2 border-gray-700 mt-2">
          <span>TOTAL LIABILITIES + EQUITY</span>
          <span className="font-mono">{formatCurrency(data.total_liabilities + data.total_equity)}</span>
        </div>
        <div className={`text-center text-xs mt-2 font-medium ${Math.abs(data.total_assets - (data.total_liabilities + data.total_equity)) < 1 ? 'text-green-600' : 'text-red-600'}`}>
          {Math.abs(data.total_assets - (data.total_liabilities + data.total_equity)) < 1 ? '✓ Balanced' : '× Not Balanced'}
        </div>
      </div>
    </div>
  );
}

function SalesReportView({ data, formatCurrency, formatDate }) {
  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          ['Total Invoiced',  data.totals.total,   'linear-gradient(135deg,#CCFF66,#F0FFB0)'],
          ['Tax Collected',   data.totals.tax,     'linear-gradient(135deg,#FFD0A0,#FFF0E0)'],
          ['Received',        data.totals.paid,    'linear-gradient(135deg,#B0F0D8,#E0FFF2)'],
          ['Outstanding',     data.totals.balance, 'linear-gradient(135deg,#FFD6C0,#FFF3EC)'],
        ].map(([label, value, bg]) => (
          <div key={label} className="rounded-2xl p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all" style={{ background: bg }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-black/50 mb-1">{label}</p>
            <p className="font-mono font-bold text-[#1A1A1A] text-lg">{formatCurrency(value)}</p>
          </div>
        ))}
      </div>
      <table className="w-full text-sm">
        <thead><tr className="bg-[#FAFAFA] text-[#AAAAAA]">{['Invoice #','Date','Customer','Total','Tax','Discount','Paid','Balance','Status'].map(h => <th key={h} className="text-left py-2 px-3 text-xs">{h}</th>)}</tr></thead>
        <tbody>
          {data.invoices.map((inv, i) => (
            <tr key={i} className="border-b border-[#EBEBEB] hover:bg-gray-50 text-sm">
              <td className="py-2 px-3 font-mono text-green-600">{inv.invoice_number}</td>
              <td className="py-2 px-3 text-gray-500">{formatDate(inv.date)}</td>
              <td className="py-2 px-3">{inv.customer_name}</td>
              <td className="py-2 px-3 font-mono">{formatCurrency(inv.total_amount)}</td>
              <td className="py-2 px-3 font-mono">{formatCurrency(inv.tax_amount)}</td>
              <td className="py-2 px-3 font-mono">{formatCurrency(inv.discount_amount)}</td>
              <td className="py-2 px-3 font-mono text-green-600">{formatCurrency(inv.paid_amount)}</td>
              <td className="py-2 px-3 font-mono text-red-600">{formatCurrency(inv.balance_due)}</td>
              <td className="py-2 px-3 capitalize">{inv.payment_status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PurchaseReportView({ data, formatCurrency, formatDate }) {
  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          ['Total Purchased', data.totals.total,   'linear-gradient(135deg,#FFE8A0,#FFFAE0)'],
          ['Tax Paid',        data.totals.tax,     'linear-gradient(135deg,#FFD0A0,#FFF0E0)'],
          ['Paid',            data.totals.paid,    'linear-gradient(135deg,#B0F0D8,#E0FFF2)'],
          ['Outstanding',     data.totals.balance, 'linear-gradient(135deg,#FFD6C0,#FFF3EC)'],
        ].map(([label, value, bg]) => (
          <div key={label} className="rounded-2xl p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all" style={{ background: bg }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-black/50 mb-1">{label}</p>
            <p className="font-mono font-bold text-[#1A1A1A] text-lg">{formatCurrency(value)}</p>
          </div>
        ))}
      </div>
      <table className="w-full text-sm">
        <thead><tr className="bg-[#FAFAFA] text-[#AAAAAA]">{['Invoice #','Date','Supplier','Total','Tax','Paid','Balance','Status'].map(h => <th key={h} className="text-left py-2 px-3 text-xs">{h}</th>)}</tr></thead>
        <tbody>
          {data.invoices.map((inv, i) => (
            <tr key={i} className="border-b border-[#EBEBEB] hover:bg-gray-50 text-sm">
              <td className="py-2 px-3 font-mono text-green-600">{inv.invoice_number}</td>
              <td className="py-2 px-3 text-gray-500">{formatDate(inv.date)}</td>
              <td className="py-2 px-3">{inv.supplier_name}</td>
              <td className="py-2 px-3 font-mono">{formatCurrency(inv.total_amount)}</td>
              <td className="py-2 px-3 font-mono">{formatCurrency(inv.tax_amount)}</td>
              <td className="py-2 px-3 font-mono text-green-600">{formatCurrency(inv.paid_amount)}</td>
              <td className="py-2 px-3 font-mono text-red-600">{formatCurrency(inv.balance_due)}</td>
              <td className="py-2 px-3 capitalize">{inv.payment_status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExpenseReportView({ data, formatCurrency, formatDate }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
          <p className="text-xs text-orange-600 font-medium">Total Expenses</p>
          <p className="font-mono font-bold text-orange-800 mt-1 text-lg">{formatCurrency(data.total)}</p>
        </div>
        <div className="bg-white border border-[#EBEBEB] rounded-lg p-3">
          <p className="text-xs text-gray-500 font-medium mb-2">By Category</p>
          {data.by_category.slice(0, 4).map((c, i) => (
            <div key={i} className="flex justify-between text-xs py-0.5">
              <span className="text-gray-600 truncate">{c.account_name}</span>
              <span className="font-mono">{formatCurrency(c.total)}</span>
            </div>
          ))}
        </div>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="bg-[#FAFAFA] text-[#AAAAAA]">{['Exp #','Date','Category','Amount','Description'].map(h => <th key={h} className="text-left py-2 px-3 text-xs">{h}</th>)}</tr></thead>
        <tbody>
          {data.expenses.map((exp, i) => (
            <tr key={i} className="border-b border-[#EBEBEB] hover:bg-gray-50 text-sm">
              <td className="py-2 px-3 font-mono text-green-600">{exp.expense_number}</td>
              <td className="py-2 px-3 text-gray-500">{formatDate(exp.date)}</td>
              <td className="py-2 px-3">{exp.account_name}</td>
              <td className="py-2 px-3 font-mono font-medium">{formatCurrency(exp.amount)}</td>
              <td className="py-2 px-3 text-gray-500">{exp.description || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgingReport({ data, formatCurrency, formatDate, type }) {
  const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  data.forEach(inv => { buckets[inv.bucket] = (buckets[inv.bucket] || 0) + inv.balance_due; });
  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {Object.entries(buckets).map(([range, amount], i) => {
          const styles = [
            ['linear-gradient(135deg,#B0F0D8,#E0FFF2)'],
            ['linear-gradient(135deg,#CCFF66,#F0FFB0)'],
            ['linear-gradient(135deg,#FFE8A0,#FFFAE0)'],
            ['linear-gradient(135deg,#FFD6C0,#FFF3EC)'],
          ];
          return (
            <div key={range} className="rounded-2xl p-4 shadow-sm" style={{ background: styles[i][0] }}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-black/50 mb-1">{range} days</p>
              <p className="font-mono font-bold text-[#1A1A1A] text-lg">{formatCurrency(amount)}</p>
            </div>
          );
        })}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#FAFAFA] text-[#AAAAAA]">
            <th className="text-left py-2 px-3 text-xs">Invoice #</th>
            <th className="text-left py-2 px-3 text-xs">{type === 'AR' ? 'Customer' : 'Supplier'}</th>
            <th className="text-left py-2 px-3 text-xs">Date</th>
            <th className="text-right py-2 px-3 text-xs">Total</th>
            <th className="text-right py-2 px-3 text-xs">Balance</th>
            <th className="text-right py-2 px-3 text-xs">Days</th>
            <th className="text-center py-2 px-3 text-xs">Bucket</th>
          </tr>
        </thead>
        <tbody>
          {data.map((inv, i) => (
            <tr key={i} className={`border-b border-[#EBEBEB] hover:bg-gray-50 text-sm ${inv.bucket === '90+' ? 'bg-red-50/30' : ''}`}>
              <td className="py-2 px-3 font-mono text-green-600">{inv.invoice_number}</td>
              <td className="py-2 px-3">{type === 'AR' ? inv.customer_name : inv.supplier_name}</td>
              <td className="py-2 px-3 text-gray-500">{formatDate(inv.date)}</td>
              <td className="py-2 px-3 text-right font-mono">{formatCurrency(inv.total_amount)}</td>
              <td className="py-2 px-3 text-right font-mono font-semibold text-red-600">{formatCurrency(inv.balance_due)}</td>
              <td className="py-2 px-3 text-right">{inv.days_overdue}</td>
              <td className="py-2 px-3 text-center">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inv.bucket === '90+' ? 'bg-red-100 text-red-800' : inv.bucket === '61-90' ? 'bg-orange-100 text-orange-800' : inv.bucket === '31-60' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                  {inv.bucket}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
