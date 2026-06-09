import { useState, useEffect } from 'react';
import {
 DollarSign, Eye, Phone, Search, TrendingUp,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import toast from 'react-hot-toast';

function CustomerLedgerModal({ customerId, isOpen, onClose }) {
 const { formatCurrency, formatDate } = useApp();
 const [data, setData] = useState(null);
 const [filters, setFilters] = useState({ from: '', to: '' });

 useEffect(() => {
 if (isOpen && customerId) loadLedger();
 }, [isOpen, customerId, filters]);

 const loadLedger = async () => {
 const d = await window.electronAPI.getCustomerLedger(customerId, filters.from || null, filters.to || null);
 setData(d);
 };

 if (!data) return null;

 return (
 <Modal isOpen={isOpen} onClose={onClose} title={`Customer Ledger: ${data.customer?.name}`} size="xl">
 <div className="space-y-4">
 <div className="flex gap-3">
 <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} className="px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm" />
 <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} className="px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm" />
 <button onClick={() => setFilters({ from: '', to: '' })} className="px-3 py-2 text-sm border border-[#EBEBEB] rounded-lg text-gray-500">Clear</button>
 </div>
 <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-3 gap-4 text-sm">
 <div><span className="text-gray-500">Phone:</span> <span>{data.customer?.phone || '-'}</span></div>
 <div><span className="text-gray-500">NTN:</span> <span>{data.customer?.ntn || '-'}</span></div>
 <div><span className="text-gray-500">Outstanding:</span> <span className="font-bold text-red-600">{formatCurrency(data.customer?.current_balance || 0)}</span></div>
 </div>
 <table className="w-full text-sm">
 <thead>
 <tr className="bg-[#FAFAFA] text-[#AAAAAA]">
 <th className="text-left py-2 px-3 text-xs">Date</th>
 <th className="text-left py-2 px-3 text-xs">Invoice #</th>
 <th className="text-left py-2 px-3 text-xs">Type</th>
 <th className="text-right py-2 px-3 text-xs">Amount</th>
 <th className="text-center py-2 px-3 text-xs">Status</th>
 </tr>
 </thead>
 <tbody>
 {data.ledger.length === 0 ? (
 <tr><td colSpan="5" className="text-center py-8 text-gray-400">No transactions</td></tr>
 ) : data.ledger.map((row, i) => (
 <tr key={i} className="border-b border-[#EBEBEB] hover:bg-gray-50">
 <td className="py-2 px-3 text-gray-600">{formatDate(row.date)}</td>
 <td className="py-2 px-3 font-mono text-green-600">{row.invoice_number}</td>
 <td className="py-2 px-3 text-gray-500">{row.type}</td>
 <td className="py-2 px-3 text-right font-mono font-medium">{formatCurrency(row.debit)}</td>
 <td className="py-2 px-3 text-center"><StatusBadge status={row.payment_status} /></td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </Modal>
 );
}

export default function Receivables() {
 const { customers, formatCurrency, loadCustomers } = useApp();
 const { canEdit } = useAuth();
 const [search, setSearch] = useState('');
 const [viewCustomerId, setViewCustomerId] = useState(null);
 const [paymentCustomer, setPaymentCustomer] = useState(null);

 const filtered = customers.filter(c =>
 c.name.toLowerCase().includes(search.toLowerCase()) ||
 (c.code && c.code.toLowerCase().includes(search.toLowerCase()))
 );

 const totalReceivable = filtered.reduce((s, c) => s + (c.current_balance || 0), 0);

 return (
 <div className="p-6">
 <div className="flex items-center justify-between mb-6">
 <div>
 <h2 className="text-xl font-bold text-gray-900">Accounts Receivable</h2>
 <p className="text-sm text-gray-500">Customer outstanding balances</p>
 </div>
 </div>

 <div className="rounded-2xl p-5 mb-6 inline-block min-w-64 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all" style={{ background: 'linear-gradient(135deg, #DDD0FF 0%, #EBE4FF 60%, #F3F0FF 100%)' }}>
 <p className="text-[11px] font-semibold uppercase tracking-wider text-black/50 mb-2">Total Receivable</p>
 <p className="text-2xl font-bold font-mono text-[#1A1A1A]">{formatCurrency(totalReceivable)}</p>
 </div>

 <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm p-4 mb-4">
 <div className="relative">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
 <input type="text" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]" />
 </div>
 </div>

 <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm overflow-hidden">
 <table className="w-full">
 <thead>
 <tr className="bg-gray-50 border-b border-[#EBEBEB]">
 <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Code</th>
 <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Customer Name</th>
 <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Phone</th>
 <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">NTN</th>
 <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Credit Limit</th>
 <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Outstanding</th>
 <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500">Actions</th>
 </tr>
 </thead>
 <tbody>
 {filtered.length === 0 ? (
 <tr><td colSpan="7" className="text-center py-16 text-gray-400"><TrendingUp size={40} className="mx-auto mb-3 opacity-20" /><p>No customers found</p></td></tr>
 ) : filtered.map(c => (
 <tr key={c.id} className="border-b border-[#EBEBEB] hover:bg-[#F8FFE8]">
 <td className="py-3 px-4 font-mono text-xs text-gray-400">{c.code}</td>
 <td className="py-3 px-4 text-sm font-semibold text-gray-800">{c.name}</td>
 <td className="py-3 px-4 text-sm text-gray-500">{c.phone || '-'}</td>
 <td className="py-3 px-4 text-sm text-gray-500">{c.ntn || '-'}</td>
 <td className="py-3 px-4 text-right font-mono text-sm text-gray-600">{c.credit_limit > 0 ? formatCurrency(c.credit_limit) : '-'}</td>
 <td className="py-3 px-4 text-right">
 <span className={`font-mono text-sm font-bold ${(c.current_balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
 {formatCurrency(c.current_balance || 0)}
 </span>
 </td>
 <td className="py-3 px-4">
 <div className="flex justify-center gap-1">
 <button onClick={() => setViewCustomerId(c.id)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="View Ledger"><Eye size={14} /></button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 <CustomerLedgerModal customerId={viewCustomerId} isOpen={!!viewCustomerId} onClose={() => setViewCustomerId(null)} />
 </div>
 );
}
