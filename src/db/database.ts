import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('finro.db');

export interface Account {
    id: number;
    name: string;
    type: 'BANK' | 'CASH' | 'PERSON' | 'WALLET' | 'MUTUAL_FUND';
    balance: number;
    currency: string;
    peopleType?: 'RECEIVABLE' | 'PAYABLE';
    isActive?: number; // 1 = active, 0 = soft deleted
    iconUri?: string;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
    unitsOwned?: number;
    currentNAV?: number;
    principalAmount?: number;
    investmentDate?: string;
    lockedProfit?: number;
    isShariahCompliant?: number; // 1 = true, 0 = false
    fundType?: 'MUTUAL_FUND' | 'VPS' | 'ETF';
    amcName?: string;
    fundCode?: string;
}

export interface Transaction {
    id: number;
    amount: number;
    type: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'PEOPLE';
    category: string;
    fromAccountId: number;
    toAccountId?: number;
    description?: string;
    date: string;
    receiptUri?: string;
    fromAccountName?: string;
    toAccountName?: string;
    cgtAmount?: number;
    isSystem?: number; // 1 = system generated, not editable
    transactionNAV?: number;
}

export interface HistoricalNAV {
    fund_name: string;
    date: string;
    nav: number;
    category: string;
}

const syncMF = (id: number) => {
    const acc = db.getFirstSync<Account>('SELECT * FROM accounts WHERE id = ?', [id]);
    if (acc && acc.type === 'MUTUAL_FUND' && acc.currentNAV && acc.currentNAV > 0) {
        db.runSync('UPDATE accounts SET unitsOwned = ? WHERE id = ?', [acc.balance / acc.currentNAV, id]);
    }
};

export const initDatabase = () => {
    db.execSync(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      balance REAL DEFAULT 0,
      currency TEXT DEFAULT 'PKR',
      peopleType TEXT,
      isActive INTEGER DEFAULT 1,
      iconUri TEXT,
      isShariahCompliant INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      fromAccountId INTEGER NOT NULL,
      toAccountId INTEGER,
      description TEXT,
      date TEXT NOT NULL,
      receiptUri TEXT,
      cgtAmount REAL DEFAULT 0,
      isSystem INTEGER DEFAULT 0,
      transactionNAV REAL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS nav_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      accountId INTEGER NOT NULL,
      nav REAL NOT NULL,
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS historical_navs (
      fund_name TEXT NOT NULL,
      date TEXT NOT NULL,
      nav REAL NOT NULL,
      category TEXT,
      PRIMARY KEY (fund_name, date)
    );
  `);

    try {
        db.execSync('ALTER TABLE transactions ADD COLUMN receiptUri TEXT');
    } catch (e) { }

    try {
        db.execSync('ALTER TABLE transactions ADD COLUMN cgtAmount REAL DEFAULT 0');
    } catch (e) { }

    try {
        db.execSync('ALTER TABLE transactions ADD COLUMN isSystem INTEGER DEFAULT 0');
    } catch (e) { }

    try {
        db.execSync('ALTER TABLE transactions ADD COLUMN transactionNAV REAL');
    } catch (e) { }

    // Migration: Add isActive to accounts if it doesn't exist
    try {
        const tableInfo = db.getAllSync<any>('PRAGMA table_info(accounts)');
        const hasIsActive = tableInfo.some(col => col.name === 'isActive');
        if (!hasIsActive) {
            db.execSync('ALTER TABLE accounts ADD COLUMN isActive INTEGER DEFAULT 1');
            console.log('[DB] Migrated accounts: added isActive column');
        }
    } catch (e) {
        console.error('[DB] Migration failed (isActive):', e);
    }

    // Migration: Add iconUri to accounts if it doesn't exist
    try {
        const tableInfo = db.getAllSync<any>('PRAGMA table_info(accounts)');
        const hasIconUri = tableInfo.some(col => col.name === 'iconUri');
        if (!hasIconUri) {
            db.execSync('ALTER TABLE accounts ADD COLUMN iconUri TEXT');
            console.log('[DB] Migrated accounts: added iconUri column');
        }
    } catch (e) {
        console.error('[DB] Migration failed (iconUri):', e);
    }

    // Migration: Add riskLevel to accounts if it doesn't exist
    try {
        const tableInfo = db.getAllSync<any>('PRAGMA table_info(accounts)');
        const hasRiskLevel = tableInfo.some(col => col.name === 'riskLevel');
        if (!hasRiskLevel) {
            db.execSync('ALTER TABLE accounts ADD COLUMN riskLevel TEXT');
        }
        if (!tableInfo.some(col => col.name === 'unitsOwned')) {
            db.execSync('ALTER TABLE accounts ADD COLUMN unitsOwned REAL DEFAULT 0');
        }
        if (!tableInfo.some(col => col.name === 'currentNAV')) {
            db.execSync('ALTER TABLE accounts ADD COLUMN currentNAV REAL DEFAULT 0');
        }
        if (!tableInfo.some(col => col.name === 'principalAmount')) {
            db.execSync('ALTER TABLE accounts ADD COLUMN principalAmount REAL DEFAULT 0');
        }
        if (!tableInfo.some(col => col.name === 'investmentDate')) {
            db.execSync('ALTER TABLE accounts ADD COLUMN investmentDate TEXT');
        }
        if (!tableInfo.some(col => col.name === 'lockedProfit')) {
            db.execSync('ALTER TABLE accounts ADD COLUMN lockedProfit REAL DEFAULT 0');
        }
        if (!tableInfo.some(col => col.name === 'isShariahCompliant')) {
            db.execSync('ALTER TABLE accounts ADD COLUMN isShariahCompliant INTEGER DEFAULT 0');
        }
        if (!tableInfo.some(col => col.name === 'fundType')) {
            db.execSync('ALTER TABLE accounts ADD COLUMN fundType TEXT DEFAULT "MUTUAL_FUND"');
        }
        if (!tableInfo.some(col => col.name === 'amcName')) {
            db.execSync('ALTER TABLE accounts ADD COLUMN amcName TEXT');
        }
        if (!tableInfo.some(col => col.name === 'fundCode')) {
            db.execSync('ALTER TABLE accounts ADD COLUMN fundCode TEXT');
        }
    } catch (e) {
        console.error('[DB] Migration failed (Mutual Funds Fields):', e);
    }

    // Migration: Create historical_navs if it doesn't exist
    try {
        db.execSync(`
            CREATE TABLE IF NOT EXISTS historical_navs (
                fund_name TEXT NOT NULL,
                date TEXT NOT NULL,
                nav REAL NOT NULL,
                category TEXT,
                PRIMARY KEY (fund_name, date)
            )
        `);
    } catch (e) {
        console.error('[DB] Migration failed (historical_navs):', e);
    }
    // Check if any accounts exist, if not, add a default Cash account
    const accountsCount = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM accounts');
    if (accountsCount && accountsCount.count === 0) {
        db.runSync(
            'INSERT INTO accounts (name, type, balance, currency) VALUES (?, ?, ?, ?)',
            ['Cash', 'CASH', 0, 'PKR']
        );
    }
};

export const getSetting = (key: string): string | null => {
    const result = db.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
    return result ? result.value : null;
};

export const setSetting = (key: string, value: string) => {
    db.runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
};

export const getAccounts = (): Account[] => {
    return db.getAllSync<Account>('SELECT * FROM accounts WHERE isActive = 1');
};

export const addAccount = (name: string, type: string, balance: number, currency: string, peopleType?: string, iconUri?: string, riskLevel?: string, unitsOwned?: number, currentNAV?: number, principalAmount?: number, investmentDate?: string, lockedProfit?: number, isShariahCompliant?: number, fundType?: 'MUTUAL_FUND' | 'VPS' | 'ETF', amcName?: string, fundCode?: string): number => {
    // Check if account with this name and type already exists (isActive can be 0 or 1)
    const existing = db.getFirstSync<Account>('SELECT * FROM accounts WHERE name = ? AND type = ?', [name, type]);

    if (existing) {
        db.runSync(
            'UPDATE accounts SET type = ?, balance = ?, currency = ?, peopleType = ?, isActive = 1, iconUri = ?, riskLevel = ?, unitsOwned = ?, currentNAV = ?, principalAmount = ?, investmentDate = ?, lockedProfit = ?, isShariahCompliant = ?, fundType = ?, amcName = ?, fundCode = ? WHERE id = ?',
            [type, balance, currency, peopleType || null, iconUri || null, riskLevel || null, unitsOwned || 0, currentNAV || 0, principalAmount || 0, investmentDate || null, lockedProfit || 0, isShariahCompliant || 0, fundType || 'MUTUAL_FUND', amcName || null, fundCode || null, existing.id]
        );
        return existing.id;
    } else {
        const result = db.runSync(
            'INSERT INTO accounts (name, type, balance, currency, peopleType, isActive, iconUri, riskLevel, unitsOwned, currentNAV, principalAmount, investmentDate, lockedProfit, isShariahCompliant, fundType, amcName, fundCode) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, type, balance, currency, peopleType || null, iconUri || null, riskLevel || null, unitsOwned || 0, currentNAV || 0, principalAmount || 0, investmentDate || null, lockedProfit || 0, isShariahCompliant || 0, fundType || 'MUTUAL_FUND', amcName || null, fundCode || null]
        );
        return result.lastInsertRowId;
    }
};

export const updateNAV = (accountId: number, newNAV: number) => {
    const acc = db.getFirstSync<Account>('SELECT * FROM accounts WHERE id = ?', [accountId]);
    if (!acc) return;

    const newBalance = (acc.unitsOwned || 0) * newNAV;
    db.runSync(
        'UPDATE accounts SET currentNAV = ?, balance = ? WHERE id = ?',
        [newNAV, newBalance, accountId]
    );

    // Record in history
    db.runSync(
        'INSERT INTO nav_history (accountId, nav, date) VALUES (?, ?, ?)',
        [accountId, newNAV, new Date().toISOString()]
    );
};

export const transferFunds = (fromId: number, toId: number, amount: number) => {
    const fromAcc = db.getFirstSync<Account>('SELECT * FROM accounts WHERE id = ?', [fromId]);
    const toAcc = db.getFirstSync<Account>('SELECT * FROM accounts WHERE id = ?', [toId]);

    if (!fromAcc || !toAcc) return;

    // Update From Fund
    const newFromBalance = fromAcc.balance - amount;
    const newFromUnits = (fromAcc.currentNAV && fromAcc.currentNAV > 0) ? newFromBalance / fromAcc.currentNAV : 0;
    db.runSync(
        'UPDATE accounts SET balance = ?, unitsOwned = ? WHERE id = ?',
        [newFromBalance, newFromUnits, fromId]
    );

    // Update To Fund
    const newToBalance = toAcc.balance + amount;
    const newToUnits = (toAcc.currentNAV && toAcc.currentNAV > 0) ? newToBalance / toAcc.currentNAV : 0;
    db.runSync(
        'UPDATE accounts SET balance = ?, unitsOwned = ? WHERE id = ?',
        [newToBalance, newToUnits, toId]
    );

    // Record Transaction
    addTransaction(amount, 'TRANSFER', 'Fund Conversion', fromId, toId, `Converted from ${fromAcc.name} to ${toAcc.name}`);
};

export const redeemFunds = (fundId: number, toBankId: number, amount: number) => {
    const fund = db.getFirstSync<Account>('SELECT * FROM accounts WHERE id = ?', [fundId]);
    const bank = db.getFirstSync<Account>('SELECT * FROM accounts WHERE id = ?', [toBankId]);

    if (!fund || !bank) return;

    // Update Fund
    const newFundBalance = fund.balance - amount;
    const newUnits = (fund.currentNAV && fund.currentNAV > 0) ? newFundBalance / fund.currentNAV : 0;
    db.runSync(
        'UPDATE accounts SET balance = ?, unitsOwned = ? WHERE id = ?',
        [newFundBalance, newUnits, fundId]
    );

    // Update Bank/Cash
    db.runSync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, toBankId]);

    // Record Transaction
    addTransaction(amount, 'INCOME', 'Investment Redemption', toBankId, undefined, `Redeemed from ${fund.name}`);
};

export const getNAVHistory = (accountId: number) => {
    return db.getAllSync<{ id: number, nav: number, date: string }>('SELECT id, nav, date FROM nav_history WHERE accountId = ? ORDER BY date ASC', [accountId]);
};

export const updateUnits = (accountId: number, newUnits: number) => {
    const acc = db.getFirstSync<Account>('SELECT * FROM accounts WHERE id = ?', [accountId]);
    if (!acc) return;
    const newBalance = newUnits * (acc.currentNAV || 0);
    db.runSync('UPDATE accounts SET unitsOwned = ?, balance = ? WHERE id = ?', [newUnits, newBalance, accountId]);
};

export const updatePrincipal = (accountId: number, newPrincipal: number) => {
    db.runSync('UPDATE accounts SET principalAmount = ? WHERE id = ?', [newPrincipal, accountId]);
};

/**
 * Adjusts an account balance or units based on a transaction's impact.
 * Handles the special logic for Mutual Funds where units are the source of truth.
 */
const adjustAccountImpact = (id: number, amount: number, isAddition: boolean, transactionNAV?: number) => {
    const acc = db.getFirstSync<Account>('SELECT * FROM accounts WHERE id = ?', [id]);
    if (!acc) return;

    if (acc.type === 'MUTUAL_FUND') {
        const nav = transactionNAV || acc.currentNAV || 0;
        if (nav > 0) {
            const unitChange = amount / nav;
            const newUnits = isAddition ? (acc.unitsOwned || 0) + unitChange : (acc.unitsOwned || 0) - unitChange;
            // The balance in Mutual Funds is always unitsOwned * latest_known_NAV
            const newBalance = newUnits * (acc.currentNAV || 0);

            // Update Principal Amount for accurate CGT calculations
            let newPrincipal = acc.principalAmount || 0;
            if (isAddition) {
                // For investments, simply add to principal
                newPrincipal += amount;
            } else {
                // For redemptions, reduce principal by the cost basis of redeemed units
                // weighted average cost = total principal / total units
                const currentUnits = acc.unitsOwned || 0;
                if (currentUnits > 0) {
                    const avgCost = (acc.principalAmount || 0) / currentUnits;
                    const principalReduction = avgCost * unitChange;
                    newPrincipal = Math.max(0, newPrincipal - principalReduction);
                }
            }

            db.runSync(
                'UPDATE accounts SET unitsOwned = ?, balance = ?, principalAmount = ? WHERE id = ?',
                [newUnits, newBalance, newPrincipal, id]
            );
        }
    } else {
        const op = isAddition ? '+' : '-';
        db.runSync(`UPDATE accounts SET balance = balance ${op} ? WHERE id = ?`, [amount, id]);
    }
};

export const addTransaction = (amount: number, type: string, category: string, fromAccountId: number, toAccountId?: number, description?: string, date?: string, receiptUri?: string, cgtAmount?: number, isSystem: number = 0, transactionNAV?: number) => {
    const finalDate = date || new Date().toISOString();
    db.runSync(
        'INSERT INTO transactions (amount, type, category, fromAccountId, toAccountId, description, date, receiptUri, cgtAmount, isSystem, transactionNAV) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [amount, type, category, fromAccountId, toAccountId || null, description || null, finalDate, receiptUri || null, cgtAmount || 0, isSystem, transactionNAV || null]
    );

    // Update account balances
    if (type === 'EXPENSE') {
        adjustAccountImpact(fromAccountId, amount, false, transactionNAV);
    } else if (type === 'INCOME') {
        adjustAccountImpact(fromAccountId, amount, true, transactionNAV);
    } else if (type === 'TRANSFER') {
        adjustAccountImpact(fromAccountId, amount, false, transactionNAV);
        if (toAccountId) {
            adjustAccountImpact(toAccountId, amount - (cgtAmount || 0), true, transactionNAV);
        }
    } else if (type === 'PEOPLE') {
        adjustAccountImpact(fromAccountId, amount, false);
        if (toAccountId) {
            adjustAccountImpact(toAccountId, amount, true);
        }
    }
};

export const getTransactions = (limit: number = 20, month?: string, accountId?: number): Transaction[] => {
    let query = `
        SELECT t.*, a1.name as fromAccountName, a2.name as toAccountName 
        FROM transactions t
        LEFT JOIN accounts a1 ON t.fromAccountId = a1.id
        LEFT JOIN accounts a2 ON t.toAccountId = a2.id
        WHERE 1=1
    `;
    const params: any[] = [];

    if (month) {
        query += ' AND strftime("%Y-%m", date) = ?';
        params.push(month);
    }

    if (accountId) {
        query += ' AND (t.fromAccountId = ? OR t.toAccountId = ?)';
        params.push(accountId, accountId);
    }

    query += ' ORDER BY t.date DESC LIMIT ?';
    params.push(limit);

    return db.getAllSync<Transaction>(query, params);
};

export const getTransactionsForRange = (limit: number = 1000, startDate?: string, endDate?: string, accountId?: number): Transaction[] => {
    let query = `
        SELECT t.*, a1.name as fromAccountName, a2.name as toAccountName 
        FROM transactions t
        LEFT JOIN accounts a1 ON t.fromAccountId = a1.id
        LEFT JOIN accounts a2 ON t.toAccountId = a2.id
        WHERE 1=1
    `;
    const params: any[] = [];

    if (startDate) {
        query += ' AND date >= ?';
        params.push(startDate);
    }
    if (endDate) {
        query += ' AND date <= ?';
        params.push(endDate);
    }

    if (accountId) {
        query += ' AND (t.fromAccountId = ? OR t.toAccountId = ?)';
        params.push(accountId, accountId);
    }

    query += ' ORDER BY t.date DESC LIMIT ?';
    params.push(limit);

    return db.getAllSync<Transaction>(query, params);
};

export const getAccountStatsForRange = (accountId: number, startDate: string, endDate: string) => {
    const income = db.getFirstSync<{ total: number }>(
        'SELECT SUM(amount) as total FROM transactions WHERE ((type = "INCOME" AND fromAccountId = ?) OR (type = "TRANSFER" AND toAccountId = ?) OR (type = "PEOPLE" AND toAccountId = ?)) AND date >= ? AND date <= ?',
        [accountId, accountId, accountId, startDate, endDate]
    )?.total || 0;

    const expense = db.getFirstSync<{ total: number }>(
        'SELECT SUM(amount) as total FROM transactions WHERE ((type = "EXPENSE" AND fromAccountId = ?) OR (type = "TRANSFER" AND fromAccountId = ?) OR (type = "PEOPLE" AND fromAccountId = ?)) AND date >= ? AND date <= ?',
        [accountId, accountId, accountId, startDate, endDate]
    )?.total || 0;

    return { income, expense };
};

export const getMonthlyStats = (month: string) => {
    return getStatsForRange(`${month}-01`, `${month}-31`);
};

export const getStatsForRange = (startDate: string, endDate: string) => {
    return {
        expenses: db.getAllSync<{ category: string, total: number }>(
            'SELECT category, SUM(amount) as total FROM transactions WHERE type = "EXPENSE" AND date >= ? AND date <= ? GROUP BY category',
            [startDate, endDate]
        ),
        income: db.getAllSync<{ category: string, total: number }>(
            'SELECT category, SUM(amount) as total FROM transactions WHERE type = "INCOME" AND date >= ? AND date <= ? GROUP BY category',
            [startDate, endDate]
        ),
        totalExpense: db.getFirstSync<{ total: number }>(
            'SELECT SUM(amount) as total FROM transactions WHERE type = "EXPENSE" AND date >= ? AND date <= ?',
            [startDate, endDate]
        )?.total || 0,
        totalIncome: db.getFirstSync<{ total: number }>(
            'SELECT SUM(amount) as total FROM transactions WHERE type = "INCOME" AND date >= ? AND date <= ?',
            [startDate, endDate]
        )?.total || 0
    };
};

export const getDailyStatsForRange = (startDate: string, endDate: string) => {
    const query = `
        SELECT 
            date(date) as day,
            SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as income,
            SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as expense
        FROM transactions 
        WHERE date >= ? AND date <= ?
        GROUP BY day
        ORDER BY day ASC
    `;
    return db.getAllSync<{ day: string, income: number, expense: number }>(query, [startDate, endDate]);
};

export const deleteTransaction = (id: number) => {
    const transaction = db.getFirstSync<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
    if (!transaction) return;

    // 1. Revert impact
    if (transaction.type === 'EXPENSE') {
        adjustAccountImpact(transaction.fromAccountId, transaction.amount, true, transaction.transactionNAV);
    } else if (transaction.type === 'INCOME') {
        adjustAccountImpact(transaction.fromAccountId, transaction.amount, false, transaction.transactionNAV);
    } else if (transaction.type === 'TRANSFER') {
        adjustAccountImpact(transaction.fromAccountId, transaction.amount, true, transaction.transactionNAV);
        if (transaction.toAccountId) {
            adjustAccountImpact(transaction.toAccountId, transaction.amount - (transaction.cgtAmount || 0), false, transaction.transactionNAV);
        }

        // Revert CGT if exists
        const cgtTransaction = db.getFirstSync<Transaction>(
            'SELECT * FROM transactions WHERE isSystem = 1 AND category = ? AND date = ? AND fromAccountId = ?',
            ['CGT Tax', transaction.date, transaction.fromAccountId]
        );
        if (cgtTransaction) {
            deleteTransaction(cgtTransaction.id);
        }
    } else if (transaction.type === 'PEOPLE') {
        adjustAccountImpact(transaction.fromAccountId, transaction.amount, true);
        if (transaction.toAccountId) {
            adjustAccountImpact(transaction.toAccountId, transaction.amount, false);
        }
    }

    // 2. Delete row
    db.runSync('DELETE FROM transactions WHERE id = ?', [id]);
};

export const updateTransaction = (id: number, amount: number, type: string, category: string, fromAccountId: number, toAccountId?: number, description?: string, date?: string, receiptUri?: string, cgtAmount?: number, transactionNAV?: number) => {
    // 1. Revert Old (internal handle via helper)
    const oldTransaction = db.getFirstSync<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
    if (!oldTransaction) return;

    // Temporary revert to old state
    if (oldTransaction.type === 'EXPENSE') {
        adjustAccountImpact(oldTransaction.fromAccountId, oldTransaction.amount, true, oldTransaction.transactionNAV);
    } else if (oldTransaction.type === 'INCOME') {
        adjustAccountImpact(oldTransaction.fromAccountId, oldTransaction.amount, false, oldTransaction.transactionNAV);
    } else if (oldTransaction.type === 'TRANSFER') {
        adjustAccountImpact(oldTransaction.fromAccountId, oldTransaction.amount, true, oldTransaction.transactionNAV);
        if (oldTransaction.toAccountId) {
            adjustAccountImpact(oldTransaction.toAccountId, oldTransaction.amount - (oldTransaction.cgtAmount || 0), false, oldTransaction.transactionNAV);
        }
    } else if (oldTransaction.type === 'PEOPLE') {
        adjustAccountImpact(oldTransaction.fromAccountId, oldTransaction.amount, true);
        if (oldTransaction.toAccountId) {
            adjustAccountImpact(oldTransaction.toAccountId, oldTransaction.amount, false);
        }
    }

    // 2. Update Row
    const finalDate = date || oldTransaction.date;
    db.runSync(
        'UPDATE transactions SET amount = ?, type = ?, category = ?, fromAccountId = ?, toAccountId = ?, description = ?, date = ?, receiptUri = ?, cgtAmount = ?, transactionNAV = ? WHERE id = ?',
        [amount, type, category, fromAccountId, toAccountId || null, description || null, finalDate, receiptUri || null, cgtAmount || 0, transactionNAV || null, id]
    );

    // 3. Apply New impact
    if (type === 'EXPENSE') {
        adjustAccountImpact(fromAccountId, amount, false, transactionNAV);
    } else if (type === 'INCOME') {
        adjustAccountImpact(fromAccountId, amount, true, transactionNAV);
    } else if (type === 'TRANSFER') {
        adjustAccountImpact(fromAccountId, amount, false, transactionNAV);
        if (toAccountId) {
            adjustAccountImpact(toAccountId, amount - (cgtAmount || 0), true, transactionNAV);
        }
    } else if (type === 'PEOPLE') {
        adjustAccountImpact(fromAccountId, amount, false);
        if (toAccountId) {
            adjustAccountImpact(toAccountId, amount, true);
        }
    }
};

export const updateAccount = (id: number, name: string, type: string, balance: number, currency: string, peopleType?: string, iconUri?: string, riskLevel?: string, unitsOwned?: number, currentNAV?: number, principalAmount?: number, investmentDate?: string, lockedProfit?: number, isShariahCompliant?: number, fundType?: 'MUTUAL_FUND' | 'VPS' | 'ETF', amcName?: string, fundCode?: string) => {
    db.runSync(
        'UPDATE accounts SET name = ?, type = ?, balance = ?, currency = ?, peopleType = ?, iconUri = ?, riskLevel = ?, unitsOwned = ?, currentNAV = ?, principalAmount = ?, investmentDate = ?, lockedProfit = ?, isShariahCompliant = ?, fundType = ?, amcName = ?, fundCode = ? WHERE id = ?',
        [name, type, balance, currency, peopleType || null, iconUri || null, riskLevel || null, unitsOwned || 0, currentNAV || 0, principalAmount || 0, investmentDate || null, lockedProfit || 0, isShariahCompliant || 0, fundType || 'MUTUAL_FUND', amcName || null, fundCode || null, id]
    );
};

export const deleteAccount = (id: number) => {
    // Soft delete: keep the record but hide it from active lists
    db.runSync('UPDATE accounts SET isActive = 0 WHERE id = ?', [id]);
};

export const searchTransactions = (query?: string, type?: string) => {
    let sql = 'SELECT * FROM transactions WHERE 1=1';
    const params: any[] = [];

    if (query) {
        sql += ' AND (category LIKE ? OR description LIKE ?)';
        params.push(`%${query}%`, `%${query}%`);
    }

    if (type && type !== 'ALL') {
        sql += ' AND type = ?';
        params.push(type);
    }

    sql += ' ORDER BY date DESC LIMIT 50';

    return db.getAllSync<Transaction>(sql, params);
};

export const getFinancialOverview = () => {
    const accounts = getAccounts();
    let netWorth = 0;
    let receivable = 0;
    let payable = 0;

    accounts.forEach(acc => {
        if (acc.type === 'PERSON') {
            if (acc.balance > 0) receivable += acc.balance;
            else if (acc.balance < 0) payable += Math.abs(acc.balance);
            netWorth += acc.balance;
        } else {
            netWorth += acc.balance;
        }
    });

    return { netWorth, receivable, payable };
};

export const clearAllData = () => {
    db.runSync('DELETE FROM transactions');
    db.runSync('DELETE FROM accounts');
    db.runSync('DELETE FROM settings');
    db.runSync('DELETE FROM nav_history');
    // Re-initialize default account
    db.runSync(
        'INSERT INTO accounts (name, type, balance, currency) VALUES (?, ?, ?, ?)',
        ['Cash', 'CASH', 0, 'PKR']
    );
};

export const wipeDatabase = () => {
    db.runSync('DELETE FROM transactions');
    db.runSync('DELETE FROM accounts');
    db.runSync('DELETE FROM settings');
    db.runSync('DELETE FROM nav_history');
};

// Backup Helpers
export const getAllSettings = () => {
    try {
        return db.getAllSync<{ key: string, value: string }>('SELECT * FROM settings');
    } catch (e) { return []; }
};

export const restoreSetting = (key: string, value: string) => {
    db.runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
};

export const getAllNAVHistory = () => {
    try {
        return db.getAllSync<{ id: number, accountId: number, nav: number, date: string }>('SELECT * FROM nav_history');
    } catch (e) { return []; }
};

export const addNAVHistoryEntry = (accountId: number, nav: number, date: string) => {
    db.runSync('INSERT INTO nav_history (accountId, nav, date) VALUES (?, ?, ?)', [accountId, nav, date]);
};

export const deleteNAVHistoryEntry = (id: number) => {
    db.runSync('DELETE FROM nav_history WHERE id = ?', [id]);
};

export const updateNAVHistoryEntry = (id: number, nav: number, date: string) => {
    db.runSync('UPDATE nav_history SET nav = ?, date = ? WHERE id = ?', [nav, date, id]);
};

export const restoreAccount = (acc: Account) => {
    db.runSync(
        'INSERT INTO accounts (id, name, type, balance, currency, peopleType, iconUri, riskLevel, unitsOwned, currentNAV, principalAmount, investmentDate, lockedProfit, isShariahCompliant, fundType, amcName, fundCode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [acc.id, acc.name, acc.type, acc.balance, acc.currency, acc.peopleType || null, acc.iconUri || null, acc.riskLevel || null, acc.unitsOwned || 0, acc.currentNAV || 0, acc.principalAmount || 0, acc.investmentDate || null, acc.lockedProfit || 0, acc.isShariahCompliant || 0, acc.fundType || 'MUTUAL_FUND', acc.amcName || null, acc.fundCode || null]
    );
};

export const restoreTransaction = (t: Transaction) => {
    db.runSync(
        'INSERT INTO transactions (id, amount, type, category, fromAccountId, toAccountId, description, date, receiptUri, cgtAmount, isSystem) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [t.id, t.amount, t.type, t.category, t.fromAccountId, t.toAccountId || null, t.description || null, t.date, t.receiptUri || null, t.cgtAmount || 0, t.isSystem || 0]
    );
};

export const upsertHistoricalNAV = (fundName: string, date: string, nav: number, category?: string) => {
    db.runSync(
        'INSERT OR REPLACE INTO historical_navs (fund_name, date, nav, category) VALUES (?, ?, ?, ?)',
        [fundName, date, nav, category || null]
    );
};

export const getHistoricalNAV = (fundName: string, date: string): HistoricalNAV | null => {
    // Find the latest NAV that is on or before the given date
    return db.getFirstSync<HistoricalNAV>(
        'SELECT * FROM historical_navs WHERE fund_name = ? AND date <= ? ORDER BY date DESC LIMIT 1',
        [fundName, date]
    );
};

export const getNetWorthForDate = (targetDate: string): number => {
    const accounts = getAccounts();
    let totalNetWorth = 0;

    for (const acc of accounts) {
        // Calculate the sum of all impacts AFTER the target date to backtrack
        const transactionsAfter = db.getAllSync<Transaction>(
            'SELECT * FROM transactions WHERE (fromAccountId = ? OR toAccountId = ?) AND date > ?',
            [acc.id, acc.id, targetDate]
        );

        if (acc.type === 'MUTUAL_FUND') {
            // 1. Backtrack units
            let unitsDiff = 0;
            for (const t of transactionsAfter) {
                const nav = t.transactionNAV || acc.currentNAV || 0;
                if (nav <= 0) continue;
                const unitChange = t.amount / nav;

                if (t.fromAccountId === acc.id) unitsDiff -= unitChange; // It was a reduction, so to backtrack we add it? No.
                // Current = 100. Tomorrow I sell 10. (fromAcc = id, amount = 10, isAddition = false).
                // So unitsDiff = -10. 
                // Historical = Current - unitsDiff = 100 - (-10) = 110. Correct.
                if (t.toAccountId === acc.id) unitsDiff += unitChange;
            }
            const historicalUnits = (acc.unitsOwned || 0) - unitsDiff;

            // 2. Get Historical NAV
            const histNAV = getHistoricalNAV(acc.name, targetDate);
            const navToUse = histNAV ? histNAV.nav : (acc.currentNAV || 0);

            totalNetWorth += historicalUnits * navToUse;
        } else {
            // 1. Backtrack balance
            let balanceDiff = 0;
            for (const t of transactionsAfter) {
                let amount = t.amount;
                if (t.type === 'EXPENSE') {
                    if (t.fromAccountId === acc.id) balanceDiff -= amount;
                } else if (t.type === 'INCOME') {
                    if (t.fromAccountId === acc.id) balanceDiff += amount;
                } else if (t.type === 'TRANSFER' || t.type === 'PEOPLE') {
                    if (t.fromAccountId === acc.id) balanceDiff -= amount;
                    if (t.toAccountId === acc.id) balanceDiff += (amount - (t.cgtAmount || 0));
                }
            }
            totalNetWorth += (acc.balance - balanceDiff);
        }
    }

    return totalNetWorth;
};
