import { useState, useEffect } from 'react';
import {
 ArrowDown, ArrowUp, Landmark,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function BankCash() {
 const { formatCurrency, formatDate } = useApp();
 const [accounts, setAccounts] = useState([]);
 const [selected, setSelected] = useState(null);
 const [transactions, setTransactions] = useState([]);
 const [filters, setFilters] = useState({ from: '', to: '' });
 const [loading, setLoading] = useState(false);

 useEffect(() => { loadAccounts(); }, []);
 useEffect(() => { if (selected) loadTransactions(); }, [selected, filters]);

 const loadAccounts = async () => {
 const data = await window.electronAPI.getBankAccounts();
 setAccounts(data);
 if (data.length > 0) setSelected(data[0].id);
 };

 const loadTransactions = async () => {
 setLoading(true);
 try {
 const data = await window.electronAPI.getBankTransactions(selected, filters.from || null, filters.to || null);
 setTransactions(data);
 } finally {
 setLoading(false);
 }
 };

 const selectedAccount = accounts.find(a => a.id === selected);

 return (
 <div className="p-6">
 <h2 className="text-xl font-bold text-gray-900 mb-6">Bank & Cash Management</h2>

 {/* Account cards */}
 <div className="grid grid-cols-4 gap-4 mb-6">
 {accounts.map(acc => (
 <button
 key={acc.id}
 onClick={() => setSelected(acc.id)}
 className={`rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${selected === acc.id ? 'ring-2 ring-[#0EA5E9] shadow-md' : 'shadow-sm'}`}
 style={{
 background: acc.is_bank
 ? 'linear-gradient(135deg, #A8DFFF 0%, #C8EEFF 60%, #E0F5FF 100%)'
 : 'linear-gradient(135deg, #CCFF66 0%, #E8FF99 60%, #F0FFB0 100%)',
 
 }}
 >
 <div className="flex items-center gap-2 mb-2">
 <Landmark size={16} className="text-black/40" />
 <span className="text-[10px] font-semibold uppercase tracking-wider text-black/40">{acc.is_bank ? 'Bank' : 'Cash'}</span>
 </div>
 <p className="text-[13px] font-semibold text-[#1A1A1A]">{acc.name}</p>
 <p className="text-xl font-bold font-mono text-[#1A1A1A] mt-1">{formatCurrency(acc.balance || 0)}</p>
 </button>
 ))}
 </div>

 {/* Transactions */}
 {selectedAccount && (
 <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm">
 <div className="flex items-center justify-between p-5 border-b border-[#EBEBEB]">
 <div>
 <h3 className="font-semibold text-gray-800">{selectedAccount.name} — Statement</h3>
 <p className="text-sm text-gray-500">Balance: {formatCurrency(selectedAccount.balance || 0)}</p>
 </div>
 <div className="flex gap-3">
 <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} className="px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm" />
 <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} className="px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm" />
 <button onClick={() => setFilters({ from: '', to: '' })} className="px-3 py-2 text-sm border border-[#EBEBEB] rounded-lg text-gray-500 hover:bg-gray-50">Clear</button>
 </div>
 </div>

 {loading ? (
 <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div></div>
 ) : transactions.length === 0 ? (
 <div className="text-center py-16 text-gray-400"><Landmark size={40} className="mx-auto mb-3 opacity-20" /><p>No transactions found</p></div>
 ) : (
 <table className="w-full">
 <thead>
 <tr className="bg-gray-50 border-b border-[#EBEBEB]">
 <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Date</th>
 <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Voucher #</th>
 <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Description</th>
 <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Debit (In)</th>
 <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Credit (Out)</th>
 <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Balance</th>
 </tr>
 </thead>
 <tbody>
 {transactions.map((tx, i) => (
 <tr key={i} className="border-b border-[#EBEBEB] hover:bg-[#F8FFE8]">
 <td className="py-2.5 px-4 text-sm text-gray-600">{formatDate(tx.date)}</td>
 <td className="py-2.5 px-4 font-mono text-sm text-green-600">{tx.voucher_number}</td>
 <td className="py-2.5 px-4 text-sm text-gray-600">{tx.narration || tx.voucher_narration || '-'}</td>
 <td className="py-2.5 px-4 text-right font-mono text-sm text-green-700">{tx.debit > 0 ? formatCurrency(tx.debit) : '-'}</td>
 <td className="py-2.5 px-4 text-right font-mono text-sm text-red-600">{tx.credit > 0 ? formatCurrency(tx.credit) : '-'}</td>
 <td className="py-2.5 px-4 text-right font-mono text-sm font-semibold text-gray-800">{formatCurrency(tx.balance)}</td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>
 )}
 </div>
 );
}
