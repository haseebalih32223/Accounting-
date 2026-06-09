import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
 AlertCircle, CheckCircle, ChevronDown, Clock, DollarSign, Download, Edit, Eye, Plus, Printer, Save, Search, ShoppingBag, Trash2, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import { numberToWords, formatDate as fmtDate } from '../utils/accounting';

const UNITS = ['pcs', 'kg', 'g', 'ltr', 'ml', 'mtr', 'ft', 'box', 'bag', 'set', 'pair', 'dozen', 'ton'];

function emptyItem() {
 return { id: Date.now() + Math.random(), product_name: '', description: '', quantity: 1, unit: 'pcs', unit_price: 0, tax_percent: 0, tax_amount: 0, total: 0, account_id: '' };
}

function calcItem(item) {
 const gross = parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0);
 const tax = gross * (parseFloat(item.tax_percent || 0) / 100);
 return { ...item, tax_amount: tax, total: gross + tax };
}

function PurchaseForm({ invoiceId }) {
 const navigate = useNavigate();
 const { suppliers, accounts, settings, formatCurrency, getToday } = useApp();
 const { user, canEdit } = useAuth();
 const expenseAccounts = accounts.filter(a => a.type === 'expense' && a.sub_type !== 'group');

 const [form, setForm] = useState({
 invoice_number: '',
 supplier_invoice_no: '',
 date: getToday(),
 due_date: '',
 supplier_id: '',
 supplier_name: '',
 notes: '',
 tax_percent: parseFloat(settings.default_tax_rate || 17),
 tax_amount: 0,
 discount_amount: 0,
 subtotal: 0,
 total_amount: 0,
 });
 const [items, setItems] = useState([emptyItem()]);
 const [supplierSearch, setSupplierSearch] = useState('');
 const [showSupplierDrop, setShowSupplierDrop] = useState(false);
 const [loading, setLoading] = useState(false);
 const [saving, setSaving] = useState(false);

 useEffect(() => {
 if (invoiceId) loadInvoice();
 else loadNextNumber();
 }, [invoiceId]);

 const loadNextNumber = async () => {
 const num = await window.electronAPI.getNextPurchaseInvoiceNumber();
 setForm(f => ({ ...f, invoice_number: num }));
 };

 const loadInvoice = async () => {
 setLoading(true);
 try {
 const inv = await window.electronAPI.getPurchaseInvoiceById(parseInt(invoiceId));
 if (!inv) { navigate('/purchases'); return; }
 setForm({ invoice_number: inv.invoice_number, supplier_invoice_no: inv.supplier_invoice_no || '', date: inv.date, due_date: inv.due_date || '', supplier_id: inv.supplier_id || '', supplier_name: inv.supplier_name, notes: inv.notes || '', tax_percent: inv.tax_percent || 0, tax_amount: inv.tax_amount || 0, discount_amount: inv.discount_amount || 0, subtotal: inv.subtotal || 0, total_amount: inv.total_amount || 0 });
 setSupplierSearch(inv.supplier_name);
 setItems(inv.items.map(i => ({ ...i, id: i.id || Date.now() + Math.random() })));
 } finally {
 setLoading(false);
 }
 };

 const recalc = useCallback((updatedItems) => {
 const calculated = updatedItems.map(calcItem);
 const subtotal = calculated.reduce((s, i) => s + i.total, 0);
 return { items: calculated, subtotal, total_amount: subtotal };
 }, []);

 const updateItem = (idx, field, value) => {
 setItems(prev => {
 const updated = [...prev];
 updated[idx] = calcItem({ ...updated[idx], [field]: value });
 const { items: calcItems, subtotal, total_amount } = recalc(updated);
 setForm(f => ({ ...f, subtotal, total_amount }));
 return calcItems;
 });
 };

 const addItem = () => setItems(p => [...p, emptyItem()]);
 const removeItem = (idx) => {
 setItems(prev => {
 const updated = prev.filter((_, i) => i !== idx);
 if (updated.length === 0) return [emptyItem()];
 const { items: calcItems, subtotal, total_amount } = recalc(updated);
 setForm(f => ({ ...f, subtotal, total_amount }));
 return calcItems;
 });
 };

 const selectSupplier = (s) => {
 setForm(f => ({ ...f, supplier_id: s.id, supplier_name: s.name }));
 setSupplierSearch(s.name);
 setShowSupplierDrop(false);
 };

 const filteredSuppliers = suppliers.filter(s =>
 s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
 (s.code && s.code.toLowerCase().includes(supplierSearch.toLowerCase()))
 );

 const validate = () => {
 if (!form.supplier_name.trim()) { toast.error('Supplier name is required'); return false; }
 const validItems = items.filter(i => i.product_name.trim());
 if (validItems.length === 0) { toast.error('At least one item is required'); return false; }
 return true;
 };

 const handleSave = async () => {
 if (!validate()) return;
 setSaving(true);
 try {
 const validItems = items.filter(i => i.product_name.trim());
 const payload = { ...form, items: validItems, user_id: user?.id };
 if (invoiceId) {
 await window.electronAPI.updatePurchaseInvoice(parseInt(invoiceId), payload);
 toast.success('Purchase invoice updated');
 } else {
 await window.electronAPI.createPurchaseInvoice(payload);
 toast.success('Purchase invoice created');
 }
 navigate('/purchases');
 } catch (err) {
 toast.error('Failed to save: ' + err.message);
 } finally {
 setSaving(false);
 }
 };

 const selectedSupplier = suppliers.find(s => s.id === form.supplier_id);
 if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div></div>;

 return (
 <div className="p-6 max-w-5xl mx-auto">
 <div className="flex items-center justify-between mb-6">
 <div>
 <h2 className="text-xl font-bold text-gray-900">{invoiceId ? 'Edit Purchase Invoice' : 'New Purchase Invoice'}</h2>
 </div>
 <div className="flex gap-3">
 <button onClick={() => navigate('/purchases')} className="px-4 py-2 text-sm text-gray-600 border border-[#EBEBEB] rounded-lg hover:bg-gray-50">Cancel</button>
 {canEdit && (
 <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95 disabled:opacity-50">
 <Save size={16} /> {saving ? 'Saving...' : 'Save Invoice'}
 </button>
 )}
 </div>
 </div>

 <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm">
 <div className="p-6 border-b border-[#EBEBEB]">
 <div className="grid grid-cols-4 gap-4">
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1.5">Invoice Number</label>
 <input type="text" value={form.invoice_number} readOnly className="w-full px-3 py-2.5 bg-[#F5F5F0] border border-transparent rounded-xl text-sm font-mono" />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1.5">Supplier Invoice #</label>
 <input type="text" value={form.supplier_invoice_no} onChange={e => setForm(f => ({ ...f, supplier_invoice_no: e.target.value }))} placeholder="Supplier's invoice number" className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]" />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1.5">Date *</label>
 <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]" />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1.5">Due Date</label>
 <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]" />
 </div>
 </div>
 </div>

 <div className="p-6 border-b border-[#EBEBEB]">
 <div className="grid grid-cols-2 gap-5">
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1.5">Supplier *</label>
 <div className="relative">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 value={supplierSearch}
 onChange={e => { setSupplierSearch(e.target.value); setForm(f => ({ ...f, supplier_name: e.target.value, supplier_id: '' })); setShowSupplierDrop(true); }}
 onFocus={() => setShowSupplierDrop(true)}
 placeholder="Search or type supplier name..."
 className="w-full pl-9 pr-4 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]"
 />
 {showSupplierDrop && supplierSearch && filteredSuppliers.length > 0 && (
 <div className="absolute z-10 top-full mt-1 w-full bg-[#F5F5F0] border border-transparent rounded-xl shadow-lg max-h-48 overflow-y-auto">
 {filteredSuppliers.slice(0, 8).map(s => (
 <button key={s.id} type="button" onClick={() => selectSupplier(s)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm">
 <div className="font-medium">{s.name}</div>
 <div className="text-xs text-gray-400">{s.code} {s.phone && `· ${s.phone}`}</div>
 </button>
 ))}
 </div>
 )}
 </div>
 {selectedSupplier && (
 <div className="mt-2 p-2.5 bg-gray-50 rounded-lg text-xs text-gray-600">
 <div className="font-medium">{selectedSupplier.name}</div>
 {selectedSupplier.ntn && <div>NTN: {selectedSupplier.ntn}</div>}
 </div>
 )}
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1.5">Notes</label>
 <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A] resize-none" />
 </div>
 </div>
 </div>

 {/* Items */}
 <div className="p-6 border-b border-[#EBEBEB]">
 <div className="flex justify-between mb-3">
 <h3 className="text-sm font-semibold text-gray-700">Purchase Items</h3>
 {canEdit && <button onClick={addItem} className="flex items-center gap-1.5 text-sm text-green-600 font-medium"><Plus size={15} /> Add Row</button>}
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-[#EBEBEB]">
 <th className="text-left py-2 text-xs font-medium text-gray-500 w-6">#</th>
 <th className="text-left py-2 text-xs font-medium text-gray-500 min-w-[160px]">Description</th>
 <th className="text-left py-2 text-xs font-medium text-gray-500 min-w-[140px]">Expense Account</th>
 <th className="text-right py-2 text-xs font-medium text-gray-500 w-20">Qty</th>
 <th className="text-left py-2 text-xs font-medium text-gray-500 w-16 pl-2">Unit</th>
 <th className="text-right py-2 text-xs font-medium text-gray-500 w-28">Unit Price</th>
 <th className="text-right py-2 text-xs font-medium text-gray-500 w-20">Tax %</th>
 <th className="text-right py-2 text-xs font-medium text-gray-500 w-28">Total</th>
 {canEdit && <th className="w-8"></th>}
 </tr>
 </thead>
 <tbody>
 {items.map((item, idx) => (
 <tr key={item.id} className="border-b border-[#EBEBEB]">
 <td className="py-2 text-gray-400 text-xs">{idx + 1}</td>
 <td className="py-2 pr-2">
 <input type="text" value={item.product_name} onChange={e => updateItem(idx, 'product_name', e.target.value)} placeholder="Item name" readOnly={!canEdit} className="w-full px-2 py-1.5 border border-[#EBEBEB] rounded text-sm focus:outline-none focus:border-[#B8F53A] read-only:bg-gray-50" />
 </td>
 <td className="py-2 pr-2">
 <select value={item.account_id} onChange={e => updateItem(idx, 'account_id', parseInt(e.target.value) || '')} disabled={!canEdit} className="w-full px-2 py-1.5 border border-[#EBEBEB] rounded text-sm focus:outline-none focus:border-[#B8F53A] disabled:bg-gray-50">
 <option value="">Select account...</option>
 {expenseAccounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
 </select>
 </td>
 <td className="py-2 pr-2">
 <input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} min="0" step="0.01" readOnly={!canEdit} className="w-full px-2 py-1.5 border border-[#EBEBEB] rounded text-sm text-right font-mono focus:outline-none focus:border-[#B8F53A] read-only:bg-gray-50" />
 </td>
 <td className="py-2 pr-2 pl-2">
 <select value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} disabled={!canEdit} className="w-full px-1 py-1.5 border border-[#EBEBEB] rounded text-sm focus:outline-none focus:border-[#B8F53A] disabled:bg-gray-50">
 {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
 </select>
 </td>
 <td className="py-2 pr-2">
 <input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} min="0" step="0.01" readOnly={!canEdit} className="w-full px-2 py-1.5 border border-[#EBEBEB] rounded text-sm text-right font-mono focus:outline-none focus:border-[#B8F53A] read-only:bg-gray-50" />
 </td>
 <td className="py-2 pr-2">
 <input type="number" value={item.tax_percent} onChange={e => updateItem(idx, 'tax_percent', parseFloat(e.target.value) || 0)} min="0" max="100" step="0.1" readOnly={!canEdit} className="w-full px-2 py-1.5 border border-[#EBEBEB] rounded text-sm text-right font-mono focus:outline-none focus:border-[#B8F53A] read-only:bg-gray-50" />
 </td>
 <td className="py-2 text-right"><span className="font-mono text-sm font-medium">{formatCurrency(item.total)}</span></td>
 {canEdit && <td className="py-2 pl-2"><button onClick={() => removeItem(idx)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 size={14} /></button></td>}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 <div className="p-6 flex justify-end">
 <div className="min-w-[280px] space-y-2 text-sm">
 <div className="flex justify-between text-gray-600"><span>Subtotal:</span><span className="font-mono font-medium">{formatCurrency(form.subtotal)}</span></div>
 <div className="border-t border-[#EBEBEB] pt-2 flex justify-between items-center">
 <span className="font-bold text-gray-900 text-base">Total:</span>
 <span className="font-mono font-bold text-lg text-gray-900">{formatCurrency(form.total_amount)}</span>
 </div>
 <div className="mt-3 p-3 bg-gray-50 rounded-lg">
 <p className="text-xs text-gray-500 font-medium mb-1">Amount in Words:</p>
 <p className="text-xs text-gray-700 italic">{numberToWords(form.total_amount)}</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

function PaymentModal({ invoice, isOpen, onClose, onSuccess }) {
 const { getCashBankAccounts, formatCurrency, getToday } = useApp();
 const { user } = useAuth();
 const bankAccounts = getCashBankAccounts();
 const [form, setForm] = useState({ amount: 0, date: getToday(), account_id: '' });
 const [saving, setSaving] = useState(false);

 useEffect(() => {
 if (invoice && isOpen) setForm(f => ({ ...f, amount: invoice.balance_due, date: getToday(), account_id: bankAccounts[0]?.id || '' }));
 }, [invoice, isOpen]);

 const handleSave = async () => {
 if (!form.account_id) { toast.error('Select payment account'); return; }
 if (!form.amount || form.amount <= 0) { toast.error('Amount must be > 0'); return; }
 setSaving(true);
 try {
 await window.electronAPI.recordPurchasePayment(invoice.id, { amount: parseFloat(form.amount), date: form.date, account_id: form.account_id, user_id: user?.id });
 toast.success('Payment recorded');
 onSuccess();
 onClose();
 } catch (err) {
 toast.error('Failed: ' + err.message);
 } finally {
 setSaving(false);
 }
 };

 if (!invoice) return null;

 return (
 <Modal isOpen={isOpen} onClose={onClose} title="Pay Supplier" size="sm"
 footer={
 <div className="flex justify-end gap-3">
 <button onClick={onClose} className="px-4 py-2 text-sm border border-[#EBEBEB] rounded-lg">Cancel</button>
 <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95 disabled:opacity-50">
 <CheckCircle size={16} /> {saving ? 'Saving...' : 'Record Payment'}
 </button>
 </div>
 }
 >
 <div className="space-y-4">
 <div className="bg-gray-50 rounded-lg p-4 text-sm">
 <p className="font-medium">{invoice.supplier_name}</p>
 <p className="text-gray-500">{invoice.invoice_number}</p>
 <div className="flex justify-between mt-2 font-bold text-red-600">
 <span>Balance Due:</span>
 <span className="font-mono">{formatCurrency(invoice.balance_due)}</span>
 </div>
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment Date</label>
 <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]" />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount *</label>
 <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} min="0" step="0.01" className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm text-right font-mono focus:outline-none focus:border-[#B8F53A]" />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1.5">Pay From *</label>
 <select value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: parseInt(e.target.value) }))} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]">
 <option value="">Select account...</option>
 {bankAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
 </select>
 </div>
 </div>
 </Modal>
 );
}

export default function PurchaseInvoice() {
 const navigate = useNavigate();
 const { formatCurrency, formatDate } = useApp();
 const { canEdit } = useAuth();
 const [invoices, setInvoices] = useState([]);
 const [loading, setLoading] = useState(true);
 const [filters, setFilters] = useState({ status: '', search: '', from: '', to: '' });
 const [paymentInvoice, setPaymentInvoice] = useState(null);
 const [deleteConfirm, setDeleteConfirm] = useState(null);

 useEffect(() => { loadInvoices(); }, [filters]);

 const loadInvoices = async () => {
 setLoading(true);
 try {
 const data = await window.electronAPI.getPurchaseInvoices(filters);
 setInvoices(data);
 } finally {
 setLoading(false);
 }
 };

 const handleDelete = async (id) => {
 try {
 await window.electronAPI.deletePurchaseInvoice(id);
 toast.success('Invoice deleted');
 setDeleteConfirm(null);
 loadInvoices();
 } catch { toast.error('Delete failed'); }
 };

 const totals = invoices.reduce((acc, inv) => ({ total: acc.total + inv.total_amount, paid: acc.paid + inv.paid_amount, balance: acc.balance + inv.balance_due }), { total: 0, paid: 0, balance: 0 });

 return (
 <div className="p-6">
 <div className="flex items-center justify-between mb-6">
 <div>
 <h2 className="text-xl font-bold text-gray-900">Purchase Invoices</h2>
 <p className="text-sm text-gray-500">{invoices.length} invoices</p>
 </div>
 {canEdit && (
 <button onClick={() => navigate('/purchases/new')} className="flex items-center gap-2 px-4 py-2.5 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95">
 <Plus size={16} /> New Purchase Invoice
 </button>
 )}
 </div>

 <div className="grid grid-cols-3 gap-4 mb-6">
 <div className="rounded-2xl p-5 shadow-sm border border-transparent hover:-translate-y-0.5 hover:shadow-md transition-all" style={{ background: 'linear-gradient(135deg, #FFE8A0 0%, #FFF0C0 60%, #FFFAE0 100%)' }}>
 <p className="text-[11px] font-semibold uppercase tracking-wider text-black/50 mb-2">Total Purchased</p>
 <p className="text-2xl font-bold font-mono text-[#1A1A1A]">{formatCurrency(totals.total)}</p>
 </div>
 <div className="rounded-2xl p-5 shadow-sm border border-transparent hover:-translate-y-0.5 hover:shadow-md transition-all" style={{ background: 'linear-gradient(135deg, #B0F0D8 0%, #CCFFE8 60%, #E0FFF2 100%)' }}>
 <p className="text-[11px] font-semibold uppercase tracking-wider text-black/50 mb-2">Total Paid</p>
 <p className="text-2xl font-bold font-mono text-[#1A1A1A]">{formatCurrency(totals.paid)}</p>
 </div>
 <div className="rounded-2xl p-5 shadow-sm border border-transparent hover:-translate-y-0.5 hover:shadow-md transition-all" style={{ background: 'linear-gradient(135deg, #FFD6C0 0%, #FFE8D6 60%, #FFF3EC 100%)' }}>
 <p className="text-[11px] font-semibold uppercase tracking-wider text-black/50 mb-2">Outstanding Payable</p>
 <p className="text-2xl font-bold font-mono text-[#1A1A1A]">{formatCurrency(totals.balance)}</p>
 </div>
 </div>

 <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm p-4 mb-4 flex gap-3">
 <div className="relative flex-1">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
 <input type="text" placeholder="Search..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} className="w-full pl-9 pr-4 py-2 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]" />
 </div>
 <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm">
 <option value="">All Status</option>
 <option value="unpaid">Unpaid</option>
 <option value="partial">Partial</option>
 <option value="paid">Paid</option>
 </select>
 <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} className="px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm" />
 <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} className="px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm" />
 </div>

 <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm overflow-hidden">
 {loading ? (
 <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div></div>
 ) : invoices.length === 0 ? (
 <div className="text-center py-16 text-gray-400">
 <ShoppingBag size={40} className="mx-auto mb-3 opacity-20" />
 <p>No purchase invoices found</p>
 </div>
 ) : (
 <table className="w-full">
 <thead>
 <tr className="bg-gray-50 border-b border-[#EBEBEB]">
 <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Invoice #</th>
 <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Supplier</th>
 <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Date</th>
 <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Due Date</th>
 <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Total</th>
 <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Paid</th>
 <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Balance</th>
 <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500">Status</th>
 <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500">Actions</th>
 </tr>
 </thead>
 <tbody>
 {invoices.map(inv => (
 <tr key={inv.id} className="border-b border-[#EBEBEB] hover:bg-[#F8FFE8]">
 <td className="py-3 px-4 font-mono text-sm font-semibold text-green-600">{inv.invoice_number}</td>
 <td className="py-3 px-4 text-sm text-gray-800">{inv.supplier_name}</td>
 <td className="py-3 px-4 text-sm text-gray-600">{formatDate(inv.date)}</td>
 <td className="py-3 px-4 text-sm text-gray-600">{inv.due_date ? formatDate(inv.due_date) : '-'}</td>
 <td className="py-3 px-4 text-right font-mono text-sm font-medium text-gray-800">{formatCurrency(inv.total_amount)}</td>
 <td className="py-3 px-4 text-right font-mono text-sm text-green-700">{inv.paid_amount > 0 ? formatCurrency(inv.paid_amount) : '-'}</td>
 <td className="py-3 px-4 text-right font-mono text-sm"><span className={inv.balance_due > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}>{inv.balance_due > 0 ? formatCurrency(inv.balance_due) : 'Paid'}</span></td>
 <td className="py-3 px-4 text-center"><StatusBadge status={inv.payment_status} /></td>
 <td className="py-3 px-4">
 <div className="flex justify-center gap-1">
 {canEdit && (
 <>
 <button onClick={() => navigate(`/purchases/edit/${inv.id}`)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><Edit size={14} /></button>
 {inv.payment_status !== 'paid' && (
 <button onClick={() => setPaymentInvoice(inv)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><DollarSign size={14} /></button>
 )}
 <button onClick={() => setDeleteConfirm(inv)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
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

 <PaymentModal invoice={paymentInvoice} isOpen={!!paymentInvoice} onClose={() => setPaymentInvoice(null)} onSuccess={loadInvoices} />

 <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Invoice" size="sm"
 footer={
 <div className="flex justify-end gap-3">
 <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm border border-[#EBEBEB] rounded-lg">Cancel</button>
 <button onClick={() => handleDelete(deleteConfirm.id)} className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg">Delete</button>
 </div>
 }
 >
 <div className="text-center py-4">
 <AlertCircle size={40} className="mx-auto text-red-500 mb-3" />
 <p>Delete invoice <strong>{deleteConfirm?.invoice_number}</strong>?</p>
 </div>
 </Modal>
 </div>
 );
}

export { PurchaseForm };
