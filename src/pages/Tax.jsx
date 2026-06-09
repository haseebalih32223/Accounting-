import { useState, useEffect } from 'react';
import {
  AlertCircle, Calculator, Edit, Plus, Save, Search, Trash2, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';

const TAX_TYPES = ['sales_tax', 'income_tax', 'withholding'];

function TaxRecordModal({ record, isOpen, onClose, onSave }) {
  const { getToday } = useApp();
  const [form, setForm] = useState({ tax_type: 'sales_tax', period_from: '', period_to: '', taxable_amount: 0, tax_rate: 17, tax_amount: 0, paid_amount: 0, due_date: '', status: 'pending', reference: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) {
      setForm({ tax_type: record.tax_type, period_from: record.period_from, period_to: record.period_to, taxable_amount: record.taxable_amount, tax_rate: record.tax_rate, tax_amount: record.tax_amount, paid_amount: record.paid_amount || 0, due_date: record.due_date || '', status: record.status, reference: record.reference || '', notes: record.notes || '' });
    } else {
      setForm({ tax_type: 'sales_tax', period_from: '', period_to: '', taxable_amount: 0, tax_rate: 17, tax_amount: 0, paid_amount: 0, due_date: '', status: 'pending', reference: '', notes: '' });
    }
  }, [record, isOpen]);

  const calcTax = (taxable, rate) => {
    const tax = (parseFloat(taxable) || 0) * (parseFloat(rate) || 0) / 100;
    setForm(f => ({ ...f, tax_amount: tax }));
  };

  const handleSave = async () => {
    if (!form.period_from || !form.period_to) { toast.error('Period dates required'); return; }
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={record ? 'Edit Tax Record' : 'New Tax Record'} size="md"
      footer={
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-[#EBEBEB] rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Tax Type</label>
            <select value={form.tax_type} onChange={e => setForm(f => ({ ...f, tax_type: e.target.value }))} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]">
              {TAX_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]">
              <option value="pending">Pending</option>
              <option value="filed">Filed</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Period From *</label>
            <input type="date" value={form.period_from} onChange={e => setForm(f => ({ ...f, period_from: e.target.value }))} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Period To *</label>
            <input type="date" value={form.period_to} onChange={e => setForm(f => ({ ...f, period_to: e.target.value }))} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Taxable Amount</label>
            <input type="number" value={form.taxable_amount} onChange={e => { setForm(f => ({ ...f, taxable_amount: parseFloat(e.target.value) || 0 })); calcTax(e.target.value, form.tax_rate); }} min="0" step="0.01" className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm text-right font-mono" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Tax Rate %</label>
            <input type="number" value={form.tax_rate} onChange={e => { setForm(f => ({ ...f, tax_rate: parseFloat(e.target.value) || 0 })); calcTax(form.taxable_amount, e.target.value); }} min="0" max="100" step="0.1" className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm text-right font-mono" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Tax Amount</label>
            <input type="number" value={form.tax_amount} onChange={e => setForm(f => ({ ...f, tax_amount: parseFloat(e.target.value) || 0 }))} min="0" step="0.01" className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm text-right font-mono" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Paid Amount</label>
            <input type="number" value={form.paid_amount} onChange={e => setForm(f => ({ ...f, paid_amount: parseFloat(e.target.value) || 0 }))} min="0" step="0.01" className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm text-right font-mono" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Due Date</label>
            <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Reference</label>
            <input type="text" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm resize-none" />
        </div>
      </div>
    </Modal>
  );
}

export default function Tax() {
  const { formatCurrency, formatDate, getToday } = useApp();
  const { canEdit } = useAuth();
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [tab, setTab] = useState('records');
  const now = new Date();
  const [summaryPeriod, setSummaryPeriod] = useState({
    from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
    to: getToday(),
  });

  useEffect(() => { loadRecords(); }, []);
  useEffect(() => { if (tab === 'summary') loadSummary(); }, [tab, summaryPeriod]);

  const loadRecords = async () => {
    const data = await window.electronAPI.getTaxRecords();
    setRecords(data);
  };

  const loadSummary = async () => {
    const data = await window.electronAPI.getTaxSummary(summaryPeriod.from, summaryPeriod.to);
    setSummary(data);
  };

  const handleSave = async (form) => {
    try {
      if (editRecord) {
        await window.electronAPI.updateTaxRecord(editRecord.id, form);
        toast.success('Tax record updated');
      } else {
        await window.electronAPI.createTaxRecord(form);
        toast.success('Tax record saved');
      }
      setShowModal(false);
      setEditRecord(null);
      loadRecords();
    } catch (err) {
      toast.error('Failed: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    await window.electronAPI.deleteTaxRecord(id);
    toast.success('Deleted');
    setDeleteConfirm(null);
    loadRecords();
  };

  const statusColors = { pending: 'bg-amber-100 text-amber-800', filed: 'bg-green-100 text-green-800', paid: 'bg-green-100 text-green-800' };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Tax / GST Management</h2>
        <div className="flex gap-3">
          <button onClick={() => setTab('records')} className={`px-4 py-2 text-sm font-medium rounded-full ${tab === 'records' ? 'bg-[#1A1A1A] text-white' : 'border border-[#EBEBEB] text-gray-600'}`}>Tax Records</button>
          <button onClick={() => setTab('summary')} className={`px-4 py-2 text-sm font-medium rounded-full ${tab === 'summary' ? 'bg-[#1A1A1A] text-white' : 'border border-[#EBEBEB] text-gray-600'}`}>GST Summary</button>
        </div>
      </div>

      {tab === 'records' && (
        <>
          <div className="flex justify-end mb-4">
            {canEdit && (
              <button onClick={() => { setEditRecord(null); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95">
                <Plus size={16} /> Add Tax Record
              </button>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm overflow-hidden">
            {records.length === 0 ? (
              <div className="text-center py-16 text-gray-400"><Calculator size={40} className="mx-auto mb-3 opacity-20" /><p>No tax records</p></div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-[#EBEBEB]">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Type</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Period</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Taxable</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Rate</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Tax Amount</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Paid</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Due Date</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500">Status</th>
                    {canEdit && <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} className="border-b border-[#EBEBEB] hover:bg-[#F8FFE8]">
                      <td className="py-3 px-4 text-sm font-medium text-gray-800">{r.tax_type.replace('_', ' ').toUpperCase()}</td>
                      <td className="py-3 px-4 text-xs text-gray-500">{formatDate(r.period_from)} — {formatDate(r.period_to)}</td>
                      <td className="py-3 px-4 text-right font-mono text-sm">{formatCurrency(r.taxable_amount)}</td>
                      <td className="py-3 px-4 text-right text-sm">{r.tax_rate}%</td>
                      <td className="py-3 px-4 text-right font-mono text-sm font-semibold">{formatCurrency(r.tax_amount)}</td>
                      <td className="py-3 px-4 text-right font-mono text-sm text-green-600">{r.paid_amount > 0 ? formatCurrency(r.paid_amount) : '-'}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">{r.due_date ? formatDate(r.due_date) : '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[r.status] || ''}`}>{r.status}</span>
                      </td>
                      {canEdit && (
                        <td className="py-3 px-4">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => { setEditRecord(r); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><Edit size={14} /></button>
                            <button onClick={() => setDeleteConfirm(r)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'summary' && (
        <div className="space-y-6">
          <div className="flex gap-3">
            <input type="date" value={summaryPeriod.from} onChange={e => setSummaryPeriod(f => ({ ...f, from: e.target.value }))} className="px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm" />
            <input type="date" value={summaryPeriod.to} onChange={e => setSummaryPeriod(f => ({ ...f, to: e.target.value }))} className="px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm" />
          </div>
          {summary && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">GST Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-[#EBEBEB]">
                    <span className="text-gray-600">Taxable Sales:</span>
                    <span className="font-mono font-medium">{formatCurrency(summary.taxable_sales)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#EBEBEB]">
                    <span className="text-green-700 font-medium">Output Tax (Sales):</span>
                    <span className="font-mono font-semibold text-green-700">{formatCurrency(summary.output_tax)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#EBEBEB]">
                    <span className="text-gray-600">Taxable Purchases:</span>
                    <span className="font-mono font-medium">{formatCurrency(summary.taxable_purchases)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#EBEBEB]">
                    <span className="text-green-700 font-medium">Input Tax (Purchases):</span>
                    <span className="font-mono font-semibold text-green-700">{formatCurrency(summary.input_tax)}</span>
                  </div>
                  <div className="flex justify-between py-3 bg-gray-50 rounded-lg px-3">
                    <span className="font-bold text-gray-900">Net GST Payable:</span>
                    <span className={`font-mono font-bold text-lg ${summary.net_tax_payable > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(Math.abs(summary.net_tax_payable))}</span>
                  </div>
                  {summary.net_tax_payable < 0 && <p className="text-xs text-green-600">* Input tax exceeds output tax — refund available</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <TaxRecordModal record={editRecord} isOpen={showModal} onClose={() => { setShowModal(false); setEditRecord(null); }} onSave={handleSave} />

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Tax Record" size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm border border-[#EBEBEB] rounded-lg">Cancel</button>
            <button onClick={() => handleDelete(deleteConfirm.id)} className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-full">Delete</button>
          </div>
        }
      >
        <div className="text-center py-4"><AlertCircle size={40} className="mx-auto text-red-500 mb-3" /><p>Delete this tax record?</p></div>
      </Modal>
    </div>
  );
}
