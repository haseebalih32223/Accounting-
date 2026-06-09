function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'accountant',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      sub_type TEXT,
      parent_id INTEGER REFERENCES accounts(id),
      is_bank INTEGER DEFAULT 0,
      is_cash INTEGER DEFAULT 0,
      opening_balance REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      is_system INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      ntn TEXT,
      strn TEXT,
      credit_limit REAL DEFAULT 0,
      opening_balance REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      ntn TEXT,
      strn TEXT,
      opening_balance REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vouchers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_number TEXT UNIQUE NOT NULL,
      voucher_type TEXT NOT NULL,
      date DATE NOT NULL,
      reference TEXT,
      narration TEXT,
      total_debit REAL NOT NULL,
      total_credit REAL NOT NULL,
      is_posted INTEGER DEFAULT 1,
      user_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS voucher_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id INTEGER REFERENCES vouchers(id) ON DELETE CASCADE,
      account_id INTEGER REFERENCES accounts(id),
      account_name TEXT NOT NULL,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      narration TEXT
    );

    CREATE TABLE IF NOT EXISTS sales_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      date DATE NOT NULL,
      due_date DATE,
      customer_id INTEGER REFERENCES customers(id),
      customer_name TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      discount_percent REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      tax_percent REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      balance_due REAL NOT NULL,
      payment_status TEXT DEFAULT 'unpaid',
      notes TEXT,
      user_id INTEGER REFERENCES users(id),
      voucher_id INTEGER REFERENCES vouchers(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales_invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER REFERENCES sales_invoices(id) ON DELETE CASCADE,
      product_name TEXT NOT NULL,
      description TEXT,
      quantity REAL NOT NULL,
      unit TEXT DEFAULT 'pcs',
      unit_price REAL NOT NULL,
      discount REAL DEFAULT 0,
      tax_percent REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      supplier_invoice_no TEXT,
      date DATE NOT NULL,
      due_date DATE,
      supplier_id INTEGER REFERENCES suppliers(id),
      supplier_name TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      tax_percent REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      balance_due REAL NOT NULL,
      payment_status TEXT DEFAULT 'unpaid',
      notes TEXT,
      user_id INTEGER REFERENCES users(id),
      voucher_id INTEGER REFERENCES vouchers(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchase_invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER REFERENCES purchase_invoices(id) ON DELETE CASCADE,
      product_name TEXT NOT NULL,
      description TEXT,
      quantity REAL NOT NULL,
      unit TEXT DEFAULT 'pcs',
      unit_price REAL NOT NULL,
      tax_percent REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total REAL NOT NULL,
      account_id INTEGER REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_number TEXT UNIQUE NOT NULL,
      date DATE NOT NULL,
      account_id INTEGER REFERENCES accounts(id),
      account_name TEXT NOT NULL,
      payment_account_id INTEGER REFERENCES accounts(id),
      amount REAL NOT NULL,
      tax_amount REAL DEFAULT 0,
      description TEXT,
      reference TEXT,
      voucher_id INTEGER REFERENCES vouchers(id),
      user_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bank_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL,
      account_id INTEGER REFERENCES accounts(id),
      transaction_type TEXT NOT NULL,
      amount REAL NOT NULL,
      reference TEXT,
      description TEXT,
      voucher_id INTEGER REFERENCES vouchers(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      name TEXT NOT NULL,
      designation TEXT,
      department TEXT,
      cnic TEXT,
      phone TEXT,
      join_date DATE,
      basic_salary REAL NOT NULL,
      allowances REAL DEFAULT 0,
      account_id INTEGER REFERENCES accounts(id),
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payroll (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payroll_number TEXT UNIQUE NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      employee_id INTEGER REFERENCES employees(id),
      employee_name TEXT NOT NULL,
      basic_salary REAL NOT NULL,
      allowances REAL DEFAULT 0,
      overtime REAL DEFAULT 0,
      gross_salary REAL NOT NULL,
      income_tax REAL DEFAULT 0,
      provident_fund REAL DEFAULT 0,
      other_deductions REAL DEFAULT 0,
      net_salary REAL NOT NULL,
      payment_status TEXT DEFAULT 'pending',
      payment_date DATE,
      voucher_id INTEGER REFERENCES vouchers(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tax_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tax_type TEXT NOT NULL,
      period_from DATE NOT NULL,
      period_to DATE NOT NULL,
      taxable_amount REAL NOT NULL,
      tax_rate REAL NOT NULL,
      tax_amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      due_date DATE,
      status TEXT DEFAULT 'pending',
      reference TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Seed default accounts
  const accountCount = db.prepare('SELECT COUNT(*) as cnt FROM accounts').get();
  if (accountCount.cnt === 0) {
    const insertAccount = db.prepare(`
      INSERT INTO accounts (code, name, type, sub_type, is_system, is_bank, is_cash)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const accounts = [
      ['1000', 'Assets', 'asset', 'group', 1, 0, 0],
      ['1100', 'Current Assets', 'asset', 'group', 1, 0, 0],
      ['1101', 'Cash in Hand', 'asset', 'cash', 1, 0, 1],
      ['1102', 'Bank Account', 'asset', 'bank', 1, 1, 0],
      ['1103', 'Accounts Receivable', 'asset', 'receivable', 1, 0, 0],
      ['1104', 'Inventory - Raw Material', 'asset', 'inventory', 1, 0, 0],
      ['1105', 'Inventory - Work in Progress', 'asset', 'inventory', 1, 0, 0],
      ['1106', 'Inventory - Finished Goods', 'asset', 'inventory', 1, 0, 0],
      ['1107', 'Advance to Suppliers', 'asset', 'current_asset', 1, 0, 0],
      ['1200', 'Fixed Assets', 'asset', 'group', 1, 0, 0],
      ['1201', 'Machinery & Equipment', 'asset', 'fixed_asset', 1, 0, 0],
      ['1202', 'Furniture & Fixtures', 'asset', 'fixed_asset', 1, 0, 0],
      ['1203', 'Vehicles', 'asset', 'fixed_asset', 1, 0, 0],
      ['1204', 'Building', 'asset', 'fixed_asset', 1, 0, 0],
      ['1205', 'Accumulated Depreciation', 'asset', 'contra_asset', 1, 0, 0],
      ['2000', 'Liabilities', 'liability', 'group', 1, 0, 0],
      ['2100', 'Current Liabilities', 'liability', 'group', 1, 0, 0],
      ['2101', 'Accounts Payable', 'liability', 'payable', 1, 0, 0],
      ['2102', 'Sales Tax Payable', 'liability', 'tax', 1, 0, 0],
      ['2103', 'Income Tax Payable', 'liability', 'tax', 1, 0, 0],
      ['2104', 'Salary Payable', 'liability', 'payable', 1, 0, 0],
      ['2105', 'Advance from Customers', 'liability', 'current_liability', 1, 0, 0],
      ['2200', 'Long Term Liabilities', 'liability', 'group', 1, 0, 0],
      ['2201', 'Bank Loan', 'liability', 'loan', 1, 0, 0],
      ['3000', 'Equity', 'equity', 'group', 1, 0, 0],
      ['3001', 'Owner Capital', 'equity', 'capital', 1, 0, 0],
      ['3002', 'Retained Earnings', 'equity', 'retained', 1, 0, 0],
      ['3003', 'Drawings', 'equity', 'drawings', 1, 0, 0],
      ['4000', 'Income', 'income', 'group', 1, 0, 0],
      ['4001', 'Sales Revenue', 'income', 'revenue', 1, 0, 0],
      ['4002', 'Other Income', 'income', 'other_income', 1, 0, 0],
      ['4003', 'Discount Received', 'income', 'other_income', 1, 0, 0],
      ['5000', 'Expenses', 'expense', 'group', 1, 0, 0],
      ['5100', 'Cost of Goods Sold', 'expense', 'cogs', 1, 0, 0],
      ['5101', 'Raw Material Cost', 'expense', 'cogs', 1, 0, 0],
      ['5102', 'Direct Labor', 'expense', 'cogs', 1, 0, 0],
      ['5103', 'Manufacturing Overhead', 'expense', 'cogs', 1, 0, 0],
      ['5200', 'Operating Expenses', 'expense', 'group', 1, 0, 0],
      ['5201', 'Salaries & Wages', 'expense', 'operating', 1, 0, 0],
      ['5202', 'Rent Expense', 'expense', 'operating', 1, 0, 0],
      ['5203', 'Utilities (Gas, Electric)', 'expense', 'operating', 1, 0, 0],
      ['5204', 'Depreciation Expense', 'expense', 'operating', 1, 0, 0],
      ['5205', 'Repair & Maintenance', 'expense', 'operating', 1, 0, 0],
      ['5206', 'Transport & Freight', 'expense', 'operating', 1, 0, 0],
      ['5207', 'Marketing & Advertising', 'expense', 'operating', 1, 0, 0],
      ['5208', 'Office Supplies', 'expense', 'operating', 1, 0, 0],
      ['5209', 'Discount Allowed', 'expense', 'operating', 1, 0, 0],
      ['5210', 'Bank Charges', 'expense', 'operating', 1, 0, 0],
    ];
    const insertMany = db.transaction((accs) => {
      for (const acc of accs) insertAccount.run(...acc);
    });
    insertMany(accounts);
  }

  // Seed admin user
  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
  if (userCount.cnt === 0) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(`INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)`).run('Administrator', 'admin', hash, 'admin');
  }

  // Seed settings
  const settingsCount = db.prepare('SELECT COUNT(*) as cnt FROM settings').get();
  if (settingsCount.cnt === 0) {
    const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    const defaults = [
      ['company_name', 'My Manufacturing Co.'],
      ['company_address', 'Address Here'],
      ['company_phone', '03XX-XXXXXXX'],
      ['company_email', ''],
      ['company_ntn', ''],
      ['company_strn', ''],
      ['currency', 'Rs.'],
      ['fiscal_year_start', '7'],
      ['tax_enabled', '1'],
      ['default_tax_rate', '17'],
      ['withholding_tax_rate', '4.5'],
      ['invoice_prefix', 'SI'],
      ['purchase_prefix', 'PI'],
      ['expense_prefix', 'EXP'],
      ['voucher_prefix_journal', 'JV'],
      ['voucher_prefix_payment', 'PV'],
      ['voucher_prefix_receipt', 'RV'],
      ['voucher_prefix_contra', 'CV'],
      ['invoice_footer', 'Thank you for your business!'],
      ['payment_terms', '30'],
      ['bank_name', ''],
      ['bank_account', ''],
    ];
    const insertMany = db.transaction((settings) => {
      for (const [k, v] of settings) insertSetting.run(k, v);
    });
    insertMany(defaults);
  }

  // Seed sample customers
  const custCount = db.prepare('SELECT COUNT(*) as cnt FROM customers').get();
  if (custCount.cnt === 0) {
    const insertCust = db.prepare(`INSERT INTO customers (code, name, phone, address, ntn, strn, credit_limit) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    insertCust.run('C001', 'Ahmed Traders', '0300-1234567', 'Lahore, Pakistan', '1234567-8', 'SRB-1234', 500000);
    insertCust.run('C002', 'Malik Enterprises', '0321-9876543', 'Karachi, Pakistan', '9876543-2', '', 300000);
    insertCust.run('C003', 'Khan & Sons', '0333-4567890', 'Islamabad, Pakistan', '', '', 200000);
  }

  // Seed sample suppliers
  const suppCount = db.prepare('SELECT COUNT(*) as cnt FROM suppliers').get();
  if (suppCount.cnt === 0) {
    const insertSupp = db.prepare(`INSERT INTO suppliers (code, name, phone, address, ntn) VALUES (?, ?, ?, ?, ?)`);
    insertSupp.run('S001', 'Raw Material Suppliers Ltd', '0311-1111111', 'Faisalabad, Pakistan', '1111111-1');
    insertSupp.run('S002', 'Industrial Parts Co.', '0322-2222222', 'Sialkot, Pakistan', '2222222-2');
  }
}

module.exports = { runMigrations };
