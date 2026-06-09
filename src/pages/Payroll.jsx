import { useState, useEffect } from 'react';
import {
 AlertCircle, CheckCircle, Edit, Plus, Save, Search, Trash2, Users, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';

function EmployeeModal({ employee, isOpen, onClose, onSave }) {
 const { getToday } = useApp();
 const [form, setForm] = useState({ name: '', designation: '', department: '', cnic: '', phone: '', join_date: '', basic_salary: 0, allowances: 0 });
 const [saving, setSaving] = useState(false);

 useEffect(() => {
 if (employee) {
 setForm({ name: employee.name, designation: employee.designation || '', department: employee.department || '', cnic: employee.cnic || '', phone: employee.phone || '', join_date: employee.join_date || '', basic_salary: employee.basic_salary, allowances: employee.allowances || 0 });
 } else {
 setForm({ name: '', designation: '', department: '', cnic: '', phone: '', join_date: getToday(), basic_salary: 0, allowances: 0 });
 }
 }, [employee, isOpen]);

 const handleSave = async () => {
 if (!form.name.trim()) { toast.error('Name is required'); return; }
 if (!form.basic_salary || form.basic_salary <= 0) { toast.error('Basic salary must be > 0'); return; }
 setSaving(true);
 try { await onSave(form); } finally { setSaving(false); }
 };

 return (
 <Modal isOpen={isOpen} onClose={onClose} title={employee ? 'Edit Employee' : 'Add Employee'} size="md"
 footer={
 <div className="flex justify-end gap-3">
 <button onClick={onClose} className="px-4 py-2 text-sm border border-[#EBEBEB] rounded-lg">Cancel</button>
 <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95 disabled:opacity-50">
 {saving ? 'Saving...' : employee ? 'Update' : 'Add Employee'}
 </button>
 </div>
 }
 >
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1.5">Full Name *</label>
 <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]" />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1.5">Designation</label>
 <input type="text" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]" />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1.5">Department</label>
 <input type="text" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]" />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone</label>
 <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]" />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1.5">CNIC</label>
 <input type="text" value={form.cnic} onChange={e => setForm(f => ({ ...f, cnic: e.target.value }))} placeholder="12345-1234567-1" className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]" />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1.5">Join Date</label>
 <input type="date" value={form.join_date} onChange={e => setForm(f => ({ ...f, join_date: e.target.value }))} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]" />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1.5">Basic Salary *</label>
 <input type="number" value={form.basic_salary} onChange={e => setForm(f => ({ ...f, basic_salary: parseFloat(e.target.value) || 0 }))} min="0" step="100" className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm text-right font-mono focus:outline-none focus:border-[#B8F53A]" />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1.5">Allowances</label>
 <input type="number" value={form.allowances} onChange={e => setForm(f => ({ ...f, allowances: parseFloat(e.target.value) || 0 }))} min="0" step="100" className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm text-right font-mono focus:outline-none focus:border-[#B8F53A]" />
 </div>
 </div>
 </div>
 </Modal>
 );
}

function PaymentModal({ record, isOpen, onClose, onSuccess }) {
 const { getCashBankAccounts, formatCurrency, getToday } = useApp();
 const { user } = useAuth();
 const bankAccounts = getCashBankAccounts();
 const [form, setForm] = useState({ date: getToday(), account_id: '' });
 const [saving, setSaving] = useState(false);

 useEffect(() => {
 if (isOpen) setForm({ date: getToday(), account_id: bankAccounts[0]?.id || '' });
 }, [isOpen]);

 const handleSave = async () => {
 if (!form.account_id) { toast.error('Select payment account'); return; }
 setSaving(true);
 try {
 await window.electronAPI.payEmployee(record.id, { date: form.date, account_id: parseInt(form.account_id), user_id: user?.id });
 toast.success('Salary paid');
 onSuccess();
 onClose();
 } catch (err) {
 toast.error('Failed: ' + err.message);
 } finally {
 setSaving(false);
 }
 };

 if (!record) return null;

 return (
 <Modal isOpen={isOpen} onClose={onClose} title="Pay Salary" size="sm"
 footer={
 <div className="flex justify-end gap-3">
 <button onClick={onClose} className="px-4 py-2 text-sm border border-[#EBEBEB] rounded-lg">Cancel</button>
 <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95 disabled:opacity-50">
 <CheckCircle size={16} /> {saving ? '...' : 'Pay Salary'}
 </button>
 </div>
 }
 >
 <div className="space-y-4">
 <div className="bg-gray-50 rounded-lg p-4 text-sm">
 <p className="font-semibold">{record.employee_name}</p>
 <p className="text-gray-500">Net Salary: <span className="font-bold font-mono text-gray-800">{formatCurrency(record.net_salary)}</span></p>
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment Date</label>
 <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm" />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1.5">Pay From *</label>
 <select value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))} className="w-full px-3 py-2.5 border border-[#EBEBEB] rounded-lg text-sm">
 <option value="">Select account...</option>
 {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
 </select>
 </div>
 </div>
 </Modal>
 );
}

export default function Payroll() {
 const { formatCurrency } = useApp();
 const { canEdit } = useAuth();
 const now = new Date();
 const [tab, setTab] = useState('employees');
 const [employees, setEmployees] = useState([]);
 const [payrollList, setPayrollList] = useState([]);
 const [month, setMonth] = useState(now.getMonth() + 1);
 const [year, setYear] = useState(now.getFullYear());
 const [loading, setLoading] = useState(false);
 const [showEmpModal, setShowEmpModal] = useState(false);
 const [editEmployee, setEditEmployee] = useState(null);
 const [payRecord, setPayRecord] = useState(null);
 const [deleteConfirm, setDeleteConfirm] = useState(null);
 const [search, setSearch] = useState('');

 useEffect(() => { loadEmployees(); }, []);
 useEffect(() => { if (tab === 'payroll') loadPayroll(); }, [tab, month, year]);

 const loadEmployees = async () => {
 setLoading(true);
 const data = await window.electronAPI.getEmployees();
 setEmployees(data);
 setLoading(false);
 };

 const loadPayroll = async () => {
 setLoading(true);
 const data = await window.electronAPI.getPayrollList(month, year);
 setPayrollList(data);
 setLoading(false);
 };

 const handleSaveEmployee = async (form) => {
 try {
 if (editEmployee) {
 await window.electronAPI.updateEmployee(editEmployee.id, form);
 toast.success('Employee updated');
 } else {
 await window.electronAPI.createEmployee(form);
 toast.success('Employee added');
 }
 setShowEmpModal(false);
 setEditEmployee(null);
 loadEmployees();
 } catch (err) {
 toast.error('Failed: ' + err.message);
 }
 };

 const handleDeleteEmployee = async (id) => {
 await window.electronAPI.deleteEmployee(id);
 toast.success('Employee removed');
 setDeleteConfirm(null);
 loadEmployees();
 };

 const handleProcessPayroll = async () => {
 const result = await window.electronAPI.processPayroll(month, year);
 toast.success(`Payroll processed for ${result.count} employees`);
 loadPayroll();
 };

 const filteredEmployees = employees.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));
 const payrollTotals = payrollList.reduce((acc, r) => ({ gross: acc.gross + r.gross_salary, net: acc.net + r.net_salary }), { gross: 0, net: 0 });
 const pendingCount = payrollList.filter(r => r.payment_status === 'pending').length;

 const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

 return (
 <div className="p-6">
 <div className="flex items-center justify-between mb-6">
 <div>
 <h2 className="text-xl font-bold text-gray-900">Payroll Management</h2>
 </div>
 <div className="flex gap-3">
 <button onClick={() => setTab('employees')} className={`px-4 py-2 text-sm font-medium rounded-full ${tab === 'employees' ? 'bg-[#1A1A1A] text-white' : 'border border-[#EBEBEB] text-gray-600 hover:bg-gray-50'}`}>Employees</button>
 <button onClick={() => setTab('payroll')} className={`px-4 py-2 text-sm font-medium rounded-full ${tab === 'payroll' ? 'bg-[#1A1A1A] text-white' : 'border border-[#EBEBEB] text-gray-600 hover:bg-gray-50'}`}>Monthly Payroll</button>
 </div>
 </div>

 {tab === 'employees' && (
 <>
 <div className="flex items-center justify-between mb-4">
 <div className="relative flex-1 max-w-sm">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
 <input type="text" placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-[#EBEBEB] rounded-lg text-sm focus:outline-none focus:border-[#B8F53A]" />
 </div>
 {canEdit && (
 <button onClick={() => { setEditEmployee(null); setShowEmpModal(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95">
 <Plus size={16} /> Add Employee
 </button>
 )}
 </div>
 <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm overflow-hidden">
 {loading ? (
 <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div></div>
 ) : filteredEmployees.length === 0 ? (
 <div className="text-center py-16 text-gray-400"><Users size={40} className="mx-auto mb-3 opacity-20" /><p>No employees</p></div>
 ) : (
 <table className="w-full">
 <thead>
 <tr className="bg-gray-50 border-b border-[#EBEBEB]">
 <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Code</th>
 <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Name</th>
 <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Designation</th>
 <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Department</th>
 <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Basic Salary</th>
 <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Allowances</th>
 <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Gross</th>
 {canEdit && <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500">Actions</th>}
 </tr>
 </thead>
 <tbody>
 {filteredEmployees.map(emp => (
 <tr key={emp.id} className="border-b border-[#EBEBEB] hover:bg-[#F8FFE8]">
 <td className="py-3 px-4 font-mono text-xs text-gray-400">{emp.code}</td>
 <td className="py-3 px-4 text-sm font-semibold text-gray-800">{emp.name}</td>
 <td className="py-3 px-4 text-sm text-gray-500">{emp.designation || '-'}</td>
 <td className="py-3 px-4 text-sm text-gray-500">{emp.department || '-'}</td>
 <td className="py-3 px-4 text-right font-mono text-sm">{formatCurrency(emp.basic_salary)}</td>
 <td className="py-3 px-4 text-right font-mono text-sm text-gray-500">{formatCurrency(emp.allowances || 0)}</td>
 <td className="py-3 px-4 text-right font-mono text-sm font-semibold">{formatCurrency(emp.basic_salary + (emp.allowances || 0))}</td>
 {canEdit && (
 <td className="py-3 px-4">
 <div className="flex justify-center gap-1">
 <button onClick={() => { setEditEmployee(emp); setShowEmpModal(true); }} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><Edit size={14} /></button>
 <button onClick={() => setDeleteConfirm(emp)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
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

 {tab === 'payroll' && (
 <>
 <div className="flex items-center gap-4 mb-6">
 <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm">
 {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
 </select>
 <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} min="2000" max="2099" className="w-24 px-3 py-2 border border-[#EBEBEB] rounded-lg text-sm font-mono" />
 {canEdit && (
 <button onClick={handleProcessPayroll} className="flex items-center gap-2 px-4 py-2 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-sm font-semibold rounded-full active:scale-95">
 <Plus size={16} /> Process Payroll
 </button>
 )}
 </div>

 {payrollList.length > 0 && (
 <div className="grid grid-cols-3 gap-4 mb-4">
 <div className="rounded-2xl p-5 shadow-sm border border-transparent hover:-translate-y-0.5 hover:shadow-md transition-all" style={{ background: 'linear-gradient(135deg, #FFB8D0 0%, #FFCCE0 60%, #FFE4EE 100%)' }}>
 <p className="text-[11px] font-semibold uppercase tracking-wider text-black/50 mb-2">Total Gross Salary</p>
 <p className="text-2xl font-bold font-mono text-[#1A1A1A]">{formatCurrency(payrollTotals.gross)}</p>
 </div>
 <div className="rounded-2xl p-5 shadow-sm border border-transparent hover:-translate-y-0.5 hover:shadow-md transition-all" style={{ background: 'linear-gradient(135deg, #B0F0D8 0%, #CCFFE8 60%, #E0FFF2 100%)' }}>
 <p className="text-[11px] font-semibold uppercase tracking-wider text-black/50 mb-2">Total Net Salary</p>
 <p className="text-2xl font-bold font-mono text-[#1A1A1A]">{formatCurrency(payrollTotals.net)}</p>
 </div>
 <div className="rounded-2xl p-5 shadow-sm border border-transparent hover:-translate-y-0.5 hover:shadow-md transition-all" style={{ background: 'linear-gradient(135deg, #FFE8A0 0%, #FFF0C0 60%, #FFFAE0 100%)' }}>
 <p className="text-[11px] font-semibold uppercase tracking-wider text-black/50 mb-2">Pending Payments</p>
 <p className="text-2xl font-bold font-mono text-[#1A1A1A]">{pendingCount} employees</p>
 </div>
 </div>
 )}

 <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm overflow-hidden">
 {payrollList.length === 0 ? (
 <div className="text-center py-16 text-gray-400">
 <Users size={40} className="mx-auto mb-3 opacity-20" />
 <p>No payroll for {MONTHS[month - 1]} {year}</p>
 {canEdit && <button onClick={handleProcessPayroll} className="mt-2 text-green-600 text-sm hover:underline">Process payroll now</button>}
 </div>
 ) : (
 <table className="w-full">
 <thead>
 <tr className="bg-gray-50 border-b border-[#EBEBEB]">
 <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Employee</th>
 <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Basic</th>
 <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Allowances</th>
 <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Overtime</th>
 <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Gross</th>
 <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Deductions</th>
 <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Net Salary</th>
 <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500">Status</th>
 {canEdit && <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500">Action</th>}
 </tr>
 </thead>
 <tbody>
 {payrollList.map(r => (
 <tr key={r.id} className="border-b border-[#EBEBEB] hover:bg-[#F8FFE8]">
 <td className="py-3 px-4 text-sm font-semibold text-gray-800">{r.employee_name}</td>
 <td className="py-3 px-4 text-right font-mono text-sm">{formatCurrency(r.basic_salary)}</td>
 <td className="py-3 px-4 text-right font-mono text-sm text-gray-500">{formatCurrency(r.allowances)}</td>
 <td className="py-3 px-4 text-right font-mono text-sm text-green-600">{r.overtime > 0 ? formatCurrency(r.overtime) : '-'}</td>
 <td className="py-3 px-4 text-right font-mono text-sm font-medium">{formatCurrency(r.gross_salary)}</td>
 <td className="py-3 px-4 text-right font-mono text-sm text-red-600">{(r.income_tax + r.provident_fund + r.other_deductions) > 0 ? formatCurrency(r.income_tax + r.provident_fund + r.other_deductions) : '-'}</td>
 <td className="py-3 px-4 text-right font-mono text-sm font-bold text-gray-900">{formatCurrency(r.net_salary)}</td>
 <td className="py-3 px-4 text-center">
 <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
 {r.payment_status === 'paid' ? 'Paid' : 'Pending'}
 </span>
 </td>
 {canEdit && (
 <td className="py-3 px-4 text-center">
 {r.payment_status === 'pending' && (
 <button onClick={() => setPayRecord(r)} className="flex items-center gap-1 px-3 py-1.5 bg-[#B8F53A] hover:bg-[#A8E52A] text-[#1A1A1A] text-xs font-medium rounded-full mx-auto">
 <CheckCircle size={12} /> Pay
 </button>
 )}
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

 <EmployeeModal employee={editEmployee} isOpen={showEmpModal} onClose={() => { setShowEmpModal(false); setEditEmployee(null); }} onSave={handleSaveEmployee} />
 <PaymentModal record={payRecord} isOpen={!!payRecord} onClose={() => setPayRecord(null)} onSuccess={loadPayroll} />

 <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Remove Employee" size="sm"
 footer={
 <div className="flex justify-end gap-3">
 <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm border border-[#EBEBEB] rounded-lg">Cancel</button>
 <button onClick={() => handleDeleteEmployee(deleteConfirm.id)} className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-full">Remove</button>
 </div>
 }
 >
 <div className="text-center py-4">
 <AlertCircle size={40} className="mx-auto text-red-500 mb-3" />
 <p>Remove <strong>{deleteConfirm?.name}</strong> from payroll?</p>
 </div>
 </Modal>
 </div>
 );
}
