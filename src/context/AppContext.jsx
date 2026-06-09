import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [settings, setSettings] = useState({});
  const [accounts, setAccounts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    loadSettings();
    loadAccounts();
    loadCustomers();
    loadSuppliers();
  }, []);

  const loadSettings = async () => {
    try {
      const s = await window.electronAPI.getSettings();
      setSettings(s);
    } catch {}
  };

  const loadAccounts = async () => {
    try {
      const a = await window.electronAPI.getAccounts();
      setAccounts(a);
    } catch {}
  };

  const loadCustomers = async () => {
    try {
      const c = await window.electronAPI.getCustomers();
      setCustomers(c);
    } catch {}
  };

  const loadSuppliers = async () => {
    try {
      const s = await window.electronAPI.getSuppliers();
      setSuppliers(s);
    } catch {}
  };

  const refreshAll = () => {
    loadSettings();
    loadAccounts();
    loadCustomers();
    loadSuppliers();
  };

  const currency = settings.currency || 'Rs.';

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return `${currency} ${num.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${String(d.getDate()).padStart(2,'0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
  };

  const getToday = () => new Date().toISOString().split('T')[0];

  const getCashBankAccounts = () => accounts.filter(a => a.is_bank || a.is_cash);

  const getExpenseAccounts = () => accounts.filter(a => a.type === 'expense' && a.sub_type !== 'group');

  return (
    <AppContext.Provider value={{
      settings, accounts, customers, suppliers,
      loadSettings, loadAccounts, loadCustomers, loadSuppliers, refreshAll,
      currency, formatCurrency, formatDate, getToday,
      getCashBankAccounts, getExpenseAccounts,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
