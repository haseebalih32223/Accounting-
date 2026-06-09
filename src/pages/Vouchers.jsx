import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle, ChevronDown, Edit, Eye, FileText, Plus, Printer, Save, Search, Trash2, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import { formatDate } from '../utils/accounting';

const VOUCHER_TYPES = [
  { value: 'journal', label: 'Journal Voucher', abbr: 'JV', color: 'blue' },
  { value: 'payment', label: 'Payment Voucher', abbr: 'PV', color: 'red' },
  { value: 'receipt', label: 'Receipt Voucher', abbr: 'RV', color: 'green' },
  { value: 'contra', label: 'Contra Voucher', abbr: 'CV', color: 'purple' },
];

function emptyLine() {
  return { id: Date.now() + Math.random(), account_id: '', account_name: '', debit: 0, credit: 0, narration: '' };
}

function VoucherForm({ voucherId }) {
  const navigate = useNavigate();
  const { accounts, formatCurrency, getToday } = useApp();
  const { user, canEdit } = useAuth();

  const [form, setForm] = useState({
    voucher_number: '',
    voucher_type: 'journal',
    date: getToday(),
    reference: '',
    narration: '',
  });
  const [lines, setLines] = useState([emptyLine(), emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (voucherId) loadVoucher();
    else loadNextNumber(form.voucher_type);
  }, [voucherId]);

  const loadNextNumber = async (type) => {
    const num = await window.electronAPI.getNextVoucherNumber(type);
    setForm(f => ({ ...f, voucher_number: num }));
  };

  const loadVoucher = async () => {
    setLoading(true);
    try {
      const v = await window.electronAPI.getVoucherById(parseInt(voucherId));
      if (!v) { navigate('/vouchers'); return; }
      setForm({ voucher_number: v.voucher_number, voucher_type: v.voucher_type, date: v.date, reference: v.reference || '', narration: v.narration || '' });
      setLines(v.items.map(i => ({ ...i, id: i.id || Date.now() + Math.random() })));
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = async (type) => {
    setForm(f => ({ ...f, voucher_type: type }));
    const num = await window.electronAPI.getNextVoucherNumber(type);
    setForm(f => ({ ...f, voucher_type: type, voucher_number: num }));
  };

  const updateLine = (idx, field, value) => {
    setLines(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === 'account_id') {
        const acc = accounts.find(a => a.id === parseInt(value));
        updated[idx].account_name = acc ? acc.name : '';
      }
      return updated;
    });
  };

  const addLine = () => setLines(p => [...p, emptyLine()]);
  const removeLine = (idx) => setLines(p => p.length > 2 ? p.filter((_, i) => i !== idx) : p);

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01;

  const validate = () => {
    if (!form.date) { toast.error('Date is required'); return false; }
    const validLines = lines.filter(l => l.account_id);
    if (validLines.length < 2) { toast.error('At least 2 account entries are required'); return false; }
    if (!isBalanced) { toast.error(`Voucher is not balanced. Difference: ${formatCurrency(difference)}`); return false; }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const validLines = lines.filter(l => l.account_id);
      const payload = {
        ...form,
        total_debit: totalDebit,
        total_credit: totalCredit,
        items: validLines,
        user_id: user?.id,
      };
      if (voucherId) {
        await window.electronAPI.updateVoucher(parseInt(voucherId), payload);
        toast.success('Voucher updated');
      } else {
        await window.electronAPI.createVoucher(payload);
        toast.success('Voucher saved');
      }
      navigate('/vouchers');
    } catch (err) {
      toast.error('Failed to save voucher: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div></div>;

  const selectableAccounts = accounts.filter(a => a.sub_type !== 'group');

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{voucherId ? 'Edit Voucher' : 'New Voucher'}</h2>
          <p className="text-sm text-gray-500">Double-entry accounting voucher</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/vouchers')} className="px-4 py-2 text-sm text-gray-600 border border-[#EBEBEB] rounded-lg hover:bg-gray-50">Cancel</button>
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving || !isBalanced}
              className="flex items-center gap-2 px-5 py-2 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Saving...' : voucherId ? 'Update Voucher' : 'Post Voucher'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm">
        {/* Voucher type selector */}
        {!voucherId && (
          <div className="p-6 border-b border-[#EBEBEB]">
            <label className="block text-xs font-medium text-gray-500 mb-3">Voucher Type</label>
            <div className="flex gap-3">
              {VOUCHER_TYPES.map(vt => (
                <button
                  key={vt.value}
                  onClick={() => handleTypeChange(vt.value)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium border-2 transition-colors ${
                    form.voucher_type === vt.value
                      ? vt.color === 'blue' ? 'border-green-600 bg-green-50 text-green-700'
                      : vt.color === 'red' ? 'border-red-500 bg-red-50 text-red-700'
                      : vt.color === 'green' ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-[#EBEBEB] text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="font-bold mr-1">{vt.abbr}</span> {vt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Header fields */}
        <div className="p-6 border-b border-[#EBEBEB]">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Voucher Number</label>
              <input type="text" value={form.voucher_number} readOnly className="w-full px-3 py-2.5 bg-[#F5F5F0] border border-transparent rounded-xl text-sm font-mono" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Date *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Reference</label>
              <input type="text" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Cheque#, bill#..." className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Narration</label>
              <input type="text" value={form.narration} onChange={e => setForm(f => ({ ...f, narration: e.target.value }))} placeholder="Purpose of this voucher..." className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]" />
            </div>
          </div>
        </div>

        {/* Lines */}
        <div className="p-6 border-b border-[#EBEBEB]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Account Entries</h3>
            {canEdit && (
              <button onClick={addLine} className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium">
                <Plus size={15} /> Add Row
              </button>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#EBEBEB]">
                <th className="text-left py-2 text-xs font-medium text-gray-500 w-6">#</th>
                <th className="text-left py-2 text-xs font-medium text-gray-500">Account</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500 w-32">Debit (Dr)</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500 w-32">Credit (Cr)</th>
                <th className="text-left py-2 text-xs font-medium text-gray-500 pl-4">Narration</th>
                {canEdit && <th className="w-8"></th>}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={line.id} className="border-b border-[#EBEBEB]">
                  <td className="py-2 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="py-2 pr-2">
                    <select
                      value={line.account_id}
                      onChange={e => updateLine(idx, 'account_id', parseInt(e.target.value) || '')}
                      disabled={!canEdit}
                      className="w-full px-2 py-1.5 border border-[#EBEBEB] rounded text-sm focus:outline-none focus:border-[#B8F53A] disabled:bg-gray-50"
                    >
                      <option value="">Select account...</option>
                      {selectableAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      value={line.debit}
                      onChange={e => updateLine(idx, 'debit', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      readOnly={!canEdit}
                      className="w-full px-2 py-1.5 border border-[#EBEBEB] rounded text-sm text-right font-mono focus:outline-none focus:border-[#B8F53A] read-only:bg-gray-50"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      value={line.credit}
                      onChange={e => updateLine(idx, 'credit', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      readOnly={!canEdit}
                      className="w-full px-2 py-1.5 border border-[#EBEBEB] rounded text-sm text-right font-mono focus:outline-none focus:border-[#B8F53A] read-only:bg-gray-50"
                    />
                  </td>
                  <td className="py-2 pl-4">
                    <input
                      type="text"
                      value={line.narration || ''}
                      onChange={e => updateLine(idx, 'narration', e.target.value)}
                      placeholder="Description..."
                      readOnly={!canEdit}
                      className="w-full px-2 py-1.5 border border-[#EBEBEB] rounded text-sm focus:outline-none focus:border-[#B8F53A] read-only:bg-gray-50"
                    />
                  </td>
                  {canEdit && (
                    <td className="py-2">
                      <button onClick={() => removeLine(idx)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#EBEBEB] bg-gray-50">
                <td colSpan="2" className="py-3 px-2 text-sm font-semibold text-gray-700 text-right">Totals:</td>
                <td className="py-3 px-2 text-right font-mono font-bold text-gray-800">{formatCurrency(totalDebit)}</td>
                <td className="py-3 px-2 text-right font-mono font-bold text-gray-800">{formatCurrency(totalCredit)}</td>
                <td className="py-3 px-4">
                  {isBalanced ? (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">✓ Balanced</span>
                  ) : (
                    <span className="text-xs text-red-600 font-medium">Difference: {formatCurrency(difference)}</span>
                  )}
                </td>
                {canEdit && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Vouchers() {
  const navigate = useNavigate();
  const { formatCurrency, formatDate } = useApp();
  const { canEdit } = useAuth();

  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', search: '', from: '', to: '' });
  const [viewVoucher, setViewVoucher] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { loadVouchers(); }, [filters]);

  const loadVouchers = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getVouchers(filters);
      setVouchers(data);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await window.electronAPI.deleteVoucher(id);
      toast.success('Voucher deleted');
      setDeleteConfirm(null);
      loadVouchers();
    } catch {
      toast.error('Failed to delete voucher');
    }
  };

  const typeColors = {
    journal: 'bg-green-100 text-green-800',
    payment: 'bg-red-100 text-red-800',
    receipt: 'bg-green-100 text-green-800',
    contra: 'bg-purple-100 text-purple-800',
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Vouchers</h2>
          <p className="text-sm text-gray-500">{vouchers.length} vouchers</p>
        </div>
        {canEdit && (
          <button
            onClick={() => navigate('/vouchers/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95"
          >
            <Plus size={16} /> New Voucher
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm p-4 mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search voucher # or narration..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="w-full pl-9 pr-4 py-2 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]"
          />
        </div>
        <select
          value={filters.type}
          onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
          className="px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]"
        >
          <option value="">All Types</option>
          {VOUCHER_TYPES.map(vt => <option key={vt.value} value={vt.value}>{vt.label}</option>)}
        </select>
        <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} className="px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm" />
        <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} className="px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm" />
      </div>

      <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div></div>
        ) : vouchers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FileText size={40} className="mx-auto mb-3 opacity-20" />
            <p>No vouchers found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-[#EBEBEB]">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Voucher #</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Type</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Date</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Narration</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Debit</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Credit</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map(v => (
                <tr key={v.id} className="border-b border-[#EBEBEB] hover:bg-[#F8FFE8]">
                  <td className="py-3 px-4 font-mono text-sm font-semibold text-green-600">{v.voucher_number}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${typeColors[v.voucher_type] || 'bg-gray-100 text-gray-600'}`}>
                      {v.voucher_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{formatDate(v.date)}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">{v.narration || '-'}</td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-gray-700">{formatCurrency(v.total_debit)}</td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-gray-700">{formatCurrency(v.total_credit)}</td>
                  <td className="py-3 px-4">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => setViewVoucher(v)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg"><Eye size={14} /></button>
                      {canEdit && (
                        <>
                          <button onClick={() => navigate(`/vouchers/edit/${v.id}`)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><Edit size={14} /></button>
                          <button onClick={() => setDeleteConfirm(v)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
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

      {/* View Voucher Modal */}
      <Modal isOpen={!!viewVoucher} onClose={() => setViewVoucher(null)} title={`Voucher: ${viewVoucher?.voucher_number}`} size="lg">
        {viewVoucher && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-gray-500">Type:</span> <span className="font-medium capitalize">{viewVoucher.voucher_type}</span></div>
              <div><span className="text-gray-500">Date:</span> <span className="font-medium">{formatDate(viewVoucher.date)}</span></div>
              <div><span className="text-gray-500">Reference:</span> <span className="font-medium">{viewVoucher.reference || '-'}</span></div>
            </div>
            {viewVoucher.narration && <div className="text-sm bg-gray-50 rounded p-3"><span className="text-gray-500">Narration:</span> {viewVoucher.narration}</div>}
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#FAFAFA] text-[#AAAAAA]">
                  <th className="text-left py-2 px-3 text-xs">Account</th>
                  <th className="text-left py-2 px-3 text-xs">Narration</th>
                  <th className="text-right py-2 px-3 text-xs">Debit</th>
                  <th className="text-right py-2 px-3 text-xs">Credit</th>
                </tr>
              </thead>
              <tbody>
                {viewVoucher.items?.map((item, i) => (
                  <tr key={i} className="border-b border-[#EBEBEB]">
                    <td className="py-2 px-3 font-medium">{item.account_name}</td>
                    <td className="py-2 px-3 text-gray-500">{item.narration || '-'}</td>
                    <td className="py-2 px-3 text-right font-mono">{item.debit > 0 ? formatCurrency(item.debit) : '-'}</td>
                    <td className="py-2 px-3 text-right font-mono">{item.credit > 0 ? formatCurrency(item.credit) : '-'}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold border-t-2 border-[#EBEBEB]">
                  <td colSpan="2" className="py-2 px-3 text-right">Total:</td>
                  <td className="py-2 px-3 text-right font-mono">{formatCurrency(viewVoucher.total_debit)}</td>
                  <td className="py-2 px-3 text-right font-mono">{formatCurrency(viewVoucher.total_credit)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Voucher" size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm border border-[#EBEBEB] rounded-lg">Cancel</button>
            <button onClick={() => handleDelete(deleteConfirm.id)} className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-full">Delete</button>
          </div>
        }
      >
        <div className="text-center py-4">
          <AlertCircle size={40} className="mx-auto text-red-500 mb-3" />
          <p className="text-gray-700">Delete voucher <strong>{deleteConfirm?.voucher_number}</strong>?</p>
          <p className="text-gray-500 text-sm mt-1">This will reverse all journal entries.</p>
        </div>
      </Modal>
    </div>
  );
}

export { VoucherForm };
