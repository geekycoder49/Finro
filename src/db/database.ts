import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('hysabkytab.db');

export interface Account {
    id: number;
    name: string;
    type: 'BANK' | 'CASH' | 'PERSON' | 'WALLET';
    balance: number;
    currency: string;
    peopleType?: 'RECEIVABLE' | 'PAYABLE';
    isActive?: number; // 1 = active, 0 = soft deleted
    iconUri?: string;
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
}

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
      iconUri TEXT
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
      receiptUri TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

    // Migration: Add receiptUri to transactions if it doesn't exist
    try {
        db.execSync('ALTER TABLE transactions ADD COLUMN receiptUri TEXT');
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

export const addAccount = (name: string, type: string, balance: number, currency: string, peopleType?: string, iconUri?: string) => {
    // Check if a soft-deleted account with this name already exists
    const existing = db.getFirstSync<Account>('SELECT * FROM accounts WHERE name = ?', [name]);

    if (existing) {
        // Reactivate and update
        db.runSync(
            'UPDATE accounts SET type = ?, balance = ?, currency = ?, peopleType = ?, isActive = 1, iconUri = ? WHERE id = ?',
            [type, balance, currency, peopleType || null, iconUri || null, existing.id]
        );
    } else {
        db.runSync(
            'INSERT INTO accounts (name, type, balance, currency, peopleType, isActive, iconUri) VALUES (?, ?, ?, ?, ?, 1, ?)',
            [name, type, balance, currency, peopleType || null, iconUri || null]
        );
    }
};

export const addTransaction = (amount: number, type: string, category: string, fromAccountId: number, toAccountId?: number, description?: string, date?: string, receiptUri?: string) => {
    const finalDate = date || new Date().toISOString();
    db.runSync(
        'INSERT INTO transactions (amount, type, category, fromAccountId, toAccountId, description, date, receiptUri) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [amount, type, category, fromAccountId, toAccountId || null, description || null, finalDate, receiptUri || null]
    );

    // Update account balances
    if (type === 'EXPENSE') {
        db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, fromAccountId]);
    } else if (type === 'INCOME') {
        db.runSync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, fromAccountId]);
    } else if (type === 'TRANSFER') {
        db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, fromAccountId]);
        if (toAccountId) {
            db.runSync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, toAccountId]);
        }
    } else if (type === 'PEOPLE') {
        // Basic logic for people transactions
        db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, fromAccountId]);
        if (toAccountId) {
            // Assuming adding to their balance (debt/credit)
            db.runSync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, toAccountId]);
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

export const deleteTransaction = (id: number) => {
    const transaction = db.getFirstSync<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
    if (!transaction) return;

    // Revert balance changes
    if (transaction.type === 'EXPENSE') {
        db.runSync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [transaction.amount, transaction.fromAccountId]);
    } else if (transaction.type === 'INCOME') {
        db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [transaction.amount, transaction.fromAccountId]);
    } else if (transaction.type === 'TRANSFER') {
        db.runSync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [transaction.amount, transaction.fromAccountId]);
        if (transaction.toAccountId) {
            db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [transaction.amount, transaction.toAccountId]);
        }
    } else if (transaction.type === 'PEOPLE') {
        db.runSync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [transaction.amount, transaction.fromAccountId]);
        if (transaction.toAccountId) {
            db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [transaction.amount, transaction.toAccountId]);
        }
    }

    db.runSync('DELETE FROM transactions WHERE id = ?', [id]);
};

export const updateTransaction = (id: number, amount: number, type: string, category: string, fromAccountId: number, toAccountId?: number, description?: string, date?: string, receiptUri?: string) => {
    // 1. Revert Old
    const oldTransaction = db.getFirstSync<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
    if (!oldTransaction) return;

    if (oldTransaction.type === 'EXPENSE') {
        db.runSync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [oldTransaction.amount, oldTransaction.fromAccountId]);
    } else if (oldTransaction.type === 'INCOME') {
        db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [oldTransaction.amount, oldTransaction.fromAccountId]);
    } else if (oldTransaction.type === 'TRANSFER') {
        db.runSync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [oldTransaction.amount, oldTransaction.fromAccountId]);
        if (oldTransaction.toAccountId) {
            db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [oldTransaction.amount, oldTransaction.toAccountId]);
        }
    } else if (oldTransaction.type === 'PEOPLE') {
        db.runSync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [oldTransaction.amount, oldTransaction.fromAccountId]);
        if (oldTransaction.toAccountId) {
            db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [oldTransaction.amount, oldTransaction.toAccountId]);
        }
    }

    // 2. Update Row
    const finalDate = date || oldTransaction.date;
    db.runSync(
        'UPDATE transactions SET amount = ?, type = ?, category = ?, fromAccountId = ?, toAccountId = ?, description = ?, date = ?, receiptUri = ? WHERE id = ?',
        [amount, type, category, fromAccountId, toAccountId || null, description || null, finalDate, receiptUri || null, id]
    );

    // 3. Apply New Balances
    if (type === 'EXPENSE') {
        db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, fromAccountId]);
    } else if (type === 'INCOME') {
        db.runSync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, fromAccountId]);
    } else if (type === 'TRANSFER') {
        db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, fromAccountId]);
        if (toAccountId) {
            db.runSync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, toAccountId]);
        }
    } else if (type === 'PEOPLE') {
        db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, fromAccountId]);
        if (toAccountId) {
            db.runSync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, toAccountId]);
        }
    }
};

export const updateAccount = (id: number, name: string, type: string, balance: number, currency: string, peopleType?: string, iconUri?: string) => {
    db.runSync(
        'UPDATE accounts SET name = ?, type = ?, balance = ?, currency = ?, peopleType = ?, iconUri = ? WHERE id = ?',
        [name, type, balance, currency, peopleType || null, iconUri || null, id]
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

export const clearAllData = () => {
    db.runSync('DELETE FROM transactions');
    db.runSync('DELETE FROM accounts');
    // Re-initialize default account
    db.runSync(
        'INSERT INTO accounts (name, type, balance, currency) VALUES (?, ?, ?, ?)',
        ['Cash', 'CASH', 0, 'PKR']
    );
};
