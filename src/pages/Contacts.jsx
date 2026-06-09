import { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, Search, Phone, Mail, MapPin, X, Save, Users, ShoppingBag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';

// ─── Customer / Supplier Form ─────────────────────────────────────────────────
function ContactForm({ record, type, onSave, onClose }) {
  const isCustomer = type === 'customer';
  const [form, setForm] = useState({
    name:             record?.name             || '',
    phone:            record?.phone            || '',
    email:            record?.email            || '',
    address:          record?.address          || '',
    ntn:              record?.ntn              || '',
    strn:             record?.strn             || '',
    credit_limit:     record?.credit_limit     || 0,
    opening_balance:  record?.opening_balance  || 0,
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const field = (label, key, opts = {}) => (
    <div>
      <label className="block text-[11px] font-semibold text-[#AAAAAA] uppercase tracking-wider mb-1.5">
        {label}{opts.required && <span className="text-[#FF4444] ml-0.5">*</span>}
      </label>
      <input
        type={opts.type || 'text'}
        value={form[key]}
        onChange={e => set(key, e.target.value)}
        placeholder={opts.placeholder || ''}
        className="w-full bg-[#F5F5F0] border border-transparent rounded-xl px-3 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#B8F53A] focus:bg-white focus:shadow-[0_0_0_3px_rgba(184,245,58,0.15)] transition-all"
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {field('Name', 'name', { required: true, placeholder: isCustomer ? 'Customer name' : 'Supplier name' })}
        {field('Phone', 'phone', { placeholder: '+92 300 0000000' })}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {field('Email', 'email', { type: 'email', placeholder: 'email@example.com' })}
        {field('Address', 'address', { placeholder: 'City, Province' })}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {field('NTN', 'ntn', { placeholder: '0000000-0' })}
        {field('STRN', 'strn', { placeholder: 'Sales Tax Reg. No.' })}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {isCustomer && field('Credit Limit (Rs.)', 'credit_limit', { type: 'number', placeholder: '0' })}
        {!record && field('Opening Balance (Rs.)', 'opening_balance', { type: 'number', placeholder: '0' })}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={onClose}
          className="px-5 py-2.5 border border-[#EBEBEB] text-[#6B6B6B] text-sm font-medium rounded-full hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#B8F53A] hover:bg-[#A8E52A] disabled:opacity-50 text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95 transition-all"
        >
          <Save size={14} /> {saving ? 'Saving...' : record ? 'Update' : `Add ${isCustomer ? 'Customer' : 'Supplier'}`}
        </button>
      </div>
    </div>
  );
}

// ─── Contacts Table ───────────────────────────────────────────────────────────
function ContactsTable({ type }) {
  const isCustomer = type === 'customer';
  const { formatCurrency, loadCustomers, loadSuppliers } = useApp();
  const { canEdit } = useAuth();

  const [records, setRecords]       = useState([]);
  const [search,  setSearch]        = useState('');
  const [modal,   setModal]         = useState(null); // null | 'add' | record
  const [delId,   setDelId]         = useState(null);
  const [loading, setLoading]       = useState(true);

  const api = isCustomer
    ? { getAll: 'getCustomers', create: 'createCustomer', update: 'updateCustomer', del: 'deleteCustomer' }
    : { getAll: 'getSuppliers', create: 'createSupplier', update: 'updateSupplier', del: 'deleteSupplier' };

  useEffect(() => { load(); }, [type]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI[api.getAll]();
      setRecords(data);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    load();
    if (isCustomer) loadCustomers(); else loadSuppliers();
  };

  const handleSave = async (form) => {
    try {
      if (modal === 'add') {
        const res = await window.electronAPI[api.create](form);
        if (!res.success) throw new Error(res.message || 'Failed');
        toast.success(`${isCustomer ? 'Customer' : 'Supplier'} added`);
      } else {
        const res = await window.electronAPI[api.update](modal.id, form);
        if (!res.success) throw new Error(res.message || 'Failed');
        toast.success('Updated');
      }
      setModal(null);
      refresh();
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const handleDelete = async () => {
    const res = await window.electronAPI[api.del](delId);
    if (!res.success) { toast.error(res.message || 'Cannot delete'); }
    else { toast.success('Deleted'); refresh(); }
    setDelId(null);
  };

  const filtered = records.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.code && r.code.toLowerCase().includes(search.toLowerCase())) ||
    (r.phone && r.phone.includes(search))
  );

  const label = isCustomer ? 'Customer' : 'Supplier';

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AAAAAA]" />
          <input
            type="text"
            placeholder={`Search ${label.toLowerCase()}s...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#F5F5F0] border border-transparent rounded-full text-sm focus:outline-none focus:border-[#B8F53A] focus:bg-white transition-all"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[13px] text-[#AAAAAA]">{filtered.length} {label.toLowerCase()}{filtered.length !== 1 ? 's' : ''}</span>
          {canEdit && (
            <button
              onClick={() => setModal('add')}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95 transition-all"
            >
              <Plus size={14} /> Add {label}
            </button>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl p-4 shadow-sm" style={{ background: isCustomer ? 'linear-gradient(135deg,#DDD0FF,#F3F0FF)' : 'linear-gradient(135deg,#FFE8A0,#FFFAE0)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-black/50 mb-1">Total {label}s</p>
          <p className="text-2xl font-bold font-mono text-[#1A1A1A]">{records.length}</p>
        </div>
        <div className="rounded-2xl p-4 shadow-sm" style={{ background: 'linear-gradient(135deg,#FFD6C0,#FFF3EC)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-black/50 mb-1">Total Outstanding</p>
          <p className="text-2xl font-bold font-mono text-[#1A1A1A]">
            {formatCurrency(records.reduce((s, r) => s + (r.current_balance || 0), 0))}
          </p>
        </div>
        <div className="rounded-2xl p-4 shadow-sm" style={{ background: 'linear-gradient(135deg,#B0F0D8,#E0FFF2)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-black/50 mb-1">With Balance</p>
          <p className="text-2xl font-bold font-mono text-[#1A1A1A]">
            {records.filter(r => (r.current_balance || 0) > 0).length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="grid px-5 py-3 bg-[#FAFAFA] text-[11px] font-semibold text-[#AAAAAA] uppercase tracking-wider"
          style={{ gridTemplateColumns: canEdit ? '80px 1fr 140px 160px 100px 100px 90px' : '80px 1fr 140px 160px 100px 100px' }}>
          <span>Code</span>
          <span>Name</span>
          <span>Phone</span>
          <span>Email / NTN</span>
          {isCustomer && <span className="text-right">Credit Limit</span>}
          {!isCustomer && <span className="text-right">Opening Bal.</span>}
          <span className="text-right">Outstanding</span>
          {canEdit && <span className="text-center">Actions</span>}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[#AAAAAA]">
            {isCustomer ? <Users size={40} className="mx-auto mb-3 opacity-20" /> : <ShoppingBag size={40} className="mx-auto mb-3 opacity-20" />}
            <p className="text-sm">{search ? `No ${label.toLowerCase()}s found` : `No ${label.toLowerCase()}s yet`}</p>
            {!search && canEdit && (
              <button onClick={() => setModal('add')} className="mt-2 text-sm text-[#B8F53A] hover:underline font-medium">
                Add your first {label.toLowerCase()}
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#F5F5F0]">
            {filtered.map(r => (
              <div
                key={r.id}
                className="grid px-5 py-3.5 items-center hover:bg-[#F8FFE8] transition-colors"
                style={{ gridTemplateColumns: canEdit ? '80px 1fr 140px 160px 100px 100px 90px' : '80px 1fr 140px 160px 100px 100px' }}
              >
                <span className="font-mono text-xs text-[#AAAAAA]">{r.code}</span>
                <div>
                  <p className="text-[13px] font-semibold text-[#1A1A1A]">{r.name}</p>
                  {r.address && <p className="text-[11px] text-[#AAAAAA] flex items-center gap-1 mt-0.5"><MapPin size={10} />{r.address}</p>}
                </div>
                <div>
                  {r.phone ? (
                    <p className="text-[13px] text-[#6B6B6B] flex items-center gap-1"><Phone size={11} />{r.phone}</p>
                  ) : <span className="text-[#AAAAAA] text-xs">—</span>}
                </div>
                <div>
                  {r.email && <p className="text-[12px] text-[#6B6B6B] flex items-center gap-1 truncate"><Mail size={10} />{r.email}</p>}
                  {r.ntn && <p className="text-[11px] text-[#AAAAAA] mt-0.5">NTN: {r.ntn}</p>}
                  {!r.email && !r.ntn && <span className="text-[#AAAAAA] text-xs">—</span>}
                </div>
                <span className="font-mono text-[13px] text-[#6B6B6B] text-right">
                  {isCustomer ? formatCurrency(r.credit_limit || 0) : formatCurrency(r.opening_balance || 0)}
                </span>
                <span className={`font-mono text-[13px] font-semibold text-right ${(r.current_balance || 0) > 0 ? 'text-[#FF4444]' : 'text-[#00B37A]'}`}>
                  {formatCurrency(r.current_balance || 0)}
                </span>
                {canEdit && (
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => setModal(r)}
                      className="w-7 h-7 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[#6B6B6B] hover:bg-[#EBEBEB] hover:text-[#1A1A1A] transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={() => setDelId(r.id)}
                      className="w-7 h-7 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[#6B6B6B] hover:bg-red-50 hover:text-[#FF4444] transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'add' ? `Add ${label}` : `Edit ${label}`}
        size="md"
      >
        {modal && (
          <ContactForm
            record={modal === 'add' ? null : modal}
            type={type}
            onSave={handleSave}
            onClose={() => setModal(null)}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!delId} onClose={() => setDelId(null)} title={`Delete ${label}?`} size="sm">
        <p className="text-[13px] text-[#6B6B6B] mb-5">
          This will remove the {label.toLowerCase()} from the system. This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDelId(null)} className="px-5 py-2.5 border border-[#EBEBEB] text-[#6B6B6B] text-sm font-medium rounded-full hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-all">
            Cancel
          </button>
          <button onClick={handleDelete} className="px-5 py-2.5 bg-[#FF4444] hover:bg-[#E03030] text-white text-sm font-semibold rounded-full active:scale-95 transition-all">
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Contacts() {
  const [tab, setTab] = useState('customers');

  return (
    <div className="p-7 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#1A1A1A]">Contacts</h1>
          <p className="text-[13px] text-[#AAAAAA] mt-0.5">Manage customers and suppliers</p>
        </div>
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-[#EBEBEB] rounded-full p-1">
          <button
            onClick={() => setTab('customers')}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-medium transition-all ${
              tab === 'customers' ? 'bg-[#1A1A1A] text-white shadow-sm' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
            }`}
          >
            <Users size={14} /> Customers
          </button>
          <button
            onClick={() => setTab('suppliers')}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-medium transition-all ${
              tab === 'suppliers' ? 'bg-[#1A1A1A] text-white shadow-sm' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
            }`}
          >
            <ShoppingBag size={14} /> Suppliers
          </button>
        </div>
      </div>

      <ContactsTable key={tab} type={tab === 'customers' ? 'customer' : 'supplier'} />
    </div>
  );
}
