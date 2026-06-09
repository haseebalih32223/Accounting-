import { useState, useEffect } from 'react';
import {
  Download, Edit, Eye, EyeOff, Plus, Save, Search, Shield, Trash2, Upload, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';

export default function Settings() {
  const { settings, loadSettings } = useApp();
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('company');
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ ...settings });
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await window.electronAPI.updateSettings(form);
      toast.success('Settings saved');
      loadSettings();
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const TABS = [
    { id: 'company', label: 'Company Info' },
    { id: 'tax', label: 'Tax Settings' },
    { id: 'invoice', label: 'Invoice Settings' },
    { id: 'users', label: 'User Management', adminOnly: true },
    { id: 'backup', label: 'Backup & Restore' },
  ];

  return (
    <div className="p-6 flex gap-4">
      {/* Tabs sidebar */}
      <div className="w-48 shrink-0">
        <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm overflow-hidden">
          {TABS.filter(t => !t.adminOnly || isAdmin).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-3 text-sm border-b border-[#EBEBEB] last:border-0 transition-colors ${activeTab === tab.id ? 'bg-[#1A1A1A] text-white font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white rounded-2xl border border-[#EBEBEB] shadow-sm p-6">
        {activeTab === 'company' && (
          <CompanyTab form={form} setForm={setForm} saving={saving} onSave={handleSave} />
        )}
        {activeTab === 'tax' && (
          <TaxTab form={form} setForm={setForm} saving={saving} onSave={handleSave} />
        )}
        {activeTab === 'invoice' && (
          <InvoiceTab form={form} setForm={setForm} saving={saving} onSave={handleSave} />
        )}
        {activeTab === 'users' && isAdmin && (
          <UsersTab />
        )}
        {activeTab === 'backup' && (
          <BackupTab />
        )}
      </div>
    </div>
  );
}

function CompanyTab({ form, setForm, saving, onSave }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-gray-800">Company Information</h3>
        <button onClick={onSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95 disabled:opacity-50">
          <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-5">
        {[
          ['Company Name', 'company_name', 'text', 'My Manufacturing Co.'],
          ['Company Phone', 'company_phone', 'text', '03XX-XXXXXXX'],
          ['Company Email', 'company_email', 'email', 'info@company.com'],
          ['NTN (National Tax No.)', 'company_ntn', 'text', '1234567-8'],
          ['STRN (Sales Tax Reg. No.)', 'company_strn', 'text', 'SRB-12345'],
          ['Bank Name', 'bank_name', 'text', 'Bank Name'],
          ['Bank Account #', 'bank_account', 'text', 'Account Number'],
          ['Fiscal Year Start Month', 'fiscal_year_start', 'number', '7 (July)'],
        ].map(([label, key, type, placeholder]) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
            <input type={type} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]" />
          </div>
        ))}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Company Address</label>
          <textarea value={form.company_address || ''} onChange={e => setForm(f => ({ ...f, company_address: e.target.value }))} rows={2} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A] resize-none" />
        </div>
      </div>
    </div>
  );
}

function TaxTab({ form, setForm, saving, onSave }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-gray-800">Tax Settings</h3>
        <button onClick={onSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95 disabled:opacity-50">
          <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Default GST Rate (%)</label>
          <input type="number" value={form.default_tax_rate || ''} onChange={e => setForm(f => ({ ...f, default_tax_rate: e.target.value }))} min="0" max="100" step="0.1" className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm font-mono focus:outline-none focus:border-[#B8F53A]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Withholding Tax Rate (%)</label>
          <input type="number" value={form.withholding_tax_rate || ''} onChange={e => setForm(f => ({ ...f, withholding_tax_rate: e.target.value }))} min="0" max="100" step="0.1" className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm font-mono focus:outline-none focus:border-[#B8F53A]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Currency Symbol</label>
          <input type="text" value={form.currency || ''} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} placeholder="Rs." className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Tax Enabled</label>
          <select value={form.tax_enabled || '1'} onChange={e => setForm(f => ({ ...f, tax_enabled: e.target.value }))} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]">
            <option value="1">Yes — GST Applicable</option>
            <option value="0">No — Tax Exempt</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function InvoiceTab({ form, setForm, saving, onSave }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-gray-800">Invoice & Voucher Settings</h3>
        <button onClick={onSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95 disabled:opacity-50">
          <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-5">
        {[
          ['Sales Invoice Prefix', 'invoice_prefix', 'SI'],
          ['Purchase Invoice Prefix', 'purchase_prefix', 'PI'],
          ['Expense Prefix', 'expense_prefix', 'EXP'],
          ['Journal Voucher Prefix', 'voucher_prefix_journal', 'JV'],
          ['Payment Voucher Prefix', 'voucher_prefix_payment', 'PV'],
          ['Receipt Voucher Prefix', 'voucher_prefix_receipt', 'RV'],
          ['Contra Voucher Prefix', 'voucher_prefix_contra', 'CV'],
          ['Default Payment Terms (Days)', 'payment_terms', '30'],
        ].map(([label, key, placeholder]) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
            <input type="text" value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]" />
          </div>
        ))}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Invoice Footer Text</label>
          <textarea value={form.invoice_footer || ''} onChange={e => setForm(f => ({ ...f, invoice_footer: e.target.value }))} rows={2} placeholder="Thank you for your business!" className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A] resize-none" />
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [changePwUser, setChangePwUser] = useState(null);
  const [newPw, setNewPw] = useState('');
  const [showPw, setShowPw] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    const data = await window.electronAPI.getUsers();
    setUsers(data);
  };

  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'accountant', is_active: 1 });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name || !form.username) { toast.error('Name and username required'); return; }
    if (!editUser && !form.password) { toast.error('Password required'); return; }
    setSaving(true);
    try {
      if (editUser) {
        await window.electronAPI.updateUser(editUser.id, form);
        toast.success('User updated');
      } else {
        await window.electronAPI.createUser(form);
        toast.success('User created');
      }
      setShowModal(false);
      setEditUser(null);
      loadUsers();
    } catch (err) {
      toast.error('Failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePw = async () => {
    if (!newPw || newPw.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    await window.electronAPI.changePassword(changePwUser.id, newPw);
    toast.success('Password changed');
    setChangePwUser(null);
    setNewPw('');
  };

  const roleColors = { admin: 'bg-green-100 text-green-800', accountant: 'bg-green-100 text-green-800', viewer: 'bg-gray-100 text-gray-600' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-gray-800">User Management</h3>
        <button onClick={() => { setEditUser(null); setForm({ name: '', username: '', password: '', role: 'accountant', is_active: 1 }); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95">
          <Plus size={15} /> Add User
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-[#EBEBEB]">
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Name</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Username</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Role</th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500">Status</th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className="border-b border-[#EBEBEB] hover:bg-[#F8FFE8]">
              <td className="py-3 px-4 font-medium text-gray-800">{u.name}</td>
              <td className="py-3 px-4 font-mono text-gray-600">{u.username}</td>
              <td className="py-3 px-4"><span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${roleColors[u.role] || ''}`}>{u.role}</span></td>
              <td className="py-3 px-4 text-center"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
              <td className="py-3 px-4">
                <div className="flex justify-center gap-1">
                  <button onClick={() => { setEditUser(u); setForm({ name: u.name, username: u.username, password: '', role: u.role, is_active: u.is_active }); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><Edit size={14} /></button>
                  <button onClick={() => setChangePwUser(u)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg" title="Change Password"><Shield size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add/Edit User Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditUser(null); }} title={editUser ? 'Edit User' : 'Add User'} size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-[#EBEBEB] rounded-lg">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95 disabled:opacity-50">{saving ? '...' : editUser ? 'Update' : 'Create User'}</button>
          </div>
        }
      >
        <div className="space-y-4">
          <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Full Name *</label><input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Username *</label><input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm font-mono" /></div>
          {!editUser && <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Password *</label><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm" /></div>}
          <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Role</label><select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm"><option value="admin">Admin</option><option value="accountant">Accountant</option><option value="viewer">Viewer (Read-Only)</option></select></div>
          {editUser && <div><label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.is_active === 1} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked ? 1 : 0 }))} /> Active</label></div>}
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal isOpen={!!changePwUser} onClose={() => { setChangePwUser(null); setNewPw(''); }} title="Change Password" size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setChangePwUser(null)} className="px-4 py-2 text-sm border border-[#EBEBEB] rounded-lg">Cancel</button>
            <button onClick={handleChangePw} className="px-5 py-2 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95">Change Password</button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Change password for <strong>{changePwUser?.name}</strong></p>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password (min 6 chars)" className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm pr-10" />
            <button onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function BackupTab() {
  const [backing, setBacking] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handleBackup = async () => {
    setBacking(true);
    try {
      const result = await window.electronAPI.exportBackup();
      if (result.success) toast.success(`Backup saved to: ${result.path}`);
      else toast.error(result.message || 'Backup cancelled');
    } catch (err) {
      toast.error('Backup failed: ' + err.message);
    } finally {
      setBacking(false);
    }
  };

  const handleRestore = async () => {
    if (!confirm('Restoring will replace all current data. Are you sure?')) return;
    setRestoring(true);
    try {
      const filePath = await window.electronAPI.selectFile();
      if (!filePath) { setRestoring(false); return; }
      await window.electronAPI.importBackup(filePath);
      toast.success('Backup restored. Please restart the application.');
    } catch (err) {
      toast.error('Restore failed: ' + err.message);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div>
      <h3 className="font-semibold text-gray-800 mb-6">Backup & Restore</h3>
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-xl p-6 border border-[#EBEBEB]">
          <h4 className="font-medium text-gray-800 mb-2">Export Backup</h4>
          <p className="text-sm text-gray-500 mb-4">Save a complete copy of your database to a file. Store this file in a safe location.</p>
          <button onClick={handleBackup} disabled={backing} className="flex items-center gap-2 px-5 py-2.5 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95 disabled:opacity-50">
            <Download size={16} /> {backing ? 'Exporting...' : 'Export Backup (.db)'}
          </button>
        </div>
        <div className="bg-amber-50 rounded-xl p-6 border border-amber-100">
          <h4 className="font-medium text-gray-800 mb-2">Restore from Backup</h4>
          <p className="text-sm text-gray-500 mb-4">⚠️ Warning: This will replace ALL current data with the backup file. This cannot be undone.</p>
          <button onClick={handleRestore} disabled={restoring} className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-full disabled:opacity-50">
            <Upload size={16} /> {restoring ? 'Restoring...' : 'Restore from Backup'}
          </button>
        </div>
      </div>
    </div>
  );
}
