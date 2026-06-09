import { useState, useEffect } from 'react';
import {
  BookOpen, ChevronDown, ChevronRight, Edit, Eye, Plus, Save, Search, Trash2, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import { formatDate } from '../utils/accounting';

const TYPE_COLORS = {
  asset: 'text-green-700 bg-green-50 border-green-200',
  liability: 'text-red-700 bg-red-50 border-red-200',
  equity: 'text-purple-700 bg-purple-50 border-purple-200',
  income: 'text-green-700 bg-green-50 border-green-200',
  expense: 'text-orange-700 bg-orange-50 border-orange-200',
};

const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'income', 'expense'];
const SUB_TYPES = {
  asset: ['group', 'cash', 'bank', 'receivable', 'inventory', 'current_asset', 'fixed_asset', 'contra_asset'],
  liability: ['group', 'payable', 'tax', 'current_liability', 'loan'],
  equity: ['group', 'capital', 'retained', 'drawings'],
  income: ['group', 'revenue', 'other_income'],
  expense: ['group', 'cogs', 'operating'],
};

function AccountFormModal({ account, accounts, isOpen, onClose, onSave }) {
  const [form, setForm] = useState({ code: '', name: '', type: 'asset', sub_type: 'current_asset', parent_id: '', is_bank: false, is_cash: false, opening_balance: 0, description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (account) {
      setForm({
        code: account.code || '',
        name: account.name || '',
        type: account.type || 'asset',
        sub_type: account.sub_type || 'current_asset',
        parent_id: account.parent_id || '',
        is_bank: account.is_bank === 1,
        is_cash: account.is_cash === 1,
        opening_balance: account.opening_balance || 0,
        description: account.description || '',
      });
    } else {
      setForm({ code: '', name: '', type: 'asset', sub_type: 'current_asset', parent_id: '', is_bank: false, is_cash: false, opening_balance: 0, description: '' });
    }
  }, [account, isOpen]);

  const handleSave = async () => {
    if (!form.code.trim()) { toast.error('Account code is required'); return; }
    if (!form.name.trim()) { toast.error('Account name is required'); return; }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const parentAccounts = accounts.filter(a => a.sub_type === 'group' && a.id !== account?.id);
  const subTypes = SUB_TYPES[form.type] || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={account ? 'Edit Account' : 'Add New Account'}
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-[#EBEBEB] rounded-lg hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95 disabled:opacity-50"
          >
            {saving ? 'Saving...' : account ? 'Update Account' : 'Create Account'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Account Code *</label>
            <input
              type="text"
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
              readOnly={!!account}
              placeholder="e.g. 1001"
              className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A] read-only:bg-gray-50 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Account Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Account name"
              className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Account Type *</label>
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value, sub_type: SUB_TYPES[e.target.value]?.[1] || '' }))}
              className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A] capitalize"
            >
              {ACCOUNT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Sub Type</label>
            <select
              value={form.sub_type}
              onChange={e => setForm(f => ({ ...f, sub_type: e.target.value }))}
              className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]"
            >
              {subTypes.map(st => <option key={st} value={st}>{st.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Parent Account</label>
            <select
              value={form.parent_id}
              onChange={e => setForm(f => ({ ...f, parent_id: e.target.value ? parseInt(e.target.value) : '' }))}
              className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]"
            >
              <option value="">None (Top Level)</option>
              {parentAccounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Opening Balance</label>
            <input
              type="number"
              value={form.opening_balance}
              onChange={e => setForm(f => ({ ...f, opening_balance: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A] text-right font-mono"
            />
          </div>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={form.is_bank} onChange={e => setForm(f => ({ ...f, is_bank: e.target.checked, is_cash: false }))} className="rounded" />
            Is Bank Account
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={form.is_cash} onChange={e => setForm(f => ({ ...f, is_cash: e.target.checked, is_bank: false }))} className="rounded" />
            Is Cash Account
          </label>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A] resize-none"
          />
        </div>
      </div>
    </Modal>
  );
}

function LedgerModal({ accountId, isOpen, onClose }) {
  const { formatCurrency } = useApp();
  const [ledger, setLedger] = useState(null);
  const [filters, setFilters] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && accountId) loadLedger();
  }, [isOpen, accountId, filters]);

  const loadLedger = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getAccountLedger(accountId, filters.from || null, filters.to || null);
      setLedger(data);
    } finally {
      setLoading(false);
    }
  };

  if (!ledger) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Account Ledger: ${ledger.account?.name || ''}`}
      size="xl"
    >
      <div className="space-y-4">
        <div className="flex gap-3">
          <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} className="px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]" />
          <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} className="px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]" />
          <button onClick={() => setFilters({ from: '', to: '' })} className="px-3 py-2 text-sm border border-[#EBEBEB] rounded-lg hover:bg-gray-50 text-gray-500">Clear</button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#FAFAFA] text-[#AAAAAA]">
                  <th className="text-left py-2 px-3 text-xs">Date</th>
                  <th className="text-left py-2 px-3 text-xs">Voucher #</th>
                  <th className="text-left py-2 px-3 text-xs">Type</th>
                  <th className="text-left py-2 px-3 text-xs">Narration</th>
                  <th className="text-right py-2 px-3 text-xs">Debit</th>
                  <th className="text-right py-2 px-3 text-xs">Credit</th>
                  <th className="text-right py-2 px-3 text-xs">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledger.ledger.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-8 text-gray-400">No transactions found</td></tr>
                ) : (
                  ledger.ledger.map((row, i) => (
                    <tr key={i} className="border-b border-[#EBEBEB] hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-600">{formatDate(row.date)}</td>
                      <td className="py-2 px-3 font-mono text-green-600">{row.voucher_number}</td>
                      <td className="py-2 px-3 capitalize text-gray-500">{row.voucher_type}</td>
                      <td className="py-2 px-3 text-gray-600">{row.narration || row.voucher_narration || '-'}</td>
                      <td className="py-2 px-3 text-right font-mono text-green-700">{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                      <td className="py-2 px-3 text-right font-mono text-red-600">{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">{formatCurrency(row.balance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function ChartOfAccounts() {
  const { accounts, loadAccounts, formatCurrency } = useApp();
  const { canEdit } = useAuth();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [editAccount, setEditAccount] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [ledgerAccountId, setLedgerAccountId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const filtered = accounts.filter(a => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.code.includes(search);
    const matchType = !filterType || a.type === filterType;
    return matchSearch && matchType;
  });

  const topLevel = filtered.filter(a => !a.parent_id || !filtered.find(p => p.id === a.parent_id));

  const getChildren = (parentId) => filtered.filter(a => a.parent_id === parentId);

  const toggleGroup = (id) => setExpandedGroups(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const handleSave = async (form) => {
    try {
      if (editAccount) {
        await window.electronAPI.updateAccount(editAccount.id, form);
        toast.success('Account updated');
      } else {
        await window.electronAPI.createAccount(form);
        toast.success('Account created');
      }
      setShowAddModal(false);
      setEditAccount(null);
      loadAccounts();
    } catch (err) {
      toast.error('Failed to save account: ' + err.message);
    }
  };

  const handleDelete = async (account) => {
    const result = await window.electronAPI.deleteAccount(account.id);
    if (result.success) {
      toast.success('Account deleted');
      loadAccounts();
    } else {
      toast.error(result.message || 'Cannot delete account');
    }
    setDeleteConfirm(null);
  };

  const renderRow = (account, depth = 0) => {
    const children = getChildren(account.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedGroups.has(account.id);
    const isGroup = account.sub_type === 'group';

    return (
      <div key={account.id}>
        <div className={`flex items-center py-2.5 px-4 hover:bg-gray-50 border-b border-[#EBEBEB] group ${depth > 0 ? 'bg-white' : ''}`}>
          <div className="flex items-center flex-1" style={{ paddingLeft: `${depth * 20}px` }}>
            {hasChildren ? (
              <button onClick={() => toggleGroup(account.id)} className="mr-1.5 text-gray-400 hover:text-gray-600">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span className="w-5 mr-1.5"></span>
            )}
            <span className="font-mono text-xs text-gray-400 w-14 shrink-0">{account.code}</span>
            <span className={`text-sm ${isGroup ? 'font-semibold text-gray-800' : 'text-gray-700'} flex-1`}>
              {account.name}
              {account.is_system === 1 && <span className="ml-2 text-xs text-gray-300">(system)</span>}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_COLORS[account.type] || ''}`}>
              {account.type}
            </span>
            <span className="font-mono text-sm w-28 text-right text-gray-700">
              {!isGroup ? formatCurrency(account.balance || 0) : ''}
            </span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isGroup && (
                <button onClick={() => setLedgerAccountId(account.id)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg">
                  <Eye size={13} />
                </button>
              )}
              {canEdit && (
                <>
                  <button onClick={() => { setEditAccount(account); setShowAddModal(true); }} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg">
                    <Edit size={13} />
                  </button>
                  {!account.is_system && (
                    <button onClick={() => setDeleteConfirm(account)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 size={13} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && children.map(child => renderRow(child, depth + 1))}
      </div>
    );
  };

  const totalAssets = accounts.filter(a => a.type === 'asset' && !a.parent_id).reduce((s, a) => s + (a.balance || 0), 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Chart of Accounts</h2>
          <p className="text-sm text-gray-500 mt-0.5">{accounts.length} accounts</p>
        </div>
        {canEdit && (
          <button
            onClick={() => { setEditAccount(null); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95"
          >
            <Plus size={16} /> Add Account
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm p-4 mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by code or name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]"
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A] capitalize"
        >
          <option value="">All Types</option>
          {ACCOUNT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
        </select>
        <button
          onClick={() => setExpandedGroups(new Set(accounts.filter(a => a.sub_type === 'group').map(a => a.id)))}
          className="px-3 py-2 text-sm border border-[#EBEBEB] rounded-lg hover:bg-gray-50 text-gray-500"
        >
          Expand All
        </button>
        <button
          onClick={() => setExpandedGroups(new Set())}
          className="px-3 py-2 text-sm border border-[#EBEBEB] rounded-lg hover:bg-gray-50 text-gray-500"
        >
          Collapse All
        </button>
      </div>

      {/* Accounts tree */}
      <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="flex items-center py-2.5 px-4 bg-gray-50 border-b border-[#EBEBEB]">
          <div className="flex items-center flex-1">
            <span className="w-5 mr-1.5"></span>
            <span className="font-mono text-xs font-semibold text-gray-500 w-14 shrink-0">Code</span>
            <span className="text-xs font-semibold text-gray-500 flex-1">Account Name</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-gray-500 w-20 text-center">Type</span>
            <span className="text-xs font-semibold text-gray-500 w-28 text-right">Balance</span>
            <span className="w-24"></span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <BookOpen size={40} className="mx-auto mb-3 opacity-20" />
            <p>No accounts found</p>
          </div>
        ) : (
          topLevel.map(acc => renderRow(acc, 0))
        )}
      </div>

      {/* Account Form Modal */}
      <AccountFormModal
        account={showAddModal ? editAccount : null}
        accounts={accounts}
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditAccount(null); }}
        onSave={handleSave}
      />

      {/* Ledger Modal */}
      <LedgerModal
        accountId={ledgerAccountId}
        isOpen={!!ledgerAccountId}
        onClose={() => setLedgerAccountId(null)}
      />

      {/* Delete Confirm */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Account"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm border border-[#EBEBEB] rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={() => handleDelete(deleteConfirm)} className="px-5 py-2 bg-[#FF4444] hover:bg-[#E03030] text-white text-sm font-semibold rounded-full active:scale-95">Delete</button>
          </div>
        }
      >
        <div className="text-center py-4">
          <p className="text-gray-700">Delete account <strong>{deleteConfirm?.name}</strong>?</p>
          <p className="text-gray-500 text-sm mt-1">This cannot be undone.</p>
        </div>
      </Modal>
    </div>
  );
}
