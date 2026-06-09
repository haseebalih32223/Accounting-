const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Auth
  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  updateSetting: (key, value) => ipcRenderer.invoke('settings:update', key, value),
  updateSettings: (settings) => ipcRenderer.invoke('settings:updateMany', settings),

  // Users
  getUsers: () => ipcRenderer.invoke('users:getAll'),
  createUser: (user) => ipcRenderer.invoke('users:create', user),
  updateUser: (id, user) => ipcRenderer.invoke('users:update', id, user),
  deleteUser: (id) => ipcRenderer.invoke('users:delete', id),
  changePassword: (id, password) => ipcRenderer.invoke('users:changePassword', id, password),

  // Accounts (Chart of Accounts)
  getAccounts: () => ipcRenderer.invoke('accounts:getAll'),
  getAccountById: (id) => ipcRenderer.invoke('accounts:getById', id),
  createAccount: (account) => ipcRenderer.invoke('accounts:create', account),
  updateAccount: (id, account) => ipcRenderer.invoke('accounts:update', id, account),
  deleteAccount: (id) => ipcRenderer.invoke('accounts:delete', id),
  getAccountLedger: (accountId, from, to) => ipcRenderer.invoke('accounts:getLedger', accountId, from, to),

  // Customers
  getCustomers: () => ipcRenderer.invoke('customers:getAll'),
  getCustomerById: (id) => ipcRenderer.invoke('customers:getById', id),
  createCustomer: (customer) => ipcRenderer.invoke('customers:create', customer),
  updateCustomer: (id, customer) => ipcRenderer.invoke('customers:update', id, customer),
  deleteCustomer: (id) => ipcRenderer.invoke('customers:delete', id),
  getCustomerLedger: (customerId, from, to) => ipcRenderer.invoke('customers:getLedger', customerId, from, to),

  // Suppliers
  getSuppliers: () => ipcRenderer.invoke('suppliers:getAll'),
  getSupplierById: (id) => ipcRenderer.invoke('suppliers:getById', id),
  createSupplier: (supplier) => ipcRenderer.invoke('suppliers:create', supplier),
  updateSupplier: (id, supplier) => ipcRenderer.invoke('suppliers:update', id, supplier),
  deleteSupplier: (id) => ipcRenderer.invoke('suppliers:delete', id),
  getSupplierLedger: (supplierId, from, to) => ipcRenderer.invoke('suppliers:getLedger', supplierId, from, to),

  // Vouchers
  getVouchers: (filters) => ipcRenderer.invoke('vouchers:getAll', filters),
  getVoucherById: (id) => ipcRenderer.invoke('vouchers:getById', id),
  createVoucher: (voucher) => ipcRenderer.invoke('vouchers:create', voucher),
  updateVoucher: (id, voucher) => ipcRenderer.invoke('vouchers:update', id, voucher),
  deleteVoucher: (id) => ipcRenderer.invoke('vouchers:delete', id),
  getNextVoucherNumber: (type) => ipcRenderer.invoke('vouchers:getNextNumber', type),

  // Sales Invoices
  getSalesInvoices: (filters) => ipcRenderer.invoke('sales:getAll', filters),
  getSalesInvoiceById: (id) => ipcRenderer.invoke('sales:getById', id),
  createSalesInvoice: (invoice) => ipcRenderer.invoke('sales:create', invoice),
  updateSalesInvoice: (id, invoice) => ipcRenderer.invoke('sales:update', id, invoice),
  deleteSalesInvoice: (id) => ipcRenderer.invoke('sales:delete', id),
  recordSalesPayment: (invoiceId, payment) => ipcRenderer.invoke('sales:recordPayment', invoiceId, payment),
  getNextInvoiceNumber: () => ipcRenderer.invoke('sales:getNextNumber'),

  // Purchase Invoices
  getPurchaseInvoices: (filters) => ipcRenderer.invoke('purchases:getAll', filters),
  getPurchaseInvoiceById: (id) => ipcRenderer.invoke('purchases:getById', id),
  createPurchaseInvoice: (invoice) => ipcRenderer.invoke('purchases:create', invoice),
  updatePurchaseInvoice: (id, invoice) => ipcRenderer.invoke('purchases:update', id, invoice),
  deletePurchaseInvoice: (id) => ipcRenderer.invoke('purchases:delete', id),
  recordPurchasePayment: (invoiceId, payment) => ipcRenderer.invoke('purchases:recordPayment', invoiceId, payment),
  getNextPurchaseInvoiceNumber: () => ipcRenderer.invoke('purchases:getNextNumber'),

  // Expenses
  getExpenses: (filters) => ipcRenderer.invoke('expenses:getAll', filters),
  getExpenseById: (id) => ipcRenderer.invoke('expenses:getById', id),
  createExpense: (expense) => ipcRenderer.invoke('expenses:create', expense),
  updateExpense: (id, expense) => ipcRenderer.invoke('expenses:update', id, expense),
  deleteExpense: (id) => ipcRenderer.invoke('expenses:delete', id),

  // Bank & Cash
  getBankAccounts: () => ipcRenderer.invoke('bank:getAccounts'),
  getBankTransactions: (accountId, from, to) => ipcRenderer.invoke('bank:getTransactions', accountId, from, to),

  // Payroll
  getEmployees: () => ipcRenderer.invoke('payroll:getEmployees'),
  getEmployeeById: (id) => ipcRenderer.invoke('payroll:getEmployeeById', id),
  createEmployee: (employee) => ipcRenderer.invoke('payroll:createEmployee', employee),
  updateEmployee: (id, employee) => ipcRenderer.invoke('payroll:updateEmployee', id, employee),
  deleteEmployee: (id) => ipcRenderer.invoke('payroll:deleteEmployee', id),
  getPayrollList: (month, year) => ipcRenderer.invoke('payroll:getList', month, year),
  processPayroll: (month, year) => ipcRenderer.invoke('payroll:process', month, year),
  payEmployee: (payrollId, paymentData) => ipcRenderer.invoke('payroll:pay', payrollId, paymentData),
  payAllEmployees: (month, year, paymentData) => ipcRenderer.invoke('payroll:payAll', month, year, paymentData),

  // Tax
  getTaxRecords: () => ipcRenderer.invoke('tax:getAll'),
  createTaxRecord: (record) => ipcRenderer.invoke('tax:create', record),
  updateTaxRecord: (id, record) => ipcRenderer.invoke('tax:update', id, record),
  deleteTaxRecord: (id) => ipcRenderer.invoke('tax:delete', id),
  getTaxSummary: (from, to) => ipcRenderer.invoke('tax:getSummary', from, to),

  // Reports
  getTrialBalance: (date) => ipcRenderer.invoke('reports:trialBalance', date),
  getProfitLoss: (from, to) => ipcRenderer.invoke('reports:profitLoss', from, to),
  getBalanceSheet: (date) => ipcRenderer.invoke('reports:balanceSheet', date),
  getCashFlow: (from, to) => ipcRenderer.invoke('reports:cashFlow', from, to),
  getSalesReport: (from, to) => ipcRenderer.invoke('reports:sales', from, to),
  getPurchaseReport: (from, to) => ipcRenderer.invoke('reports:purchases', from, to),
  getExpenseReport: (from, to) => ipcRenderer.invoke('reports:expenses', from, to),
  getARAgingReport: () => ipcRenderer.invoke('reports:arAging'),
  getAPAgingReport: () => ipcRenderer.invoke('reports:apAging'),
  getPayrollReport: (month, year) => ipcRenderer.invoke('reports:payroll', month, year),

  // Dashboard
  getDashboardData: () => ipcRenderer.invoke('dashboard:getData'),

  // Backup
  exportBackup: () => ipcRenderer.invoke('backup:export'),
  importBackup: (filePath) => ipcRenderer.invoke('backup:import', filePath),
  selectFile: () => ipcRenderer.invoke('dialog:selectFile'),
  selectSavePath: (defaultName) => ipcRenderer.invoke('dialog:selectSavePath', defaultName),
});
