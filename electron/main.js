const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let isDev = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
    icon: fs.existsSync(path.join(__dirname, '../public/icon.png')) ? path.join(__dirname, '../public/icon.png') : undefined,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  isDev = isDev || !app.isPackaged;
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── DB helpers ────────────────────────────────────────────────────────────────
const { getDb } = require('./database/db');

function db() { return getDb(); }

// ─── Number generators ─────────────────────────────────────────────────────────
function getNextNumber(prefix, table, column) {
  const d = db();
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-%`;
  const row = d.prepare(`SELECT ${column} FROM ${table} WHERE ${column} LIKE ? ORDER BY id DESC LIMIT 1`).get(pattern);
  if (!row) return `${prefix}-${year}-001`;
  const parts = row[column].split('-');
  const seq = parseInt(parts[parts.length - 1]) + 1;
  return `${prefix}-${year}-${String(seq).padStart(3, '0')}`;
}

function getNextVoucherNum(type) {
  const d = db();
  const prefixMap = { journal: 'JV', payment: 'PV', receipt: 'RV', contra: 'CV' };
  const settingKey = `voucher_prefix_${type}`;
  const prefixRow = d.prepare('SELECT value FROM settings WHERE key = ?').get(settingKey);
  const prefix = prefixRow ? prefixRow.value : prefixMap[type] || 'VCH';
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-%`;
  const row = d.prepare(`SELECT voucher_number FROM vouchers WHERE voucher_number LIKE ? ORDER BY id DESC LIMIT 1`).get(pattern);
  if (!row) return `${prefix}-${year}-001`;
  const parts = row.voucher_number.split('-');
  const seq = parseInt(parts[parts.length - 1]) + 1;
  return `${prefix}-${year}-${String(seq).padStart(3, '0')}`;
}

// ─── Update account balance helper ────────────────────────────────────────────
function updateAccountBalance(accountId) {
  const d = db();
  const account = d.prepare('SELECT type FROM accounts WHERE id = ?').get(accountId);
  if (!account) return;

  const totals = d.prepare(`
    SELECT COALESCE(SUM(debit),0) as total_debit, COALESCE(SUM(credit),0) as total_credit
    FROM voucher_items WHERE account_id = ?
  `).get(accountId);

  let balance = 0;
  if (['asset', 'expense'].includes(account.type)) {
    balance = (account.opening_balance || 0) + totals.total_debit - totals.total_credit;
  } else {
    balance = (account.opening_balance || 0) + totals.total_credit - totals.total_debit;
  }

  d.prepare('UPDATE accounts SET balance = ? WHERE id = ?').run(balance, accountId);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
ipcMain.handle('auth:login', (_evt, { username, password }) => {
  const user = db().prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
  if (!user) return { success: false, message: 'Invalid username or password' };
  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return { success: false, message: 'Invalid username or password' };
  const { password: _pw, ...safeUser } = user;
  return { success: true, user: safeUser };
});

// ─── Settings ─────────────────────────────────────────────────────────────────
ipcMain.handle('settings:getAll', () => {
  const rows = db().prepare('SELECT key, value FROM settings').all();
  return rows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});
});

ipcMain.handle('settings:update', (_, key, value) => {
  db().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  return { success: true };
});

ipcMain.handle('settings:updateMany', (_, settings) => {
  const stmt = db().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const updateMany = db().transaction((s) => { for (const [k, v] of Object.entries(s)) stmt.run(k, v); });
  updateMany(settings);
  return { success: true };
});

// ─── Users ────────────────────────────────────────────────────────────────────
ipcMain.handle('users:getAll', () => {
  return db().prepare('SELECT id, name, username, role, is_active, created_at FROM users ORDER BY id').all();
});

ipcMain.handle('users:create', (_, user) => {
  const hash = bcrypt.hashSync(user.password, 10);
  const result = db().prepare('INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)').run(user.name, user.username, hash, user.role);
  return { success: true, id: result.lastInsertRowid };
});

ipcMain.handle('users:update', (_, id, user) => {
  db().prepare('UPDATE users SET name = ?, username = ?, role = ?, is_active = ? WHERE id = ?').run(user.name, user.username, user.role, user.is_active ? 1 : 0, id);
  return { success: true };
});

ipcMain.handle('users:delete', (_, id) => {
  db().prepare('DELETE FROM users WHERE id = ?').run(id);
  return { success: true };
});

ipcMain.handle('users:changePassword', (_, id, password) => {
  const hash = bcrypt.hashSync(password, 10);
  db().prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, id);
  return { success: true };
});

// ─── Accounts ─────────────────────────────────────────────────────────────────
ipcMain.handle('accounts:getAll', () => {
  return db().prepare('SELECT * FROM accounts ORDER BY code').all();
});

ipcMain.handle('accounts:getById', (_, id) => {
  return db().prepare('SELECT * FROM accounts WHERE id = ?').get(id);
});

ipcMain.handle('accounts:create', (_, account) => {
  const result = db().prepare(`
    INSERT INTO accounts (code, name, type, sub_type, parent_id, is_bank, is_cash, opening_balance, balance, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(account.code, account.name, account.type, account.sub_type || null, account.parent_id || null, account.is_bank ? 1 : 0, account.is_cash ? 1 : 0, account.opening_balance || 0, account.opening_balance || 0, account.description || null);
  return { success: true, id: result.lastInsertRowid };
});

ipcMain.handle('accounts:update', (_, id, account) => {
  db().prepare(`
    UPDATE accounts SET name = ?, sub_type = ?, description = ?, is_bank = ?, is_cash = ?, opening_balance = ?
    WHERE id = ?
  `).run(account.name, account.sub_type || null, account.description || null, account.is_bank ? 1 : 0, account.is_cash ? 1 : 0, account.opening_balance || 0, id);
  return { success: true };
});

ipcMain.handle('accounts:delete', (_, id) => {
  const account = db().prepare('SELECT is_system FROM accounts WHERE id = ?').get(id);
  if (account && account.is_system) return { success: false, message: 'Cannot delete system account' };
  const hasChildren = db().prepare('SELECT COUNT(*) as cnt FROM accounts WHERE parent_id = ?').get(id);
  if (hasChildren.cnt > 0) return { success: false, message: 'Cannot delete account with sub-accounts' };
  const hasTransactions = db().prepare('SELECT COUNT(*) as cnt FROM voucher_items WHERE account_id = ?').get(id);
  if (hasTransactions.cnt > 0) return { success: false, message: 'Cannot delete account with transactions' };
  db().prepare('DELETE FROM accounts WHERE id = ?').run(id);
  return { success: true };
});

ipcMain.handle('accounts:getLedger', (_, accountId, from, to) => {
  let query = `
    SELECT vi.*, v.date, v.voucher_number, v.voucher_type, v.narration as voucher_narration
    FROM voucher_items vi
    JOIN vouchers v ON vi.voucher_id = v.id
    WHERE vi.account_id = ?
  `;
  const params = [accountId];
  if (from) { query += ' AND v.date >= ?'; params.push(from); }
  if (to) { query += ' AND v.date <= ?'; params.push(to); }
  query += ' ORDER BY v.date, v.id';
  const items = db().prepare(query).all(...params);
  const account = db().prepare('SELECT * FROM accounts WHERE id = ?').get(accountId);
  let runningBalance = account ? (account.opening_balance || 0) : 0;
  const isDebitNormal = ['asset', 'expense'].includes(account?.type);
  const ledger = items.map(item => {
    if (isDebitNormal) {
      runningBalance += item.debit - item.credit;
    } else {
      runningBalance += item.credit - item.debit;
    }
    return { ...item, balance: runningBalance };
  });
  return { account, ledger };
});

// ─── Customers ────────────────────────────────────────────────────────────────
ipcMain.handle('customers:getAll', () => {
  return db().prepare('SELECT * FROM customers WHERE is_active = 1 ORDER BY name').all();
});

ipcMain.handle('customers:getById', (_, id) => {
  return db().prepare('SELECT * FROM customers WHERE id = ?').get(id);
});

ipcMain.handle('customers:create', (_, c) => {
  const code = c.code || `C${String(db().prepare('SELECT COUNT(*)+1 as n FROM customers').get().n).padStart(3, '0')}`;
  const result = db().prepare(`
    INSERT INTO customers (code, name, phone, email, address, ntn, strn, credit_limit, opening_balance, current_balance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(code, c.name, c.phone || null, c.email || null, c.address || null, c.ntn || null, c.strn || null, c.credit_limit || 0, c.opening_balance || 0, c.opening_balance || 0);
  return { success: true, id: result.lastInsertRowid };
});

ipcMain.handle('customers:update', (_, id, c) => {
  db().prepare(`
    UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, ntn = ?, strn = ?, credit_limit = ? WHERE id = ?
  `).run(c.name, c.phone || null, c.email || null, c.address || null, c.ntn || null, c.strn || null, c.credit_limit || 0, id);
  return { success: true };
});

ipcMain.handle('customers:delete', (_, id) => {
  const hasSales = db().prepare('SELECT COUNT(*) as cnt FROM sales_invoices WHERE customer_id = ?').get(id);
  if (hasSales.cnt > 0) return { success: false, message: 'Cannot delete customer with invoices' };
  db().prepare('UPDATE customers SET is_active = 0 WHERE id = ?').run(id);
  return { success: true };
});

ipcMain.handle('customers:getLedger', (_, customerId, from, to) => {
  const customer = db().prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
  let query = `
    SELECT si.invoice_number, si.date, si.total_amount as debit, 0 as credit,
           si.payment_status, 'Sales Invoice' as type, si.id as ref_id
    FROM sales_invoices si WHERE si.customer_id = ?
  `;
  const params = [customerId];
  if (from) { query += ' AND si.date >= ?'; params.push(from); }
  if (to) { query += ' AND si.date <= ?'; params.push(to); }
  const invoices = db().prepare(query).all(...params);
  return { customer, ledger: invoices };
});

// ─── Suppliers ────────────────────────────────────────────────────────────────
ipcMain.handle('suppliers:getAll', () => {
  return db().prepare('SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name').all();
});

ipcMain.handle('suppliers:getById', (_, id) => {
  return db().prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
});

ipcMain.handle('suppliers:create', (_, s) => {
  const code = s.code || `S${String(db().prepare('SELECT COUNT(*)+1 as n FROM suppliers').get().n).padStart(3, '0')}`;
  const result = db().prepare(`
    INSERT INTO suppliers (code, name, phone, email, address, ntn, strn, opening_balance, current_balance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(code, s.name, s.phone || null, s.email || null, s.address || null, s.ntn || null, s.strn || null, s.opening_balance || 0, s.opening_balance || 0);
  return { success: true, id: result.lastInsertRowid };
});

ipcMain.handle('suppliers:update', (_, id, s) => {
  db().prepare(`
    UPDATE suppliers SET name = ?, phone = ?, email = ?, address = ?, ntn = ?, strn = ? WHERE id = ?
  `).run(s.name, s.phone || null, s.email || null, s.address || null, s.ntn || null, s.strn || null, id);
  return { success: true };
});

ipcMain.handle('suppliers:delete', (_, id) => {
  db().prepare('UPDATE suppliers SET is_active = 0 WHERE id = ?').run(id);
  return { success: true };
});

ipcMain.handle('suppliers:getLedger', (_, supplierId, from, to) => {
  const supplier = db().prepare('SELECT * FROM suppliers WHERE id = ?').get(supplierId);
  let query = `
    SELECT pi.invoice_number, pi.date, 0 as debit, pi.total_amount as credit,
           pi.payment_status, 'Purchase Invoice' as type, pi.id as ref_id
    FROM purchase_invoices pi WHERE pi.supplier_id = ?
  `;
  const params = [supplierId];
  if (from) { query += ' AND pi.date >= ?'; params.push(from); }
  if (to) { query += ' AND pi.date <= ?'; params.push(to); }
  const invoices = db().prepare(query).all(...params);
  return { supplier, ledger: invoices };
});

// ─── Vouchers ─────────────────────────────────────────────────────────────────
ipcMain.handle('vouchers:getNextNumber', (_, type) => {
  return getNextVoucherNum(type);
});

ipcMain.handle('vouchers:getAll', (_, filters = {}) => {
  let query = 'SELECT * FROM vouchers WHERE 1=1';
  const params = [];
  if (filters.type) { query += ' AND voucher_type = ?'; params.push(filters.type); }
  if (filters.from) { query += ' AND date >= ?'; params.push(filters.from); }
  if (filters.to) { query += ' AND date <= ?'; params.push(filters.to); }
  if (filters.search) { query += ' AND (voucher_number LIKE ? OR narration LIKE ?)'; params.push(`%${filters.search}%`, `%${filters.search}%`); }
  query += ' ORDER BY date DESC, id DESC';
  const vouchers = db().prepare(query).all(...params);
  return vouchers.map(v => {
    v.items = db().prepare('SELECT * FROM voucher_items WHERE voucher_id = ?').all(v.id);
    return v;
  });
});

ipcMain.handle('vouchers:getById', (_, id) => {
  const voucher = db().prepare('SELECT * FROM vouchers WHERE id = ?').get(id);
  if (!voucher) return null;
  voucher.items = db().prepare('SELECT * FROM voucher_items WHERE voucher_id = ?').all(id);
  return voucher;
});

ipcMain.handle('vouchers:create', (_, voucher) => {
  const d = db();
  const result = d.transaction(() => {
    const vr = d.prepare(`
      INSERT INTO vouchers (voucher_number, voucher_type, date, reference, narration, total_debit, total_credit, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(voucher.voucher_number, voucher.voucher_type, voucher.date, voucher.reference || null, voucher.narration || null, voucher.total_debit, voucher.total_credit, voucher.user_id || null);
    const voucherId = vr.lastInsertRowid;
    for (const item of voucher.items) {
      d.prepare(`INSERT INTO voucher_items (voucher_id, account_id, account_name, debit, credit, narration) VALUES (?, ?, ?, ?, ?, ?)`)
        .run(voucherId, item.account_id, item.account_name, item.debit || 0, item.credit || 0, item.narration || null);
      updateAccountBalance(item.account_id);
    }
    return voucherId;
  })();
  return { success: true, id: result };
});

ipcMain.handle('vouchers:update', (_, id, voucher) => {
  const d = db();
  d.transaction(() => {
    const oldItems = d.prepare('SELECT account_id FROM voucher_items WHERE voucher_id = ?').all(id);
    d.prepare(`
      UPDATE vouchers SET voucher_number = ?, voucher_type = ?, date = ?, reference = ?, narration = ?,
      total_debit = ?, total_credit = ? WHERE id = ?
    `).run(voucher.voucher_number, voucher.voucher_type, voucher.date, voucher.reference || null, voucher.narration || null, voucher.total_debit, voucher.total_credit, id);
    d.prepare('DELETE FROM voucher_items WHERE voucher_id = ?').run(id);
    for (const item of voucher.items) {
      d.prepare(`INSERT INTO voucher_items (voucher_id, account_id, account_name, debit, credit, narration) VALUES (?, ?, ?, ?, ?, ?)`)
        .run(id, item.account_id, item.account_name, item.debit || 0, item.credit || 0, item.narration || null);
    }
    const allIds = new Set([...oldItems.map(i => i.account_id), ...voucher.items.map(i => i.account_id)]);
    for (const accountId of allIds) updateAccountBalance(accountId);
  })();
  return { success: true };
});

ipcMain.handle('vouchers:delete', (_, id) => {
  const d = db();
  d.transaction(() => {
    const items = d.prepare('SELECT account_id FROM voucher_items WHERE voucher_id = ?').all(id);
    d.prepare('DELETE FROM vouchers WHERE id = ?').run(id);
    for (const item of items) updateAccountBalance(item.account_id);
  })();
  return { success: true };
});

// ─── Sales Invoices ───────────────────────────────────────────────────────────
ipcMain.handle('sales:getNextNumber', () => {
  const d = db();
  const prefixRow = d.prepare("SELECT value FROM settings WHERE key = 'invoice_prefix'").get();
  const prefix = prefixRow ? prefixRow.value : 'SI';
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-%`;
  const row = d.prepare(`SELECT invoice_number FROM sales_invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1`).get(pattern);
  if (!row) return `${prefix}-${year}-001`;
  const parts = row.invoice_number.split('-');
  const seq = parseInt(parts[parts.length - 1]) + 1;
  return `${prefix}-${year}-${String(seq).padStart(3, '0')}`;
});

ipcMain.handle('sales:getAll', (_, filters = {}) => {
  let query = 'SELECT si.*, c.phone as customer_phone FROM sales_invoices si LEFT JOIN customers c ON si.customer_id = c.id WHERE 1=1';
  const params = [];
  if (filters.status) { query += ' AND si.payment_status = ?'; params.push(filters.status); }
  if (filters.customer_id) { query += ' AND si.customer_id = ?'; params.push(filters.customer_id); }
  if (filters.from) { query += ' AND si.date >= ?'; params.push(filters.from); }
  if (filters.to) { query += ' AND si.date <= ?'; params.push(filters.to); }
  if (filters.search) { query += ' AND (si.invoice_number LIKE ? OR si.customer_name LIKE ?)'; params.push(`%${filters.search}%`, `%${filters.search}%`); }
  query += ' ORDER BY si.date DESC, si.id DESC';
  return db().prepare(query).all(...params);
});

ipcMain.handle('sales:getById', (_, id) => {
  const invoice = db().prepare('SELECT * FROM sales_invoices WHERE id = ?').get(id);
  if (!invoice) return null;
  invoice.items = db().prepare('SELECT * FROM sales_invoice_items WHERE invoice_id = ?').all(id);
  return invoice;
});

ipcMain.handle('sales:create', (_, invoice) => {
  const d = db();
  const result = d.transaction(() => {
    // Create voucher entries
    const arAccount = d.prepare("SELECT id FROM accounts WHERE code = '1103'").get();
    const salesAccount = d.prepare("SELECT id FROM accounts WHERE code = '4001'").get();
    const taxAccount = d.prepare("SELECT id FROM accounts WHERE code = '2102'").get();

    const voucherNum = getNextVoucherNum('journal');
    const voucherResult = d.prepare(`
      INSERT INTO vouchers (voucher_number, voucher_type, date, narration, total_debit, total_credit, user_id)
      VALUES (?, 'journal', ?, ?, ?, ?, ?)
    `).run(voucherNum, invoice.date, `Sales Invoice ${invoice.invoice_number} - ${invoice.customer_name}`, invoice.total_amount, invoice.total_amount, invoice.user_id || null);
    const voucherId = voucherResult.lastInsertRowid;

    const netSales = invoice.subtotal - (invoice.discount_amount || 0);
    const entries = [];
    if (arAccount) entries.push({ account_id: arAccount.id, account_name: 'Accounts Receivable', debit: invoice.total_amount, credit: 0 });
    if (invoice.tax_amount > 0 && taxAccount) entries.push({ account_id: taxAccount.id, account_name: 'Sales Tax Payable', debit: 0, credit: invoice.tax_amount });
    if (salesAccount) entries.push({ account_id: salesAccount.id, account_name: 'Sales Revenue', debit: 0, credit: netSales });

    for (const entry of entries) {
      d.prepare('INSERT INTO voucher_items (voucher_id, account_id, account_name, debit, credit) VALUES (?, ?, ?, ?, ?)')
        .run(voucherId, entry.account_id, entry.account_name, entry.debit, entry.credit);
      if (entry.account_id) updateAccountBalance(entry.account_id);
    }

    const invResult = d.prepare(`
      INSERT INTO sales_invoices (invoice_number, date, due_date, customer_id, customer_name, subtotal, discount_amount, discount_percent, tax_amount, tax_percent, total_amount, paid_amount, balance_due, payment_status, notes, user_id, voucher_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'unpaid', ?, ?, ?)
    `).run(invoice.invoice_number, invoice.date, invoice.due_date || null, invoice.customer_id || null, invoice.customer_name, invoice.subtotal, invoice.discount_amount || 0, invoice.discount_percent || 0, invoice.tax_amount || 0, invoice.tax_percent || 0, invoice.total_amount, invoice.total_amount, invoice.notes || null, invoice.user_id || null, voucherId);
    const invoiceId = invResult.lastInsertRowid;

    for (const item of invoice.items) {
      d.prepare(`INSERT INTO sales_invoice_items (invoice_id, product_name, description, quantity, unit, unit_price, discount, tax_percent, tax_amount, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(invoiceId, item.product_name, item.description || null, item.quantity, item.unit || 'pcs', item.unit_price, item.discount || 0, item.tax_percent || 0, item.tax_amount || 0, item.total);
    }

    // Update customer balance
    if (invoice.customer_id) {
      d.prepare('UPDATE customers SET current_balance = current_balance + ? WHERE id = ?').run(invoice.total_amount, invoice.customer_id);
    }

    return invoiceId;
  })();
  return { success: true, id: result };
});

ipcMain.handle('sales:update', (_, id, invoice) => {
  const d = db();
  d.transaction(() => {
    const old = d.prepare('SELECT * FROM sales_invoices WHERE id = ?').get(id);
    if (old && old.customer_id) {
      d.prepare('UPDATE customers SET current_balance = current_balance - ? WHERE id = ?').run(old.total_amount, old.customer_id);
    }
    d.prepare(`
      UPDATE sales_invoices SET date = ?, due_date = ?, customer_id = ?, customer_name = ?, subtotal = ?,
      discount_amount = ?, discount_percent = ?, tax_amount = ?, tax_percent = ?, total_amount = ?,
      balance_due = total_amount - paid_amount, notes = ? WHERE id = ?
    `).run(invoice.date, invoice.due_date || null, invoice.customer_id || null, invoice.customer_name, invoice.subtotal, invoice.discount_amount || 0, invoice.discount_percent || 0, invoice.tax_amount || 0, invoice.tax_percent || 0, invoice.total_amount, invoice.notes || null, id);
    d.prepare('DELETE FROM sales_invoice_items WHERE invoice_id = ?').run(id);
    for (const item of invoice.items) {
      d.prepare(`INSERT INTO sales_invoice_items (invoice_id, product_name, description, quantity, unit, unit_price, discount, tax_percent, tax_amount, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, item.product_name, item.description || null, item.quantity, item.unit || 'pcs', item.unit_price, item.discount || 0, item.tax_percent || 0, item.tax_amount || 0, item.total);
    }
    if (invoice.customer_id) {
      d.prepare('UPDATE customers SET current_balance = current_balance + ? WHERE id = ?').run(invoice.total_amount, invoice.customer_id);
    }
  })();
  return { success: true };
});

ipcMain.handle('sales:delete', (_, id) => {
  const d = db();
  d.transaction(() => {
    const invoice = d.prepare('SELECT * FROM sales_invoices WHERE id = ?').get(id);
    if (invoice) {
      if (invoice.customer_id) {
        d.prepare('UPDATE customers SET current_balance = current_balance - ? WHERE id = ?').run(invoice.balance_due, invoice.customer_id);
      }
      if (invoice.voucher_id) {
        const items = d.prepare('SELECT account_id FROM voucher_items WHERE voucher_id = ?').all(invoice.voucher_id);
        d.prepare('DELETE FROM vouchers WHERE id = ?').run(invoice.voucher_id);
        for (const item of items) updateAccountBalance(item.account_id);
      }
    }
    d.prepare('DELETE FROM sales_invoices WHERE id = ?').run(id);
  })();
  return { success: true };
});

ipcMain.handle('sales:recordPayment', (_, invoiceId, payment) => {
  const d = db();
  d.transaction(() => {
    const invoice = d.prepare('SELECT * FROM sales_invoices WHERE id = ?').get(invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const paymentAccount = d.prepare('SELECT * FROM accounts WHERE id = ?').get(payment.account_id);
    const arAccount = d.prepare("SELECT id FROM accounts WHERE code = '1103'").get();

    const voucherNum = getNextVoucherNum('receipt');
    const vr = d.prepare(`
      INSERT INTO vouchers (voucher_number, voucher_type, date, narration, total_debit, total_credit, user_id)
      VALUES (?, 'receipt', ?, ?, ?, ?, ?)
    `).run(voucherNum, payment.date, `Payment received for Invoice ${invoice.invoice_number} from ${invoice.customer_name}`, payment.amount, payment.amount, payment.user_id || null);
    const voucherId = vr.lastInsertRowid;

    d.prepare('INSERT INTO voucher_items (voucher_id, account_id, account_name, debit, credit) VALUES (?, ?, ?, ?, ?)')
      .run(voucherId, payment.account_id, paymentAccount ? paymentAccount.name : 'Cash/Bank', payment.amount, 0);
    if (arAccount) {
      d.prepare('INSERT INTO voucher_items (voucher_id, account_id, account_name, debit, credit) VALUES (?, ?, ?, ?, ?)')
        .run(voucherId, arAccount.id, 'Accounts Receivable', 0, payment.amount);
    }

    updateAccountBalance(payment.account_id);
    if (arAccount) updateAccountBalance(arAccount.id);

    const newPaid = invoice.paid_amount + payment.amount;
    const newBalance = invoice.total_amount - newPaid;
    const status = newBalance <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
    d.prepare('UPDATE sales_invoices SET paid_amount = ?, balance_due = ?, payment_status = ? WHERE id = ?').run(newPaid, newBalance, status, invoiceId);

    if (invoice.customer_id) {
      d.prepare('UPDATE customers SET current_balance = current_balance - ? WHERE id = ?').run(payment.amount, invoice.customer_id);
    }
  })();
  return { success: true };
});

// ─── Purchase Invoices ────────────────────────────────────────────────────────
ipcMain.handle('purchases:getNextNumber', () => {
  const d = db();
  const prefixRow = d.prepare("SELECT value FROM settings WHERE key = 'purchase_prefix'").get();
  const prefix = prefixRow ? prefixRow.value : 'PI';
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-%`;
  const row = d.prepare(`SELECT invoice_number FROM purchase_invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1`).get(pattern);
  if (!row) return `${prefix}-${year}-001`;
  const parts = row.invoice_number.split('-');
  const seq = parseInt(parts[parts.length - 1]) + 1;
  return `${prefix}-${year}-${String(seq).padStart(3, '0')}`;
});

ipcMain.handle('purchases:getAll', (_, filters = {}) => {
  let query = 'SELECT pi.*, s.phone as supplier_phone FROM purchase_invoices pi LEFT JOIN suppliers s ON pi.supplier_id = s.id WHERE 1=1';
  const params = [];
  if (filters.status) { query += ' AND pi.payment_status = ?'; params.push(filters.status); }
  if (filters.supplier_id) { query += ' AND pi.supplier_id = ?'; params.push(filters.supplier_id); }
  if (filters.from) { query += ' AND pi.date >= ?'; params.push(filters.from); }
  if (filters.to) { query += ' AND pi.date <= ?'; params.push(filters.to); }
  if (filters.search) { query += ' AND (pi.invoice_number LIKE ? OR pi.supplier_name LIKE ?)'; params.push(`%${filters.search}%`, `%${filters.search}%`); }
  query += ' ORDER BY pi.date DESC, pi.id DESC';
  return db().prepare(query).all(...params);
});

ipcMain.handle('purchases:getById', (_, id) => {
  const invoice = db().prepare('SELECT * FROM purchase_invoices WHERE id = ?').get(id);
  if (!invoice) return null;
  invoice.items = db().prepare('SELECT * FROM purchase_invoice_items WHERE invoice_id = ?').all(id);
  return invoice;
});

ipcMain.handle('purchases:create', (_, invoice) => {
  const d = db();
  const result = d.transaction(() => {
    const apAccount = d.prepare("SELECT id FROM accounts WHERE code = '2101'").get();
    const taxAccount = d.prepare("SELECT id FROM accounts WHERE code = '2102'").get();

    const voucherNum = getNextVoucherNum('journal');
    const vr = d.prepare(`
      INSERT INTO vouchers (voucher_number, voucher_type, date, narration, total_debit, total_credit, user_id)
      VALUES (?, 'journal', ?, ?, ?, ?, ?)
    `).run(voucherNum, invoice.date, `Purchase Invoice ${invoice.invoice_number} - ${invoice.supplier_name}`, invoice.total_amount, invoice.total_amount, invoice.user_id || null);
    const voucherId = vr.lastInsertRowid;

    for (const item of invoice.items) {
      if (item.account_id) {
        const expAccount = d.prepare('SELECT name FROM accounts WHERE id = ?').get(item.account_id);
        d.prepare('INSERT INTO voucher_items (voucher_id, account_id, account_name, debit, credit) VALUES (?, ?, ?, ?, ?)')
          .run(voucherId, item.account_id, expAccount ? expAccount.name : 'Expense', item.total, 0);
        updateAccountBalance(item.account_id);
      }
    }

    if (invoice.tax_amount > 0 && taxAccount) {
      d.prepare('INSERT INTO voucher_items (voucher_id, account_id, account_name, debit, credit) VALUES (?, ?, ?, ?, ?)')
        .run(voucherId, taxAccount.id, 'Input Tax (GST)', invoice.tax_amount, 0);
      updateAccountBalance(taxAccount.id);
    }

    if (apAccount) {
      d.prepare('INSERT INTO voucher_items (voucher_id, account_id, account_name, debit, credit) VALUES (?, ?, ?, ?, ?)')
        .run(voucherId, apAccount.id, 'Accounts Payable', 0, invoice.total_amount);
      updateAccountBalance(apAccount.id);
    }

    const invResult = d.prepare(`
      INSERT INTO purchase_invoices (invoice_number, supplier_invoice_no, date, due_date, supplier_id, supplier_name, subtotal, discount_amount, tax_amount, tax_percent, total_amount, paid_amount, balance_due, payment_status, notes, user_id, voucher_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'unpaid', ?, ?, ?)
    `).run(invoice.invoice_number, invoice.supplier_invoice_no || null, invoice.date, invoice.due_date || null, invoice.supplier_id || null, invoice.supplier_name, invoice.subtotal, invoice.discount_amount || 0, invoice.tax_amount || 0, invoice.tax_percent || 0, invoice.total_amount, invoice.total_amount, invoice.notes || null, invoice.user_id || null, voucherId);
    const invoiceId = invResult.lastInsertRowid;

    for (const item of invoice.items) {
      d.prepare(`INSERT INTO purchase_invoice_items (invoice_id, product_name, description, quantity, unit, unit_price, tax_percent, tax_amount, total, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(invoiceId, item.product_name, item.description || null, item.quantity, item.unit || 'pcs', item.unit_price, item.tax_percent || 0, item.tax_amount || 0, item.total, item.account_id || null);
    }

    if (invoice.supplier_id) {
      d.prepare('UPDATE suppliers SET current_balance = current_balance + ? WHERE id = ?').run(invoice.total_amount, invoice.supplier_id);
    }

    return invoiceId;
  })();
  return { success: true, id: result };
});

ipcMain.handle('purchases:update', (_, id, invoice) => {
  const d = db();
  d.transaction(() => {
    const old = d.prepare('SELECT * FROM purchase_invoices WHERE id = ?').get(id);
    if (old && old.supplier_id) {
      d.prepare('UPDATE suppliers SET current_balance = current_balance - ? WHERE id = ?').run(old.total_amount, old.supplier_id);
    }
    d.prepare(`
      UPDATE purchase_invoices SET date = ?, due_date = ?, supplier_id = ?, supplier_name = ?, subtotal = ?,
      discount_amount = ?, tax_amount = ?, tax_percent = ?, total_amount = ?, balance_due = total_amount - paid_amount,
      notes = ? WHERE id = ?
    `).run(invoice.date, invoice.due_date || null, invoice.supplier_id || null, invoice.supplier_name, invoice.subtotal, invoice.discount_amount || 0, invoice.tax_amount || 0, invoice.tax_percent || 0, invoice.total_amount, invoice.notes || null, id);
    d.prepare('DELETE FROM purchase_invoice_items WHERE invoice_id = ?').run(id);
    for (const item of invoice.items) {
      d.prepare(`INSERT INTO purchase_invoice_items (invoice_id, product_name, description, quantity, unit, unit_price, tax_percent, tax_amount, total, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, item.product_name, item.description || null, item.quantity, item.unit || 'pcs', item.unit_price, item.tax_percent || 0, item.tax_amount || 0, item.total, item.account_id || null);
    }
    if (invoice.supplier_id) {
      d.prepare('UPDATE suppliers SET current_balance = current_balance + ? WHERE id = ?').run(invoice.total_amount, invoice.supplier_id);
    }
  })();
  return { success: true };
});

ipcMain.handle('purchases:delete', (_, id) => {
  const d = db();
  d.transaction(() => {
    const invoice = d.prepare('SELECT * FROM purchase_invoices WHERE id = ?').get(id);
    if (invoice) {
      if (invoice.supplier_id) {
        d.prepare('UPDATE suppliers SET current_balance = current_balance - ? WHERE id = ?').run(invoice.balance_due, invoice.supplier_id);
      }
      if (invoice.voucher_id) {
        const items = d.prepare('SELECT account_id FROM voucher_items WHERE voucher_id = ?').all(invoice.voucher_id);
        d.prepare('DELETE FROM vouchers WHERE id = ?').run(invoice.voucher_id);
        for (const item of items) updateAccountBalance(item.account_id);
      }
    }
    d.prepare('DELETE FROM purchase_invoices WHERE id = ?').run(id);
  })();
  return { success: true };
});

ipcMain.handle('purchases:recordPayment', (_, invoiceId, payment) => {
  const d = db();
  d.transaction(() => {
    const invoice = d.prepare('SELECT * FROM purchase_invoices WHERE id = ?').get(invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const paymentAccount = d.prepare('SELECT * FROM accounts WHERE id = ?').get(payment.account_id);
    const apAccount = d.prepare("SELECT id FROM accounts WHERE code = '2101'").get();

    const voucherNum = getNextVoucherNum('payment');
    const vr = d.prepare(`
      INSERT INTO vouchers (voucher_number, voucher_type, date, narration, total_debit, total_credit, user_id)
      VALUES (?, 'payment', ?, ?, ?, ?, ?)
    `).run(voucherNum, payment.date, `Payment to ${invoice.supplier_name} for Invoice ${invoice.invoice_number}`, payment.amount, payment.amount, payment.user_id || null);
    const voucherId = vr.lastInsertRowid;

    if (apAccount) {
      d.prepare('INSERT INTO voucher_items (voucher_id, account_id, account_name, debit, credit) VALUES (?, ?, ?, ?, ?)')
        .run(voucherId, apAccount.id, 'Accounts Payable', payment.amount, 0);
      updateAccountBalance(apAccount.id);
    }
    d.prepare('INSERT INTO voucher_items (voucher_id, account_id, account_name, debit, credit) VALUES (?, ?, ?, ?, ?)')
      .run(voucherId, payment.account_id, paymentAccount ? paymentAccount.name : 'Cash/Bank', 0, payment.amount);
    updateAccountBalance(payment.account_id);

    const newPaid = invoice.paid_amount + payment.amount;
    const newBalance = invoice.total_amount - newPaid;
    const status = newBalance <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
    d.prepare('UPDATE purchase_invoices SET paid_amount = ?, balance_due = ?, payment_status = ? WHERE id = ?').run(newPaid, newBalance, status, invoiceId);

    if (invoice.supplier_id) {
      d.prepare('UPDATE suppliers SET current_balance = current_balance - ? WHERE id = ?').run(payment.amount, invoice.supplier_id);
    }
  })();
  return { success: true };
});

// ─── Expenses ─────────────────────────────────────────────────────────────────
ipcMain.handle('expenses:getAll', (_, filters = {}) => {
  let query = 'SELECT e.*, a.name as payment_account_name FROM expenses e LEFT JOIN accounts a ON e.payment_account_id = a.id WHERE 1=1';
  const params = [];
  if (filters.from) { query += ' AND e.date >= ?'; params.push(filters.from); }
  if (filters.to) { query += ' AND e.date <= ?'; params.push(filters.to); }
  if (filters.account_id) { query += ' AND e.account_id = ?'; params.push(filters.account_id); }
  if (filters.search) { query += ' AND (e.expense_number LIKE ? OR e.description LIKE ? OR e.account_name LIKE ?)'; params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`); }
  query += ' ORDER BY e.date DESC, e.id DESC';
  return db().prepare(query).all(...params);
});

ipcMain.handle('expenses:getById', (_, id) => {
  return db().prepare('SELECT * FROM expenses WHERE id = ?').get(id);
});

ipcMain.handle('expenses:create', (_, expense) => {
  const d = db();
  const result = d.transaction(() => {
    const expAccount = d.prepare('SELECT * FROM accounts WHERE id = ?').get(expense.account_id);
    const payAccount = d.prepare('SELECT * FROM accounts WHERE id = ?').get(expense.payment_account_id);

    const prefixRow = d.prepare("SELECT value FROM settings WHERE key = 'expense_prefix'").get();
    const prefix = prefixRow ? prefixRow.value : 'EXP';
    const year = new Date().getFullYear();
    const pattern = `${prefix}-${year}-%`;
    const lastExp = d.prepare(`SELECT expense_number FROM expenses WHERE expense_number LIKE ? ORDER BY id DESC LIMIT 1`).get(pattern);
    let expNumber;
    if (!lastExp) {
      expNumber = `${prefix}-${year}-001`;
    } else {
      const parts = lastExp.expense_number.split('-');
      const seq = parseInt(parts[parts.length - 1]) + 1;
      expNumber = `${prefix}-${year}-${String(seq).padStart(3, '0')}`;
    }

    const voucherNum = getNextVoucherNum('payment');
    const vr = d.prepare(`
      INSERT INTO vouchers (voucher_number, voucher_type, date, narration, total_debit, total_credit, user_id)
      VALUES (?, 'payment', ?, ?, ?, ?, ?)
    `).run(voucherNum, expense.date, expense.description || `Expense: ${expAccount ? expAccount.name : ''}`, expense.amount, expense.amount, expense.user_id || null);
    const voucherId = vr.lastInsertRowid;

    d.prepare('INSERT INTO voucher_items (voucher_id, account_id, account_name, debit, credit) VALUES (?, ?, ?, ?, ?)')
      .run(voucherId, expense.account_id, expAccount ? expAccount.name : 'Expense', expense.amount, 0);
    d.prepare('INSERT INTO voucher_items (voucher_id, account_id, account_name, debit, credit) VALUES (?, ?, ?, ?, ?)')
      .run(voucherId, expense.payment_account_id, payAccount ? payAccount.name : 'Cash', 0, expense.amount);
    updateAccountBalance(expense.account_id);
    updateAccountBalance(expense.payment_account_id);

    const expResult = d.prepare(`
      INSERT INTO expenses (expense_number, date, account_id, account_name, payment_account_id, amount, tax_amount, description, reference, voucher_id, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(expNumber, expense.date, expense.account_id, expAccount ? expAccount.name : '', expense.payment_account_id, expense.amount, expense.tax_amount || 0, expense.description || null, expense.reference || null, voucherId, expense.user_id || null);
    return expResult.lastInsertRowid;
  })();
  return { success: true, id: result };
});

ipcMain.handle('expenses:update', (_, id, expense) => {
  db().prepare(`
    UPDATE expenses SET date = ?, account_id = ?, account_name = ?, payment_account_id = ?, amount = ?,
    tax_amount = ?, description = ?, reference = ? WHERE id = ?
  `).run(expense.date, expense.account_id, expense.account_name, expense.payment_account_id, expense.amount, expense.tax_amount || 0, expense.description || null, expense.reference || null, id);
  return { success: true };
});

ipcMain.handle('expenses:delete', (_, id) => {
  const d = db();
  d.transaction(() => {
    const exp = d.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    if (exp && exp.voucher_id) {
      const items = d.prepare('SELECT account_id FROM voucher_items WHERE voucher_id = ?').all(exp.voucher_id);
      d.prepare('DELETE FROM vouchers WHERE id = ?').run(exp.voucher_id);
      for (const item of items) updateAccountBalance(item.account_id);
    }
    d.prepare('DELETE FROM expenses WHERE id = ?').run(id);
  })();
  return { success: true };
});

// ─── Bank & Cash ──────────────────────────────────────────────────────────────
ipcMain.handle('bank:getAccounts', () => {
  return db().prepare("SELECT * FROM accounts WHERE (is_bank = 1 OR is_cash = 1) AND is_active = 1 ORDER BY code").all();
});

ipcMain.handle('bank:getTransactions', (_, accountId, from, to) => {
  let query = `
    SELECT vi.*, v.date, v.voucher_number, v.voucher_type, v.narration as voucher_narration
    FROM voucher_items vi
    JOIN vouchers v ON vi.voucher_id = v.id
    WHERE vi.account_id = ?
  `;
  const params = [accountId];
  if (from) { query += ' AND v.date >= ?'; params.push(from); }
  if (to) { query += ' AND v.date <= ?'; params.push(to); }
  query += ' ORDER BY v.date, v.id';
  const items = db().prepare(query).all(...params);
  const account = db().prepare('SELECT * FROM accounts WHERE id = ?').get(accountId);
  let running = account ? (account.opening_balance || 0) : 0;
  return items.map(item => {
    running += item.debit - item.credit;
    return { ...item, balance: running };
  });
});

// ─── Payroll ──────────────────────────────────────────────────────────────────
ipcMain.handle('payroll:getEmployees', () => {
  return db().prepare('SELECT * FROM employees WHERE is_active = 1 ORDER BY name').all();
});

ipcMain.handle('payroll:getEmployeeById', (_, id) => {
  return db().prepare('SELECT * FROM employees WHERE id = ?').get(id);
});

ipcMain.handle('payroll:createEmployee', (_, emp) => {
  const code = emp.code || `EMP${String(db().prepare('SELECT COUNT(*)+1 as n FROM employees').get().n).padStart(3, '0')}`;
  const result = db().prepare(`
    INSERT INTO employees (code, name, designation, department, cnic, phone, join_date, basic_salary, allowances)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(code, emp.name, emp.designation || null, emp.department || null, emp.cnic || null, emp.phone || null, emp.join_date || null, emp.basic_salary, emp.allowances || 0);
  return { success: true, id: result.lastInsertRowid };
});

ipcMain.handle('payroll:updateEmployee', (_, id, emp) => {
  db().prepare(`
    UPDATE employees SET name = ?, designation = ?, department = ?, cnic = ?, phone = ?,
    join_date = ?, basic_salary = ?, allowances = ? WHERE id = ?
  `).run(emp.name, emp.designation || null, emp.department || null, emp.cnic || null, emp.phone || null, emp.join_date || null, emp.basic_salary, emp.allowances || 0, id);
  return { success: true };
});

ipcMain.handle('payroll:deleteEmployee', (_, id) => {
  db().prepare('UPDATE employees SET is_active = 0 WHERE id = ?').run(id);
  return { success: true };
});

ipcMain.handle('payroll:getList', (_, month, year) => {
  return db().prepare('SELECT * FROM payroll WHERE month = ? AND year = ? ORDER BY employee_name').all(month, year);
});

ipcMain.handle('payroll:process', (_, month, year) => {
  const d = db();
  return d.transaction(() => {
    const existing = d.prepare('SELECT employee_id FROM payroll WHERE month = ? AND year = ?').all(month, year);
    const existingIds = new Set(existing.map(e => e.employee_id));
    const employees = d.prepare('SELECT * FROM employees WHERE is_active = 1').all();
    const results = [];
    for (const emp of employees) {
      if (existingIds.has(emp.id)) continue;
      const gross = emp.basic_salary + (emp.allowances || 0);
      const net = gross;
      const pNum = `PR-${year}-${String(month).padStart(2, '0')}-${String(emp.id).padStart(3, '0')}`;
      const result = d.prepare(`
        INSERT INTO payroll (payroll_number, month, year, employee_id, employee_name, basic_salary, allowances, gross_salary, net_salary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(pNum, month, year, emp.id, emp.name, emp.basic_salary, emp.allowances || 0, gross, net);
      results.push(result.lastInsertRowid);
    }
    return { success: true, count: results.length };
  })();
});

ipcMain.handle('payroll:pay', (_, payrollId, paymentData) => {
  const d = db();
  d.transaction(() => {
    const payroll = d.prepare('SELECT * FROM payroll WHERE id = ?').get(payrollId);
    if (!payroll) throw new Error('Payroll record not found');

    const salaryExpAccount = d.prepare("SELECT id FROM accounts WHERE code = '5201'").get();
    const payAccount = d.prepare('SELECT * FROM accounts WHERE id = ?').get(paymentData.account_id);

    const voucherNum = getNextVoucherNum('payment');
    const vr = d.prepare(`
      INSERT INTO vouchers (voucher_number, voucher_type, date, narration, total_debit, total_credit, user_id)
      VALUES (?, 'payment', ?, ?, ?, ?, ?)
    `).run(voucherNum, paymentData.date, `Salary payment for ${payroll.employee_name} - ${payroll.month}/${payroll.year}`, payroll.net_salary, payroll.net_salary, paymentData.user_id || null);
    const voucherId = vr.lastInsertRowid;

    if (salaryExpAccount) {
      d.prepare('INSERT INTO voucher_items (voucher_id, account_id, account_name, debit, credit) VALUES (?, ?, ?, ?, ?)')
        .run(voucherId, salaryExpAccount.id, 'Salaries & Wages', payroll.gross_salary, 0);
      updateAccountBalance(salaryExpAccount.id);
    }
    d.prepare('INSERT INTO voucher_items (voucher_id, account_id, account_name, debit, credit) VALUES (?, ?, ?, ?, ?)')
      .run(voucherId, paymentData.account_id, payAccount ? payAccount.name : 'Cash', 0, payroll.net_salary);
    updateAccountBalance(paymentData.account_id);

    d.prepare('UPDATE payroll SET payment_status = ?, payment_date = ?, voucher_id = ? WHERE id = ?').run('paid', paymentData.date, voucherId, payrollId);
  })();
  return { success: true };
});

ipcMain.handle('payroll:payAll', (_, month, year, paymentData) => {
  const d = db();
  const pending = d.prepare("SELECT * FROM payroll WHERE month = ? AND year = ? AND payment_status = 'pending'").all(month, year);
  for (const p of pending) {
    ipcMain.emit('payroll:pay', null, p.id, paymentData);
  }
  return { success: true, count: pending.length };
});

// ─── Tax ──────────────────────────────────────────────────────────────────────
ipcMain.handle('tax:getAll', () => {
  return db().prepare('SELECT * FROM tax_records ORDER BY period_from DESC').all();
});

ipcMain.handle('tax:create', (_, record) => {
  const result = db().prepare(`
    INSERT INTO tax_records (tax_type, period_from, period_to, taxable_amount, tax_rate, tax_amount, paid_amount, due_date, status, reference, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(record.tax_type, record.period_from, record.period_to, record.taxable_amount, record.tax_rate, record.tax_amount, record.paid_amount || 0, record.due_date || null, record.status || 'pending', record.reference || null, record.notes || null);
  return { success: true, id: result.lastInsertRowid };
});

ipcMain.handle('tax:update', (_, id, record) => {
  db().prepare(`
    UPDATE tax_records SET tax_type = ?, period_from = ?, period_to = ?, taxable_amount = ?, tax_rate = ?,
    tax_amount = ?, paid_amount = ?, due_date = ?, status = ?, reference = ?, notes = ? WHERE id = ?
  `).run(record.tax_type, record.period_from, record.period_to, record.taxable_amount, record.tax_rate, record.tax_amount, record.paid_amount || 0, record.due_date || null, record.status || 'pending', record.reference || null, record.notes || null, id);
  return { success: true };
});

ipcMain.handle('tax:delete', (_, id) => {
  db().prepare('DELETE FROM tax_records WHERE id = ?').run(id);
  return { success: true };
});

ipcMain.handle('tax:getSummary', (_, from, to) => {
  const d = db();
  const outputTax = d.prepare(`
    SELECT COALESCE(SUM(tax_amount), 0) as total FROM sales_invoices WHERE date >= ? AND date <= ?
  `).get(from, to);
  const inputTax = d.prepare(`
    SELECT COALESCE(SUM(tax_amount), 0) as total FROM purchase_invoices WHERE date >= ? AND date <= ?
  `).get(from, to);
  const taxableSales = d.prepare(`
    SELECT COALESCE(SUM(subtotal), 0) as total FROM sales_invoices WHERE date >= ? AND date <= ? AND tax_amount > 0
  `).get(from, to);
  const taxablePurchases = d.prepare(`
    SELECT COALESCE(SUM(subtotal), 0) as total FROM purchase_invoices WHERE date >= ? AND date <= ? AND tax_amount > 0
  `).get(from, to);
  return {
    output_tax: outputTax.total,
    input_tax: inputTax.total,
    net_tax_payable: outputTax.total - inputTax.total,
    taxable_sales: taxableSales.total,
    taxable_purchases: taxablePurchases.total,
  };
});

// ─── Reports ──────────────────────────────────────────────────────────────────
ipcMain.handle('reports:trialBalance', (_, date) => {
  const d = db();
  const accounts = d.prepare("SELECT * FROM accounts WHERE sub_type != 'group' ORDER BY code").all();
  const result = accounts.map(acc => {
    const totals = d.prepare(`
      SELECT COALESCE(SUM(vi.debit),0) as total_debit, COALESCE(SUM(vi.credit),0) as total_credit
      FROM voucher_items vi JOIN vouchers v ON vi.voucher_id = v.id
      WHERE vi.account_id = ? AND v.date <= ?
    `).get(acc.id, date || new Date().toISOString().split('T')[0]);
    const isDebit = ['asset', 'expense'].includes(acc.type);
    const balance = (acc.opening_balance || 0) + (isDebit ? totals.total_debit - totals.total_credit : totals.total_credit - totals.total_debit);
    return {
      ...acc,
      debit_total: isDebit && balance > 0 ? balance : 0,
      credit_total: !isDebit && balance > 0 ? balance : (balance < 0 ? Math.abs(balance) : 0),
      balance,
    };
  }).filter(a => a.debit_total > 0 || a.credit_total > 0 || a.opening_balance !== 0);
  return result;
});

ipcMain.handle('reports:profitLoss', (_, from, to) => {
  const d = db();
  const revenue = d.prepare(`
    SELECT COALESCE(SUM(vi.credit - vi.debit), 0) as total
    FROM voucher_items vi JOIN vouchers v ON vi.voucher_id = v.id
    JOIN accounts a ON vi.account_id = a.id
    WHERE a.type = 'income' AND v.date >= ? AND v.date <= ?
  `).get(from, to);
  const cogs = d.prepare(`
    SELECT COALESCE(SUM(vi.debit - vi.credit), 0) as total
    FROM voucher_items vi JOIN vouchers v ON vi.voucher_id = v.id
    JOIN accounts a ON vi.account_id = a.id
    WHERE a.sub_type = 'cogs' AND v.date >= ? AND v.date <= ?
  `).get(from, to);
  const expenses = d.prepare(`
    SELECT a.code, a.name, COALESCE(SUM(vi.debit - vi.credit), 0) as total
    FROM voucher_items vi JOIN vouchers v ON vi.voucher_id = v.id
    JOIN accounts a ON vi.account_id = a.id
    WHERE a.type = 'expense' AND a.sub_type != 'cogs' AND a.sub_type != 'group' AND v.date >= ? AND v.date <= ?
    GROUP BY a.id ORDER BY a.code
  `).all(from, to);
  const totalExpenses = expenses.reduce((s, e) => s + e.total, 0);
  const grossProfit = revenue.total - cogs.total;
  const netProfit = grossProfit - totalExpenses;
  return { revenue: revenue.total, cogs: cogs.total, gross_profit: grossProfit, expenses, total_expenses: totalExpenses, net_profit: netProfit };
});

ipcMain.handle('reports:balanceSheet', (_, date) => {
  const d = db();
  const asOfDate = date || new Date().toISOString().split('T')[0];
  const getBalance = (type, subType) => {
    const accounts = d.prepare(`SELECT * FROM accounts WHERE type = ? AND (sub_type = ? OR sub_type != 'group') ORDER BY code`).all(type, subType || '');
    return accounts;
  };
  const calcBalance = (acc) => {
    const totals = d.prepare(`
      SELECT COALESCE(SUM(vi.debit),0) as td, COALESCE(SUM(vi.credit),0) as tc
      FROM voucher_items vi JOIN vouchers v ON vi.voucher_id = v.id
      WHERE vi.account_id = ? AND v.date <= ?
    `).get(acc.id, asOfDate);
    const isDebit = ['asset', 'expense'].includes(acc.type);
    return (acc.opening_balance || 0) + (isDebit ? totals.td - totals.tc : totals.tc - totals.td);
  };

  const assetAccounts = d.prepare("SELECT * FROM accounts WHERE type = 'asset' AND sub_type != 'group' ORDER BY code").all();
  const liabAccounts = d.prepare("SELECT * FROM accounts WHERE type = 'liability' AND sub_type != 'group' ORDER BY code").all();
  const equityAccounts = d.prepare("SELECT * FROM accounts WHERE type = 'equity' AND sub_type != 'group' ORDER BY code").all();

  const incomeAccounts = d.prepare(`
    SELECT COALESCE(SUM(vi.credit - vi.debit), 0) as total
    FROM voucher_items vi JOIN vouchers v ON vi.voucher_id = v.id
    JOIN accounts a ON vi.account_id = a.id
    WHERE a.type = 'income' AND v.date <= ?
  `).get(asOfDate);
  const expenseAccounts = d.prepare(`
    SELECT COALESCE(SUM(vi.debit - vi.credit), 0) as total
    FROM voucher_items vi JOIN vouchers v ON vi.voucher_id = v.id
    JOIN accounts a ON vi.account_id = a.id
    WHERE a.type = 'expense' AND v.date <= ?
  `).get(asOfDate);
  const retainedEarnings = incomeAccounts.total - expenseAccounts.total;

  const assets = assetAccounts.map(a => ({ ...a, balance: calcBalance(a) })).filter(a => a.balance !== 0);
  const liabilities = liabAccounts.map(a => ({ ...a, balance: calcBalance(a) })).filter(a => a.balance !== 0);
  const equity = equityAccounts.map(a => ({ ...a, balance: calcBalance(a) })).filter(a => a.balance !== 0);

  return {
    assets,
    liabilities,
    equity,
    retained_earnings: retainedEarnings,
    total_assets: assets.reduce((s, a) => s + a.balance, 0),
    total_liabilities: liabilities.reduce((s, a) => s + a.balance, 0),
    total_equity: equity.reduce((s, a) => s + a.balance, 0) + retainedEarnings,
  };
});

ipcMain.handle('reports:cashFlow', (_, from, to) => {
  const d = db();
  const cashAccounts = d.prepare("SELECT id FROM accounts WHERE is_cash = 1 OR is_bank = 1").all().map(a => a.id);
  if (cashAccounts.length === 0) return { inflows: [], outflows: [], net_change: 0 };

  const placeholders = cashAccounts.map(() => '?').join(',');
  const inflows = d.prepare(`
    SELECT v.date, v.narration, vi.debit as amount
    FROM voucher_items vi JOIN vouchers v ON vi.voucher_id = v.id
    WHERE vi.account_id IN (${placeholders}) AND vi.debit > 0 AND v.date >= ? AND v.date <= ?
    ORDER BY v.date
  `).all(...cashAccounts, from, to);
  const outflows = d.prepare(`
    SELECT v.date, v.narration, vi.credit as amount
    FROM voucher_items vi JOIN vouchers v ON vi.voucher_id = v.id
    WHERE vi.account_id IN (${placeholders}) AND vi.credit > 0 AND v.date >= ? AND v.date <= ?
    ORDER BY v.date
  `).all(...cashAccounts, from, to);

  const totalIn = inflows.reduce((s, i) => s + i.amount, 0);
  const totalOut = outflows.reduce((s, i) => s + i.amount, 0);
  return { inflows, outflows, total_inflows: totalIn, total_outflows: totalOut, net_change: totalIn - totalOut };
});

ipcMain.handle('reports:sales', (_, from, to) => {
  const d = db();
  const invoices = d.prepare(`
    SELECT si.*, c.phone, c.ntn FROM sales_invoices si LEFT JOIN customers c ON si.customer_id = c.id
    WHERE si.date >= ? AND si.date <= ? ORDER BY si.date DESC
  `).all(from, to);
  const totals = d.prepare(`
    SELECT COALESCE(SUM(total_amount),0) as total, COALESCE(SUM(tax_amount),0) as tax,
    COALESCE(SUM(discount_amount),0) as discount, COALESCE(SUM(paid_amount),0) as paid,
    COALESCE(SUM(balance_due),0) as balance FROM sales_invoices WHERE date >= ? AND date <= ?
  `).get(from, to);
  return { invoices, totals };
});

ipcMain.handle('reports:purchases', (_, from, to) => {
  const d = db();
  const invoices = d.prepare(`
    SELECT pi.*, s.phone FROM purchase_invoices pi LEFT JOIN suppliers s ON pi.supplier_id = s.id
    WHERE pi.date >= ? AND pi.date <= ? ORDER BY pi.date DESC
  `).all(from, to);
  const totals = d.prepare(`
    SELECT COALESCE(SUM(total_amount),0) as total, COALESCE(SUM(tax_amount),0) as tax,
    COALESCE(SUM(paid_amount),0) as paid, COALESCE(SUM(balance_due),0) as balance
    FROM purchase_invoices WHERE date >= ? AND date <= ?
  `).get(from, to);
  return { invoices, totals };
});

ipcMain.handle('reports:expenses', (_, from, to) => {
  const d = db();
  const expenses = d.prepare('SELECT * FROM expenses WHERE date >= ? AND date <= ? ORDER BY date DESC').all(from, to);
  const byCategory = d.prepare(`
    SELECT account_name, COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ? AND date <= ? GROUP BY account_name ORDER BY total DESC
  `).all(from, to);
  const totalAmount = d.prepare('SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE date >= ? AND date <= ?').get(from, to);
  return { expenses, by_category: byCategory, total: totalAmount.total };
});

ipcMain.handle('reports:arAging', () => {
  const d = db();
  const today = new Date().toISOString().split('T')[0];
  const invoices = d.prepare(`
    SELECT si.*, c.phone, c.email FROM sales_invoices si
    LEFT JOIN customers c ON si.customer_id = c.id
    WHERE si.payment_status != 'paid' ORDER BY si.date
  `).all();
  return invoices.map(inv => {
    const daysOverdue = Math.floor((new Date(today) - new Date(inv.date)) / (1000 * 60 * 60 * 24));
    let bucket = '0-30';
    if (daysOverdue > 90) bucket = '90+';
    else if (daysOverdue > 60) bucket = '61-90';
    else if (daysOverdue > 30) bucket = '31-60';
    return { ...inv, days_overdue: daysOverdue, bucket };
  });
});

ipcMain.handle('reports:apAging', () => {
  const d = db();
  const today = new Date().toISOString().split('T')[0];
  const invoices = d.prepare(`
    SELECT pi.*, s.phone FROM purchase_invoices pi
    LEFT JOIN suppliers s ON pi.supplier_id = s.id
    WHERE pi.payment_status != 'paid' ORDER BY pi.date
  `).all();
  return invoices.map(inv => {
    const daysOverdue = Math.floor((new Date(today) - new Date(inv.date)) / (1000 * 60 * 60 * 24));
    let bucket = '0-30';
    if (daysOverdue > 90) bucket = '90+';
    else if (daysOverdue > 60) bucket = '61-90';
    else if (daysOverdue > 30) bucket = '31-60';
    return { ...inv, days_overdue: daysOverdue, bucket };
  });
});

ipcMain.handle('reports:payroll', (_, month, year) => {
  const d = db();
  const records = d.prepare('SELECT * FROM payroll WHERE month = ? AND year = ? ORDER BY employee_name').all(month, year);
  const totals = d.prepare(`
    SELECT COALESCE(SUM(gross_salary),0) as gross, COALESCE(SUM(net_salary),0) as net,
    COALESCE(SUM(income_tax),0) as tax, COALESCE(SUM(other_deductions),0) as deductions
    FROM payroll WHERE month = ? AND year = ?
  `).get(month, year);
  return { records, totals };
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
ipcMain.handle('dashboard:getData', () => {
  const d = db();
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = now.toISOString().split('T')[0];

  const revenue = d.prepare(`SELECT COALESCE(SUM(total_amount),0) as total FROM sales_invoices WHERE date >= ? AND date <= ?`).get(monthStart, today);
  const purchases = d.prepare(`SELECT COALESCE(SUM(total_amount),0) as total FROM purchase_invoices WHERE date >= ? AND date <= ?`).get(monthStart, today);
  const expenses = d.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE date >= ? AND date <= ?`).get(monthStart, today);
  const totalExpenses = purchases.total + expenses.total;
  const netProfit = revenue.total - totalExpenses;

  const cashBankAccounts = d.prepare("SELECT id FROM accounts WHERE is_cash = 1 OR is_bank = 1").all();
  let cashBankBalance = 0;
  for (const acc of cashBankAccounts) {
    const a = d.prepare('SELECT balance, opening_balance FROM accounts WHERE id = ?').get(acc.id);
    cashBankBalance += a ? a.balance : 0;
  }

  const receivables = d.prepare("SELECT COALESCE(SUM(balance_due),0) as total FROM sales_invoices WHERE payment_status != 'paid'").get();
  const payables = d.prepare("SELECT COALESCE(SUM(balance_due),0) as total FROM purchase_invoices WHERE payment_status != 'paid'").get();
  const overdue = d.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(balance_due),0) as amount FROM sales_invoices WHERE payment_status != 'paid' AND due_date < ?`).get(today);
  const pendingSalary = d.prepare(`SELECT COALESCE(SUM(net_salary),0) as total FROM payroll WHERE month = ? AND year = ? AND payment_status = 'pending'`).get(now.getMonth() + 1, now.getFullYear());

  // Monthly bar chart (6 months)
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const d2 = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStart = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}-01`;
    const mEnd = new Date(d2.getFullYear(), d2.getMonth() + 1, 0).toISOString().split('T')[0];
    const mRev = db().prepare(`SELECT COALESCE(SUM(total_amount),0) as total FROM sales_invoices WHERE date >= ? AND date <= ?`).get(mStart, mEnd);
    const mExp = db().prepare(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE date >= ? AND date <= ?`).get(mStart, mEnd);
    const mPurch = db().prepare(`SELECT COALESCE(SUM(total_amount),0) as total FROM purchase_invoices WHERE date >= ? AND date <= ?`).get(mStart, mEnd);
    const monthName = d2.toLocaleString('default', { month: 'short' });
    monthlyData.push({ month: monthName, income: mRev.total, expense: mExp.total + mPurch.total });
  }

  // Expense breakdown
  const expBreakdown = d.prepare(`
    SELECT account_name, COALESCE(SUM(amount),0) as value FROM expenses
    WHERE date >= ? AND date <= ? GROUP BY account_name ORDER BY value DESC LIMIT 6
  `).all(monthStart, today);

  // Recent sales
  const recentSales = d.prepare('SELECT * FROM sales_invoices ORDER BY id DESC LIMIT 5').all();

  // Upcoming due invoices
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const upcoming = d.prepare(`SELECT * FROM sales_invoices WHERE payment_status != 'paid' AND due_date >= ? AND due_date <= ? ORDER BY due_date`).all(today, sevenDays);

  return {
    kpis: {
      revenue: revenue.total,
      expenses: totalExpenses,
      net_profit: netProfit,
      cash_bank: cashBankBalance,
      receivables: receivables.total,
      payables: payables.total,
      overdue_count: overdue.count,
      overdue_amount: overdue.amount,
      pending_salary: pendingSalary.total,
    },
    monthly_data: monthlyData,
    expense_breakdown: expBreakdown,
    recent_sales: recentSales,
    upcoming_due: upcoming,
  };
});

// ─── Backup ───────────────────────────────────────────────────────────────────
ipcMain.handle('backup:export', async () => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Backup',
    defaultPath: `accountpro_backup_${new Date().toISOString().split('T')[0]}.db`,
    filters: [{ name: 'Database', extensions: ['db'] }],
  });
  if (!filePath) return { success: false, message: 'Cancelled' };
  const { app: electronApp } = require('electron');
  const srcPath = require('path').join(electronApp.getPath('userData'), 'accountpro.db');
  fs.copyFileSync(srcPath, filePath);
  return { success: true, path: filePath };
});

ipcMain.handle('backup:import', async (_, filePath) => {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'accountpro.db');
  fs.copyFileSync(filePath, dbPath);
  return { success: true };
});

ipcMain.handle('dialog:selectFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'Database', extensions: ['db'] }],
    properties: ['openFile'],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('dialog:selectSavePath', async (_, defaultName) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [{ name: 'PDF', extensions: ['pdf'] }, { name: 'Excel', extensions: ['xlsx'] }],
  });
  return filePath || null;
});
