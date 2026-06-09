import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
 Plus, Trash2, Save, X, Printer, Search, ChevronDown,
 CheckCircle, AlertCircle, Clock, Edit, Eye, DollarSign, Download, Receipt,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import { numberToWords, formatDate as fmtDate } from '../utils/accounting';
import { exportSalesInvoicePDF } from '../utils/pdfExport';

const UNITS = ['pcs', 'kg', 'g', 'ltr', 'ml', 'mtr', 'ft', 'box', 'bag', 'set', 'pair', 'dozen', 'ton'];

function emptyItem() {
 return {
 id: Date.now() + Math.random(),
 product_name: '',
 description: '',
 quantity: 1,
 unit: 'pcs',
 unit_price: 0,
 discount: 0,
 tax_percent: 0,
 tax_amount: 0,
 total: 0,
 };
}

function calcItem(item) {
 const gross = parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0);
 const disc = gross * (parseFloat(item.discount || 0) / 100);
 const taxable = gross - disc;
 const tax = taxable * (parseFloat(item.tax_percent || 0) / 100);
 return { ...item, tax_amount: tax, total: taxable + tax };
}

// ─── Invoice Form ─────────────────────────────────────────────────────────────
function InvoiceForm({ invoiceId }) {
 const navigate = useNavigate();
 const { customers, settings, formatCurrency, getToday } = useApp();
 const { user, canEdit } = useAuth();

 const [form, setForm] = useState({
 invoice_number: '',
 date: getToday(),
 due_date: '',
 customer_id: '',
 customer_name: '',
 notes: '',
 discount_percent: 0,
 discount_amount: 0,
 tax_percent: parseFloat(settings.default_tax_rate || 17),
 tax_amount: 0,
 subtotal: 0,
 total_amount: 0,
 });
 const [items, setItems] = useState([emptyItem()]);
 const [customerSearch, setCustomerSearch] = useState('');
 const [showCustomerDrop, setShowCustomerDrop] = useState(false);
 const [loading, setLoading] = useState(false);
 const [saving, setSaving] = useState(false);

 useEffect(() => {
 if (invoiceId) {
 loadInvoice();
 } else {
 loadNextNumber();
 }
 }, [invoiceId]);

 const loadNextNumber = async () => {
 const num = await window.electronAPI.getNextInvoiceNumber();
 setForm(f => ({ ...f, invoice_number: num }));
 };

 const loadInvoice = async () => {
 setLoading(true);
 try {
 const inv = await window.electronAPI.getSalesInvoiceById(parseInt(invoiceId));
 if (!inv) { navigate('/sales'); return; }
 setForm({
 invoice_number: inv.invoice_number,
 date: inv.date,
 due_date: inv.due_date || '',
 customer_id: inv.customer_id || '',
 customer_name: inv.customer_name,
 notes: inv.notes || '',
 discount_percent: inv.discount_percent || 0,
 discount_amount: inv.discount_amount || 0,
 tax_percent: inv.tax_percent || 0,
 tax_amount: inv.tax_amount || 0,
 subtotal: inv.subtotal || 0,
 total_amount: inv.total_amount || 0,
 });
 setCustomerSearch(inv.customer_name);
 setItems(inv.items.map(item => ({ ...item, id: item.id || Date.now() + Math.random() })));
 } finally {
 setLoading(false);
 }
 };

 const recalc = useCallback((updatedItems, discPct, discAmt, taxPct) => {
 const calculated = updatedItems.map(calcItem);
 const subtotal = calculated.reduce((s, i) => s + i.total, 0);
 const disc = discAmt > 0 ? parseFloat(discAmt) : subtotal * (parseFloat(discPct || 0) / 100);
 const taxable = subtotal - disc;
 const tax = taxable * (parseFloat(taxPct || 0) / 100);
 const total = taxable + tax;
 return { items: calculated, subtotal, discount_amount: disc, tax_amount: tax, total_amount: total };
 }, []);

 const updateItem = (idx, field, value) => {
 setItems(prev => {
 const updated = [...prev];
 updated[idx] = calcItem({ ...updated[idx], [field]: value });
 const { items: calcItems, subtotal, discount_amount, tax_amount, total_amount } = recalc(updated, form.discount_percent, form.discount_amount, form.tax_percent);
 setForm(f => ({ ...f, subtotal, discount_amount, tax_amount, total_amount }));
 return calcItems;
 });
 };

 const addItem = () => setItems(p => [...p, emptyItem()]);

 const removeItem = (idx) => {
 setItems(prev => {
 const updated = prev.filter((_, i) => i !== idx);
 if (updated.length === 0) return [emptyItem()];
 const { items: calcItems, subtotal, discount_amount, tax_amount, total_amount } = recalc(updated, form.discount_percent, form.discount_amount, form.tax_percent);
 setForm(f => ({ ...f, subtotal, discount_amount, tax_amount, total_amount }));
 return calcItems;
 });
 };

 const handleFormChange = (field, value) => {
 setForm(f => {
 const updated = { ...f, [field]: value };
 if (['discount_percent', 'discount_amount', 'tax_percent'].includes(field)) {
 const { subtotal, discount_amount, tax_amount, total_amount } = recalc(items, updated.discount_percent, updated.discount_amount, updated.tax_percent);
 return { ...updated, subtotal, discount_amount, tax_amount, total_amount };
 }
 return updated;
 });
 };

 const selectCustomer = (cust) => {
 setForm(f => ({ ...f, customer_id: cust.id, customer_name: cust.name }));
 setCustomerSearch(cust.name);
 setShowCustomerDrop(false);
 };

 const filteredCustomers = customers.filter(c =>
 c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
 (c.code && c.code.toLowerCase().includes(customerSearch.toLowerCase()))
 );

 const validate = () => {
 if (!form.customer_name.trim()) { toast.error('Customer name is required'); return false; }
 if (!form.date) { toast.error('Date is required'); return false; }
 const validItems = items.filter(i => i.product_name.trim());
 if (validItems.length === 0) { toast.error('At least one item is required'); return false; }
 for (const item of validItems) {
 if (item.quantity <= 0) { toast.error(`Quantity must be > 0 for "${item.product_name}"`); return false; }
 if (item.unit_price < 0) { toast.error(`Price cannot be negative for "${item.product_name}"`); return false; }
 }
 return true;
 };

 const handleSave = async () => {
 if (!validate()) return;
 setSaving(true);
 try {
 const validItems = items.filter(i => i.product_name.trim());
 const { subtotal, discount_amount, tax_amount, total_amount } = recalc(validItems, form.discount_percent, form.discount_amount, form.tax_percent);
 const payload = {
 ...form,
 subtotal,
 discount_amount,
 tax_amount,
 total_amount,
 items: validItems,
 user_id: user?.id,
 };
 if (invoiceId) {
 await window.electronAPI.updateSalesInvoice(parseInt(invoiceId), payload);
 toast.success('Invoice updated successfully');
 } else {
 await window.electronAPI.createSalesInvoice(payload);
 toast.success('Invoice created successfully');
 }
 navigate('/sales');
 } catch (err) {
 toast.error('Failed to save invoice: ' + err.message);
 } finally {
 setSaving(false);
 }
 };

 const selectedCustomer = customers.find(c => c.id === form.customer_id);

 if (loading) return (
 <div className="flex items-center justify-center h-64">
 <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
 </div>
 );

 return (
 <div className="p-6 max-w-5xl mx-auto">
 {/* Page header */}
 <div className="flex items-center justify-between mb-6">
 <div>
 <h2 className="text-xl font-bold text-gray-900">{invoiceId ? 'Edit Invoice' : 'New Sales Invoice'}</h2>
 <p className="text-sm text-gray-500">Fill in the invoice details below</p>
 </div>
 <div className="flex gap-3">
 <button
 onClick={() => navigate('/sales')}
 className="px-4 py-2 text-sm text-gray-600 border border-[#EBEBEB] rounded-lg hover:bg-gray-50 transition-colors"
 >
 Cancel
 </button>
 {canEdit && (
 <button
 onClick={handleSave}
 disabled={saving}
 className="flex items-center gap-2 px-5 py-2 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95 transition-colors disabled:opacity-50"
 >
 <Save size={16} />
 {saving ? 'Saving...' : invoiceId ? 'Update Invoice' : 'Save Invoice'}
 </button>
 )}
 </div>
 </div>

 <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm">
 {/* Invoice header section */}
 <div className="p-6 border-b border-[#EBEBEB]">
 <div className="grid grid-cols-3 gap-5">
 {/* Invoice number */}
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1.5">Invoice Number</label>
 <input
 type="text"
 value={form.invoice_number}
 readOnly
 className="w-full px-3 py-2.5 bg-[#F5F5F0] border border-transparent rounded-xl text-sm font-mono text-gray-600"
 />
 </div>
 {/* Date */}
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1.5">Invoice Date <span className="text-red-500">*</span></label>
 <input
 type="date"
 value={form.date}
 onChange={e => handleFormChange('date', e.target.value)}
 className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]"
 />
 </div>
 {/* Due date */}
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1.5">Due Date</label>
 <input
 type="date"
 value={form.due_date}
 onChange={e => handleFormChange('due_date', e.target.value)}
 className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]"
 />
 </div>
 </div>
 </div>

 {/* Customer section */}
 <div className="p-6 border-b border-[#EBEBEB]">
 <div className="grid grid-cols-2 gap-5">
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1.5">Customer <span className="text-red-500">*</span></label>
 <div className="relative">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 value={customerSearch}
 onChange={e => {
 setCustomerSearch(e.target.value);
 setForm(f => ({ ...f, customer_name: e.target.value, customer_id: '' }));
 setShowCustomerDrop(true);
 }}
 onFocus={() => setShowCustomerDrop(true)}
 placeholder="Search or type customer name..."
 className="w-full pl-9 pr-4 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]"
 />
 {showCustomerDrop && customerSearch && filteredCustomers.length > 0 && (
 <div className="absolute z-10 top-full mt-1 w-full bg-[#F5F5F0] border border-transparent rounded-xl shadow-lg max-h-48 overflow-y-auto">
 {filteredCustomers.slice(0, 8).map(c => (
 <button
 key={c.id}
 type="button"
 onClick={() => selectCustomer(c)}
 className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm"
 >
 <div className="font-medium text-gray-800">{c.name}</div>
 <div className="text-xs text-gray-400">{c.code} {c.phone && `· ${c.phone}`}</div>
 </button>
 ))}
 </div>
 )}
 </div>
 {selectedCustomer && (
 <div className="mt-2 p-2.5 bg-green-50 rounded-lg text-xs text-green-700">
 <div className="font-medium">{selectedCustomer.name}</div>
 {selectedCustomer.address && <div>{selectedCustomer.address}</div>}
 {selectedCustomer.ntn && <div>NTN: {selectedCustomer.ntn}</div>}
 {selectedCustomer.credit_limit > 0 && (
 <div>Credit Limit: {formatCurrency(selectedCustomer.credit_limit)} | Balance: {formatCurrency(selectedCustomer.current_balance)}</div>
 )}
 </div>
 )}
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1.5">Notes / Terms</label>
 <textarea
 value={form.notes}
 onChange={e => handleFormChange('notes', e.target.value)}
 rows={3}
 placeholder="Payment terms, special notes..."
 className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A] resize-none"
 />
 </div>
 </div>
 </div>

 {/* Items table */}
 <div className="p-6 border-b border-[#EBEBEB]">
 <div className="flex items-center justify-between mb-3">
 <h3 className="text-sm font-semibold text-gray-700">Invoice Items</h3>
 {canEdit && (
 <button
 onClick={addItem}
 className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium"
 >
 <Plus size={15} /> Add Row
 </button>
 )}
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-[#EBEBEB]">
 <th className="text-left py-2 text-xs font-medium text-gray-500 w-6">#</th>
 <th className="text-left py-2 text-xs font-medium text-gray-500 min-w-[180px]">Description *</th>
 <th className="text-right py-2 text-xs font-medium text-gray-500 w-20">Qty</th>
 <th className="text-left py-2 text-xs font-medium text-gray-500 w-20 pl-2">Unit</th>
 <th className="text-right py-2 text-xs font-medium text-gray-500 w-28">Unit Price</th>
 <th className="text-right py-2 text-xs font-medium text-gray-500 w-20">Disc %</th>
 <th className="text-right py-2 text-xs font-medium text-gray-500 w-20">Tax %</th>
 <th className="text-right py-2 text-xs font-medium text-gray-500 w-28">Total</th>
 {canEdit && <th className="w-8"></th>}
 </tr>
 </thead>
 <tbody>
 {items.map((item, idx) => (
 <tr key={item.id} className="border-b border-[#EBEBEB] hover:bg-[#F8FFE8]">
 <td className="py-2 text-gray-400 text-xs">{idx + 1}</td>
 <td className="py-2 pr-2">
 <input
 type="text"
 value={item.product_name}
 onChange={e => updateItem(idx, 'product_name', e.target.value)}
 placeholder="Product/Service name"
 readOnly={!canEdit}
 className="w-full px-2 py-1.5 border border-[#EBEBEB] rounded text-sm focus:outline-none focus:border-[#B8F53A] read-only:bg-gray-50"
 />
 <input
 type="text"
 value={item.description || ''}
 onChange={e => updateItem(idx, 'description', e.target.value)}
 placeholder="Description (optional)"
 readOnly={!canEdit}
 className="w-full px-2 py-1 text-xs text-gray-400 border-0 focus:outline-none bg-transparent mt-0.5 read-only:bg-transparent"
 />
 </td>
 <td className="py-2 pr-2">
 <input
 type="number"
 value={item.quantity}
 onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
 min="0"
 step="0.01"
 readOnly={!canEdit}
 className="w-full px-2 py-1.5 border border-[#EBEBEB] rounded text-sm text-right focus:outline-none focus:border-[#B8F53A] font-mono read-only:bg-gray-50"
 />
 </td>
 <td className="py-2 pr-2 pl-2">
 <select
 value={item.unit}
 onChange={e => updateItem(idx, 'unit', e.target.value)}
 disabled={!canEdit}
 className="w-full px-2 py-1.5 border border-[#EBEBEB] rounded text-sm focus:outline-none focus:border-[#B8F53A] disabled:bg-gray-50"
 >
 {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
 </select>
 </td>
 <td className="py-2 pr-2">
 <input
 type="number"
 value={item.unit_price}
 onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
 min="0"
 step="0.01"
 readOnly={!canEdit}
 className="w-full px-2 py-1.5 border border-[#EBEBEB] rounded text-sm text-right focus:outline-none focus:border-[#B8F53A] font-mono read-only:bg-gray-50"
 />
 </td>
 <td className="py-2 pr-2">
 <input
 type="number"
 value={item.discount}
 onChange={e => updateItem(idx, 'discount', parseFloat(e.target.value) || 0)}
 min="0"
 max="100"
 step="0.1"
 readOnly={!canEdit}
 className="w-full px-2 py-1.5 border border-[#EBEBEB] rounded text-sm text-right focus:outline-none focus:border-[#B8F53A] font-mono read-only:bg-gray-50"
 />
 </td>
 <td className="py-2 pr-2">
 <input
 type="number"
 value={item.tax_percent}
 onChange={e => updateItem(idx, 'tax_percent', parseFloat(e.target.value) || 0)}
 min="0"
 max="100"
 step="0.1"
 readOnly={!canEdit}
 className="w-full px-2 py-1.5 border border-[#EBEBEB] rounded text-sm text-right focus:outline-none focus:border-[#B8F53A] font-mono read-only:bg-gray-50"
 />
 </td>
 <td className="py-2 text-right">
 <span className="font-mono text-sm font-medium text-gray-700">
 {formatCurrency(item.total)}
 </span>
 </td>
 {canEdit && (
 <td className="py-2 pl-2">
 <button
 onClick={() => removeItem(idx)}
 className="p-1 text-gray-300 hover:text-red-500 transition-colors"
 >
 <Trash2 size={14} />
 </button>
 </td>
 )}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* Totals section */}
 <div className="p-6">
 <div className="flex gap-8">
 {/* Discount and Tax controls */}
 <div className="flex-1">
 <div className="grid grid-cols-2 gap-4 max-w-sm">
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1.5">Invoice Discount %</label>
 <input
 type="number"
 value={form.discount_percent}
 onChange={e => handleFormChange('discount_percent', parseFloat(e.target.value) || 0)}
 min="0"
 max="100"
 step="0.1"
 readOnly={!canEdit}
 className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm text-right font-mono focus:outline-none focus:border-[#B8F53A] read-only:bg-gray-50"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1.5">Tax Rate (GST) %</label>
 <input
 type="number"
 value={form.tax_percent}
 onChange={e => handleFormChange('tax_percent', parseFloat(e.target.value) || 0)}
 min="0"
 max="100"
 step="0.1"
 readOnly={!canEdit}
 className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm text-right font-mono focus:outline-none focus:border-[#B8F53A] read-only:bg-gray-50"
 />
 </div>
 </div>
 </div>

 {/* Totals */}
 <div className="min-w-[280px]">
 <div className="space-y-2 text-sm">
 <div className="flex justify-between text-gray-600">
 <span>Subtotal:</span>
 <span className="font-mono font-medium">{formatCurrency(form.subtotal)}</span>
 </div>
 {form.discount_amount > 0 && (
 <div className="flex justify-between text-red-600">
 <span>Discount ({form.discount_percent > 0 ? `${form.discount_percent}%` : 'fixed'}):</span>
 <span className="font-mono">- {formatCurrency(form.discount_amount)}</span>
 </div>
 )}
 {form.tax_amount > 0 && (
 <div className="flex justify-between text-gray-600">
 <span>GST ({form.tax_percent}%):</span>
 <span className="font-mono">+ {formatCurrency(form.tax_amount)}</span>
 </div>
 )}
 <div className="border-t border-[#EBEBEB] pt-2 flex justify-between items-center">
 <span className="font-bold text-gray-900 text-base">Total:</span>
 <span className="font-mono font-bold text-lg text-gray-900">{formatCurrency(form.total_amount)}</span>
 </div>
 </div>

 {/* Amount in words */}
 <div className="mt-3 p-3 bg-gray-50 rounded-lg">
 <p className="text-xs text-gray-500 font-medium mb-1">Amount in Words:</p>
 <p className="text-xs text-gray-700 italic">{numberToWords(form.total_amount)}</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

// ─── Invoice View Modal ───────────────────────────────────────────────────────
function InvoiceViewModal({ invoiceId, isOpen, onClose, onPayment }) {
 const { formatCurrency, settings } = useApp();
 const { canEdit } = useAuth();
 const [invoice, setInvoice] = useState(null);

 useEffect(() => {
 if (isOpen && invoiceId) loadInvoice();
 }, [isOpen, invoiceId]);

 const loadInvoice = async () => {
 const inv = await window.electronAPI.getSalesInvoiceById(invoiceId);
 setInvoice(inv);
 };

 const handlePrint = () => {
 if (!invoice) return;
 const doc = exportSalesInvoicePDF(invoice, settings);
 doc.autoPrint();
 window.open(doc.output('bloburl'), '_blank');
 };

 const handleDownload = () => {
 if (!invoice) return;
 const doc = exportSalesInvoicePDF(invoice, settings);
 doc.save(`Invoice_${invoice.invoice_number}.pdf`);
 };

 if (!invoice) return null;

 return (
 <Modal
 isOpen={isOpen}
 onClose={onClose}
 title={`Invoice ${invoice.invoice_number}`}
 size="lg"
 footer={
 <div className="flex justify-between">
 <div className="flex gap-2">
 <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 border border-[#EBEBEB] text-sm text-gray-600 rounded-lg hover:bg-gray-50">
 <Printer size={15} /> Print
 </button>
 <button onClick={handleDownload} className="flex items-center gap-1.5 px-4 py-2 border border-[#EBEBEB] text-sm text-gray-600 rounded-lg hover:bg-gray-50">
 <Download size={15} /> Download PDF
 </button>
 </div>
 {canEdit && invoice.payment_status !== 'paid' && (
 <button
 onClick={() => { onClose(); onPayment(invoice); }}
 className="flex items-center gap-1.5 px-5 py-2 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95"
 >
 <DollarSign size={15} /> Record Payment
 </button>
 )}
 </div>
 }
 >
 {/* Invoice preview */}
 <div className="space-y-4">
 {/* Header */}
 <div className="flex justify-between">
 <div>
 <p className="font-bold text-lg text-gray-900">{settings.company_name}</p>
 <p className="text-sm text-gray-500">{settings.company_address}</p>
 <p className="text-sm text-gray-500">{settings.company_phone}</p>
 {settings.company_ntn && <p className="text-xs text-gray-400">NTN: {settings.company_ntn}</p>}
 </div>
 <div className="text-right">
 <p className="font-bold text-xl text-green-600">SALES INVOICE</p>
 <p className="text-sm font-mono font-semibold text-gray-700">{invoice.invoice_number}</p>
 <p className="text-sm text-gray-500">Date: {fmtDate(invoice.date)}</p>
 {invoice.due_date && <p className="text-sm text-gray-500">Due: {fmtDate(invoice.due_date)}</p>}
 </div>
 </div>

 {/* Bill To */}
 <div className="bg-gray-50 rounded-lg p-4">
 <p className="text-xs text-gray-500 font-medium mb-1">Bill To:</p>
 <p className="font-semibold text-gray-800">{invoice.customer_name}</p>
 </div>

 {/* Items */}
 <table className="w-full text-sm">
 <thead>
 <tr className="bg-[#FAFAFA] text-[#AAAAAA]">
 <th className="text-left py-2 px-3 text-xs">#</th>
 <th className="text-left py-2 px-3 text-xs">Description</th>
 <th className="text-right py-2 px-3 text-xs">Qty</th>
 <th className="text-right py-2 px-3 text-xs">Unit</th>
 <th className="text-right py-2 px-3 text-xs">Price</th>
 <th className="text-right py-2 px-3 text-xs">Tax</th>
 <th className="text-right py-2 px-3 text-xs">Amount</th>
 </tr>
 </thead>
 <tbody>
 {invoice.items.map((item, i) => (
 <tr key={i} className="border-b border-[#EBEBEB]">
 <td className="py-2 px-3 text-gray-400">{i + 1}</td>
 <td className="py-2 px-3">
 <p className="font-medium text-gray-800">{item.product_name}</p>
 {item.description && <p className="text-xs text-gray-400">{item.description}</p>}
 </td>
 <td className="py-2 px-3 text-right font-mono">{item.quantity}</td>
 <td className="py-2 px-3 text-right text-gray-500">{item.unit}</td>
 <td className="py-2 px-3 text-right font-mono">{formatCurrency(item.unit_price)}</td>
 <td className="py-2 px-3 text-right text-gray-500">{item.tax_percent > 0 ? `${item.tax_percent}%` : '-'}</td>
 <td className="py-2 px-3 text-right font-mono font-medium">{formatCurrency(item.total)}</td>
 </tr>
 ))}
 </tbody>
 </table>

 {/* Totals */}
 <div className="flex justify-end">
 <div className="w-64 space-y-1.5 text-sm">
 <div className="flex justify-between text-gray-600">
 <span>Subtotal:</span>
 <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
 </div>
 {invoice.discount_amount > 0 && (
 <div className="flex justify-between text-red-600">
 <span>Discount:</span>
 <span className="font-mono">- {formatCurrency(invoice.discount_amount)}</span>
 </div>
 )}
 {invoice.tax_amount > 0 && (
 <div className="flex justify-between text-gray-600">
 <span>GST ({invoice.tax_percent}%):</span>
 <span className="font-mono">+ {formatCurrency(invoice.tax_amount)}</span>
 </div>
 )}
 <div className="border-t pt-2 flex justify-between font-bold text-base">
 <span>Total:</span>
 <span className="font-mono">{formatCurrency(invoice.total_amount)}</span>
 </div>
 {invoice.paid_amount > 0 && (
 <>
 <div className="flex justify-between text-green-600">
 <span>Paid:</span>
 <span className="font-mono">{formatCurrency(invoice.paid_amount)}</span>
 </div>
 <div className="flex justify-between text-red-600 font-semibold">
 <span>Balance Due:</span>
 <span className="font-mono">{formatCurrency(invoice.balance_due)}</span>
 </div>
 </>
 )}
 </div>
 </div>

 {/* Amount in words */}
 <div className="bg-gray-50 rounded-lg p-3 text-sm">
 <span className="font-medium text-gray-700">Amount in Words: </span>
 <span className="italic text-gray-600">{numberToWords(invoice.total_amount)}</span>
 </div>

 {invoice.notes && (
 <div className="text-sm text-gray-600">
 <span className="font-medium">Notes: </span>{invoice.notes}
 </div>
 )}

 {settings.invoice_footer && (
 <p className="text-center text-xs text-gray-400 italic border-t pt-3">{settings.invoice_footer}</p>
 )}
 </div>
 </Modal>
 );
}

// ─── Payment Modal ────────────────────────────────────────────────────────────
function PaymentModal({ invoice, isOpen, onClose, onSuccess }) {
 const { getCashBankAccounts, formatCurrency, getToday } = useApp();
 const { user } = useAuth();
 const bankAccounts = getCashBankAccounts();

 const [form, setForm] = useState({
 amount: 0,
 date: getToday(),
 account_id: '',
 notes: '',
 });
 const [saving, setSaving] = useState(false);

 useEffect(() => {
 if (invoice && isOpen) {
 setForm(f => ({
 ...f,
 amount: invoice.balance_due,
 date: getToday(),
 account_id: bankAccounts[0]?.id || '',
 }));
 }
 }, [invoice, isOpen]);

 const handleSave = async () => {
 if (!form.account_id) { toast.error('Please select payment account'); return; }
 if (!form.amount || form.amount <= 0) { toast.error('Payment amount must be greater than 0'); return; }
 if (form.amount > invoice.balance_due) { toast.error(`Amount cannot exceed balance due (${formatCurrency(invoice.balance_due)})`); return; }

 setSaving(true);
 try {
 await window.electronAPI.recordSalesPayment(invoice.id, {
 amount: parseFloat(form.amount),
 date: form.date,
 account_id: form.account_id,
 user_id: user?.id,
 });
 toast.success('Payment recorded successfully');
 onSuccess();
 onClose();
 } catch (err) {
 toast.error('Failed to record payment: ' + err.message);
 } finally {
 setSaving(false);
 }
 };

 if (!invoice) return null;

 return (
 <Modal
 isOpen={isOpen}
 onClose={onClose}
 title="Record Payment"
 size="sm"
 footer={
 <div className="flex justify-end gap-3">
 <button onClick={onClose} className="px-4 py-2 text-sm border border-[#EBEBEB] rounded-lg hover:bg-gray-50">Cancel</button>
 <button
 onClick={handleSave}
 disabled={saving}
 className="flex items-center gap-2 px-5 py-2 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95 disabled:opacity-50"
 >
 <CheckCircle size={16} />
 {saving ? 'Saving...' : 'Record Payment'}
 </button>
 </div>
 }
 >
 <div className="space-y-4">
 {/* Invoice info */}
 <div className="bg-gray-50 rounded-lg p-4 text-sm">
 <p className="font-medium text-gray-800">{invoice.customer_name}</p>
 <p className="text-gray-500">{invoice.invoice_number}</p>
 <div className="flex justify-between mt-2">
 <span className="text-gray-500">Invoice Total:</span>
 <span className="font-mono font-semibold">{formatCurrency(invoice.total_amount)}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-500">Paid:</span>
 <span className="font-mono text-green-600">{formatCurrency(invoice.paid_amount)}</span>
 </div>
 <div className="flex justify-between border-t mt-1 pt-1">
 <span className="font-semibold text-gray-700">Balance Due:</span>
 <span className="font-mono font-bold text-red-600">{formatCurrency(invoice.balance_due)}</span>
 </div>
 </div>

 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment Date</label>
 <input
 type="date"
 value={form.date}
 onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
 className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]"
 />
 </div>

 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment Amount <span className="text-red-500">*</span></label>
 <input
 type="number"
 value={form.amount}
 onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
 min="0"
 max={invoice.balance_due}
 step="0.01"
 className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm text-right font-mono focus:outline-none focus:border-[#B8F53A]"
 />
 </div>

 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1.5">Received In <span className="text-red-500">*</span></label>
 <select
 value={form.account_id}
 onChange={e => setForm(f => ({ ...f, account_id: parseInt(e.target.value) }))}
 className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]"
 >
 <option value="">Select account...</option>
 {bankAccounts.map(acc => (
 <option key={acc.id} value={acc.id}>{acc.name} (Balance: {formatCurrency(acc.balance || 0)})</option>
 ))}
 </select>
 </div>
 </div>
 </Modal>
 );
}

// ─── Sales Invoice List ───────────────────────────────────────────────────────
export default function SalesInvoice() {
 const navigate = useNavigate();
 const { formatCurrency, formatDate } = useApp();
 const { canEdit } = useAuth();

 const [invoices, setInvoices] = useState([]);
 const [loading, setLoading] = useState(true);
 const [filters, setFilters] = useState({ status: '', search: '', from: '', to: '' });
 const [viewInvoiceId, setViewInvoiceId] = useState(null);
 const [paymentInvoice, setPaymentInvoice] = useState(null);
 const [deleteConfirm, setDeleteConfirm] = useState(null);

 useEffect(() => {
 loadInvoices();
 }, [filters]);

 const loadInvoices = async () => {
 setLoading(true);
 try {
 const data = await window.electronAPI.getSalesInvoices(filters);
 setInvoices(data);
 } finally {
 setLoading(false);
 }
 };

 const handleDelete = async (id) => {
 try {
 await window.electronAPI.deleteSalesInvoice(id);
 toast.success('Invoice deleted');
 setDeleteConfirm(null);
 loadInvoices();
 } catch (err) {
 toast.error('Failed to delete invoice');
 }
 };

 const totals = invoices.reduce((acc, inv) => ({
 total: acc.total + inv.total_amount,
 paid: acc.paid + inv.paid_amount,
 balance: acc.balance + inv.balance_due,
 }), { total: 0, paid: 0, balance: 0 });

 return (
 <div className="p-6">
 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div>
 <h2 className="text-xl font-bold text-gray-900">Sales Invoices</h2>
 <p className="text-sm text-gray-500 mt-0.5">{invoices.length} invoices found</p>
 </div>
 {canEdit && (
 <button
 onClick={() => navigate('/sales/new')}
 className="flex items-center gap-2 px-5 py-2.5 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95 transition-colors"
 >
 <Plus size={16} /> New Invoice
 </button>
 )}
 </div>

 {/* Summary cards */}
 <div className="grid grid-cols-3 gap-4 mb-6">
 <div className="rounded-2xl p-5 shadow-sm border border-transparent hover:-translate-y-0.5 hover:shadow-md transition-all" style={{ background: 'linear-gradient(135deg, #CCFF66 0%, #E8FF99 60%, #F0FFB0 100%)' }}>
 <p className="text-[11px] font-semibold uppercase tracking-wider text-black/50 mb-2">Total Invoiced</p>
 <p className="text-2xl font-bold font-mono text-[#1A1A1A]">{formatCurrency(totals.total)}</p>
 </div>
 <div className="rounded-2xl p-5 shadow-sm border border-transparent hover:-translate-y-0.5 hover:shadow-md transition-all" style={{ background: 'linear-gradient(135deg, #B0F0D8 0%, #CCFFE8 60%, #E0FFF2 100%)' }}>
 <p className="text-[11px] font-semibold uppercase tracking-wider text-black/50 mb-2">Total Received</p>
 <p className="text-2xl font-bold font-mono text-[#1A1A1A]">{formatCurrency(totals.paid)}</p>
 </div>
 <div className="rounded-2xl p-5 shadow-sm border border-transparent hover:-translate-y-0.5 hover:shadow-md transition-all" style={{ background: 'linear-gradient(135deg, #FFD6C0 0%, #FFE8D6 60%, #FFF3EC 100%)' }}>
 <p className="text-[11px] font-semibold uppercase tracking-wider text-black/50 mb-2">Outstanding Balance</p>
 <p className="text-2xl font-bold font-mono text-[#1A1A1A]">{formatCurrency(totals.balance)}</p>
 </div>
 </div>

 {/* Filters */}
 <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm p-4 mb-4">
 <div className="flex gap-3 flex-wrap">
 <div className="relative flex-1 min-w-48">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 placeholder="Search invoice # or customer..."
 value={filters.search}
 onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
 className="w-full pl-9 pr-4 py-2 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]"
 />
 </div>
 <select
 value={filters.status}
 onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
 className="px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A] min-w-36"
 >
 <option value="">All Status</option>
 <option value="unpaid">Unpaid</option>
 <option value="partial">Partial</option>
 <option value="paid">Paid</option>
 </select>
 <input
 type="date"
 value={filters.from}
 onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
 className="px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]"
 placeholder="From date"
 />
 <input
 type="date"
 value={filters.to}
 onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
 className="px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]"
 placeholder="To date"
 />
 {(filters.status || filters.search || filters.from || filters.to) && (
 <button
 onClick={() => setFilters({ status: '', search: '', from: '', to: '' })}
 className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-[#EBEBEB] rounded-lg hover:bg-gray-50"
 >
 Clear
 </button>
 )}
 </div>
 </div>

 {/* Table */}
 <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm overflow-hidden">
 {loading ? (
 <div className="flex items-center justify-center h-48">
 <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
 </div>
 ) : invoices.length === 0 ? (
 <div className="text-center py-16 text-gray-400">
 <Receipt size={40} className="mx-auto mb-3 opacity-20" />
 <p className="font-medium">No invoices found</p>
 {canEdit && (
 <button
 onClick={() => navigate('/sales/new')}
 className="mt-3 text-green-600 hover:underline text-sm"
 >
 Create your first invoice
 </button>
 )}
 </div>
 ) : (
 <table className="w-full">
 <thead>
 <tr className="border-b border-[#EBEBEB] bg-gray-50">
 <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Invoice #</th>
 <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Customer</th>
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
 {invoices.map(inv => {
 const isOverdue = inv.payment_status !== 'paid' && inv.due_date && new Date(inv.due_date) < new Date();
 return (
 <tr key={inv.id} className={`border-b border-[#EBEBEB] hover:bg-[#F8FFE8] transition-colors ${isOverdue ? 'bg-red-50/30' : ''}`}>
 <td className="py-3 px-4">
 <button
 onClick={() => setViewInvoiceId(inv.id)}
 className="font-mono text-sm font-semibold text-green-600 hover:text-green-700 hover:underline"
 >
 {inv.invoice_number}
 </button>
 </td>
 <td className="py-3 px-4">
 <p className="text-sm font-medium text-gray-800">{inv.customer_name}</p>
 {inv.customer_phone && <p className="text-xs text-gray-400">{inv.customer_phone}</p>}
 </td>
 <td className="py-3 px-4 text-sm text-gray-600">{formatDate(inv.date)}</td>
 <td className="py-3 px-4 text-sm">
 {inv.due_date ? (
 <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}>
 {isOverdue && <AlertCircle size={12} className="inline mr-1" />}
 {formatDate(inv.due_date)}
 </span>
 ) : (
 <span className="text-gray-300">-</span>
 )}
 </td>
 <td className="py-3 px-4 text-right font-mono text-sm font-medium text-gray-800">
 {formatCurrency(inv.total_amount)}
 </td>
 <td className="py-3 px-4 text-right font-mono text-sm text-green-700">
 {inv.paid_amount > 0 ? formatCurrency(inv.paid_amount) : '-'}
 </td>
 <td className="py-3 px-4 text-right font-mono text-sm">
 <span className={inv.balance_due > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}>
 {inv.balance_due > 0 ? formatCurrency(inv.balance_due) : 'Paid'}
 </span>
 </td>
 <td className="py-3 px-4 text-center">
 <StatusBadge status={isOverdue && inv.payment_status !== 'paid' ? 'overdue' : inv.payment_status} />
 </td>
 <td className="py-3 px-4">
 <div className="flex items-center justify-center gap-1">
 <button
 onClick={() => setViewInvoiceId(inv.id)}
 className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
 title="View"
 >
 <Eye size={14} />
 </button>
 {canEdit && (
 <>
 <button
 onClick={() => navigate(`/sales/edit/${inv.id}`)}
 className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
 title="Edit"
 >
 <Edit size={14} />
 </button>
 {inv.payment_status !== 'paid' && (
 <button
 onClick={() => setPaymentInvoice(inv)}
 className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
 title="Record Payment"
 >
 <DollarSign size={14} />
 </button>
 )}
 <button
 onClick={() => setDeleteConfirm(inv)}
 className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
 title="Delete"
 >
 <Trash2 size={14} />
 </button>
 </>
 )}
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 )}
 </div>

 {/* View Modal */}
 <InvoiceViewModal
 invoiceId={viewInvoiceId}
 isOpen={!!viewInvoiceId}
 onClose={() => setViewInvoiceId(null)}
 onPayment={(inv) => { setPaymentInvoice(inv); }}
 />

 {/* Payment Modal */}
 <PaymentModal
 invoice={paymentInvoice}
 isOpen={!!paymentInvoice}
 onClose={() => setPaymentInvoice(null)}
 onSuccess={loadInvoices}
 />

 {/* Delete Confirm */}
 <Modal
 isOpen={!!deleteConfirm}
 onClose={() => setDeleteConfirm(null)}
 title="Delete Invoice"
 size="sm"
 footer={
 <div className="flex justify-end gap-3">
 <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm border border-[#EBEBEB] rounded-lg hover:bg-gray-50">Cancel</button>
 <button
 onClick={() => handleDelete(deleteConfirm.id)}
 className="px-5 py-2 bg-[#FF4444] hover:bg-[#E03030] text-white text-sm font-semibold rounded-full active:scale-95"
 >
 Delete Invoice
 </button>
 </div>
 }
 >
 <div className="text-center py-4">
 <AlertCircle size={40} className="mx-auto text-red-500 mb-3" />
 <p className="text-gray-700 font-medium">Delete Invoice {deleteConfirm?.invoice_number}?</p>
 <p className="text-gray-500 text-sm mt-1">This will also reverse all journal entries. This action cannot be undone.</p>
 </div>
 </Modal>
 </div>
 );
}

// Export the form as a named export for routing
export { InvoiceForm };
