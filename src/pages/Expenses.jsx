import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
 AlertCircle, ChevronDown, CreditCard, Edit, Plus, Save, Search, Trash2, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';

function ExpenseFormModal({ expense, isOpen, onClose, onSave }) {
 const { getExpenseAccounts, getCashBankAccounts, formatCurrency, getToday } = useApp();
 const [form, setForm] = useState({ date: getToday(), account_id: '', payment_account_id: '', amount: 0, tax_amount: 0, description: '', reference: '' });
 const [saving, setSaving] = useState(false);

 const expenseAccounts = getExpenseAccounts();
 const bankAccounts = getCashBankAccounts();

 useEffect(() => {
 if (expense) {
 setForm({ date: expense.date, account_id: expense.account_id, payment_account_id: expense.payment_account_id, amount: expense.amount, tax_amount: expense.tax_amount || 0, description: expense.description || '', reference: expense.reference || '' });
 } else {
 setForm({ date: getToday(), account_id: expenseAccounts[0]?.id || '', payment_account_id: bankAccounts[0]?.id || '', amount: 0, tax_amount: 0, description: '', reference: '' });
 }
 }, [expense, isOpen]);

 const handleSave = async () => {
 if (!form.account_id) { toast.error('Select expense category'); return; }
 if (!form.payment_account_id) { toast.error('Select payment account'); return; }
 if (!form.amount || form.amount <= 0) { toast.error('Amount must be > 0'); return; }
 setSaving(true);
 try {
 await onSave(form);
 } finally {
 setSaving(false);
 }
 };

 return (
 <Modal isOpen={isOpen} onClose={onClose} title={expense ? 'Edit Expense' : 'New Expense'} size="md"
 footer={
 <div className="flex justify-end gap-3">
 <button onClick={onClose} className="px-4 py-2 text-sm border border-[#EBEBEB] rounded-lg">Cancel</button>
 <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95 disabled:opacity-50">
 {saving ? 'Saving...' : expense ? 'Update' : 'Save Expense'}
 </button>
 </div>
 }
 >
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1.5">Date *</label>
 <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]" />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1.5">Reference</label>
 <input type="text" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Bill #, receipt #..." className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]" />
 </div>
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1.5">Expense Category *</label>
 <select value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: parseInt(e.target.value) }))} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]">
 <option value="">Select category...</option>
 {expenseAccounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1.5">Paid From *</label>
 <select value={form.payment_account_id} onChange={e => setForm(f => ({ ...f, payment_account_id: parseInt(e.target.value) }))} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]">
 <option value="">Select account...</option>
 {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
 </select>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount *</label>
 <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} min="0" step="0.01" className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm text-right font-mono focus:outline-none focus:border-[#B8F53A]" />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1.5">Tax Amount</label>
 <input type="number" value={form.tax_amount} onChange={e => setForm(f => ({ ...f, tax_amount: parseFloat(e.target.value) || 0 }))} min="0" step="0.01" className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm text-right font-mono focus:outline-none focus:border-[#B8F53A]" />
 </div>
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
 <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A] resize-none" />
 </div>
 </div>
 </Modal>
 );
}

export default function Expenses() {
 const { formatCurrency, formatDate } = useApp();
 const { user, canEdit } = useAuth();
 const [expenses, setExpenses] = useState([]);
 const [loading, setLoading] = useState(true);
 const [filters, setFilters] = useState({ search: '', from: '', to: '' });
 const [showModal, setShowModal] = useState(false);
 const [editExpense, setEditExpense] = useState(null);
 const [deleteConfirm, setDeleteConfirm] = useState(null);

 useEffect(() => { loadExpenses(); }, [filters]);

 const loadExpenses = async () => {
 setLoading(true);
 try {
 const data = await window.electronAPI.getExpenses(filters);
 setExpenses(data);
 } finally {
 setLoading(false);
 }
 };

 const handleSave = async (form) => {
 try {
 if (editExpense) {
 await window.electronAPI.updateExpense(editExpense.id, form);
 toast.success('Expense updated');
 } else {
 await window.electronAPI.createExpense({ ...form, user_id: user?.id });
 toast.success('Expense recorded');
 }
 setShowModal(false);
 setEditExpense(null);
 loadExpenses();
 } catch (err) {
 toast.error('Failed: ' + err.message);
 }
 };

 const handleDelete = async (id) => {
 try {
 await window.electronAPI.deleteExpense(id);
 toast.success('Expense deleted');
 setDeleteConfirm(null);
 loadExpenses();
 } catch { toast.error('Delete failed'); }
 };

 const total = expenses.reduce((s, e) => s + e.amount, 0);

 return (
 <div className="p-6">
 <div className="flex items-center justify-between mb-6">
 <div>
 <h2 className="text-xl font-bold text-gray-900">Expenses</h2>
 <p className="text-sm text-gray-500">{expenses.length} records · Total: {formatCurrency(total)}</p>
 </div>
 {canEdit && (
 <button onClick={() => { setEditExpense(null); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95">
 <Plus size={16} /> New Expense
 </button>
 )}
 </div>

 {/* Summary card */}
 <div className="bg-white rounded-xl border border-[#EBEBEB] shadow-sm p-4 mb-6 inline-block min-w-64">
 <p className="text-xs text-gray-500 uppercase font-medium">Total Expenses</p>
 <p className="text-2xl font-bold font-mono text-orange-700 mt-1">{formatCurrency(total)}</p>
 {filters.from && <p className="text-xs text-gray-400 mt-1">{filters.from} to {filters.to || 'now'}</p>}
 </div>

 {/* Filters */}
 <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm p-4 mb-4 flex gap-3">
 <div className="relative flex-1">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
 <input type="text" placeholder="Search expenses..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} className="w-full pl-9 pr-4 py-2 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]" />
 </div>
 <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} className="px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm" />
 <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} className="px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm" />
 </div>

 <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm overflow-hidden">
 {loading ? (
 <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div></div>
 ) : expenses.length === 0 ? (
 <div className="text-center py-16 text-gray-400">
 <CreditCard size={40} className="mx-auto mb-3 opacity-20" />
 <p>No expenses found</p>
 </div>
 ) : (
 <table className="w-full">
 <thead>
 <tr className="bg-gray-50 border-b border-[#EBEBEB]">
 <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Expense #</th>
 <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Date</th>
 <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Category</th>
 <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Paid From</th>
 <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Description</th>
 <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Amount</th>
 <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500">Actions</th>
 </tr>
 </thead>
 <tbody>
 {expenses.map(exp => (
 <tr key={exp.id} className="border-b border-[#EBEBEB] hover:bg-[#F8FFE8]">
 <td className="py-3 px-4 font-mono text-sm font-semibold text-green-600">{exp.expense_number}</td>
 <td className="py-3 px-4 text-sm text-gray-600">{formatDate(exp.date)}</td>
 <td className="py-3 px-4 text-sm text-gray-800 font-medium">{exp.account_name}</td>
 <td className="py-3 px-4 text-sm text-gray-500">{exp.payment_account_name || '-'}</td>
 <td className="py-3 px-4 text-sm text-gray-500 max-w-xs truncate">{exp.description || '-'}</td>
 <td className="py-3 px-4 text-right font-mono text-sm font-semibold text-gray-800">{formatCurrency(exp.amount)}</td>
 <td className="py-3 px-4">
 <div className="flex justify-center gap-1">
 {canEdit && (
 <>
 <button onClick={() => { setEditExpense(exp); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><Edit size={14} /></button>
 <button onClick={() => setDeleteConfirm(exp)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
 </>
 )}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>

 <ExpenseFormModal expense={editExpense} isOpen={showModal} onClose={() => { setShowModal(false); setEditExpense(null); }} onSave={handleSave} />

 <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Expense" size="sm"
 footer={
 <div className="flex justify-end gap-3">
 <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm border border-[#EBEBEB] rounded-lg">Cancel</button>
 <button onClick={() => handleDelete(deleteConfirm.id)} className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg">Delete</button>
 </div>
 }
 >
 <div className="text-center py-4">
 <AlertCircle size={40} className="mx-auto text-red-500 mb-3" />
 <p>Delete expense <strong>{deleteConfirm?.expense_number}</strong>?</p>
 </div>
 </Modal>
 </div>
 );
}
