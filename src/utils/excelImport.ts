import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';
import { addTransaction, getAccounts, addAccount, clearAllData, updateAccount } from '../db/database';

/**
 * Robust Excel/CSV Importer
 * Synchronized with PC Dashboard logic + Transfer Pairing logic
 */
export const importExcelData = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
                'application/vnd.ms-excel', // .xls
                'text/csv',
                'text/comma-separated-values',
                'application/csv',
                'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
            ],
            multiple: true,
            copyToCacheDirectory: true,
        });

        if (result.canceled) return { success: false, message: 'Import cancelled' };

        // 1. Gather all unique data and accounts first
        const allTransactions: any[] = [];
        const finalBalances = new Map<string, number>();
        const uniqueAccounts = new Set<string>();

        const getVal = (row: any, key: string) => {
            const normalizedKey = key.toLowerCase().replace(/[\s\-_]/g, '');
            const actualKey = Object.keys(row).find(k => {
                const kNorm = k.toLowerCase().replace(/[\s\-_]/g, '');
                return kNorm === normalizedKey;
            });
            return actualKey ? row[actualKey] : undefined;
        };

        const IGNORED_ACCOUNT_NAMES = new Set([
            'salary', 'business income/profit', 'investment', 'commission', 'pension', 'allowance', 'bonus',
            'transport income', 'pocket money', 'freelance', 'tutoring income', 'gifts received', 'rent received',
            'loan received', 'other income', 'personal', 'food & drink', 'transport', 'grocery', 'travel',
            'entertainment', 'fuel & maintenance', 'bills & utilities', 'medical', 'shopping', 'education',
            'office', 'home', 'rent paid', 'loan paid', 'donations/charity', 'gifts', 'family', 'health & fitness',
            'wedding', 'mobile', 'electronics', 'insurance', 'installment', 'other expenses', 'category', 'category name'
        ]);

        const safeNum = (val: any) => {
            if (val === undefined || val === null) return null;
            const str = String(val).replace(/,/g, '').trim();
            if (str === '') return null;
            const num = parseFloat(str);
            return isNaN(num) ? null : num;
        };

        const parseDate = (dateVal: any) => {
            if (!dateVal) return null;
            if (dateVal instanceof Date) return dateVal;
            const str = String(dateVal).trim();

            if (str.includes('/')) {
                const parts = str.split('/');
                if (parts.length === 3) {
                    const d = parseInt(parts[0], 10);
                    const m = parseInt(parts[1], 10) - 1;
                    let y = parseInt(parts[2], 10);
                    if (parts[2].length === 2) y += 2000;
                    const date = new Date(y, m, d, 12, 0, 0);
                    if (!isNaN(date.getTime())) return date;
                }
            }

            const date = new Date(dateVal);
            return isNaN(date.getTime()) ? null : date;
        };

        // 2. Load all files into memory
        for (const asset of result.assets) {
            const fileName = asset.name.toLowerCase();
            const isCSV = fileName.endsWith('.csv');

            const fileContent = await FileSystem.readAsStringAsync(asset.uri, {
                encoding: isCSV ? 'utf8' : 'base64',
            });

            const workbook = XLSX.read(fileContent, {
                type: isCSV ? 'string' : 'base64',
                cellDates: true
            });

            for (const sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName];
                const data: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: true });

                if (data.length === 0) continue;

                for (const row of data) {
                    // Prioritize dedicated Account headers to avoid picking up Category names from 'Name' columns
                    const accountNameRaw = (
                        getVal(row, 'Account Name') ||
                        getVal(row, 'Account') ||
                        getVal(row, 'AccountTitle') ||
                        getVal(row, 'Bank') ||
                        // Only use 'Name' or 'Title' if they don't look like category definitions
                        getVal(row, 'Title') ||
                        getVal(row, 'Name') ||
                        'Cash'
                    );

                    const accountName = String(accountNameRaw).trim();
                    const accLower = accountName.toLowerCase();

                    if (!accountName || accLower.includes('total') || IGNORED_ACCOUNT_NAMES.has(accLower)) {
                        continue;
                    }

                    // Normalize account name for tracking unique accounts
                    const normalizedAccName = accountName;
                    uniqueAccounts.add(normalizedAccName);

                    // Always update to the latest closing balance for this account
                    const rawBal = getVal(row, 'Closing Balance') || getVal(row, 'Balance');
                    const balValue = safeNum(rawBal);
                    const accKey = accountName.toLowerCase().trim();

                    if (balValue !== null) {
                        finalBalances.set(accKey, balValue);
                        console.log(`[Balance Collection] ${accountName}: ${balValue}`);
                    }

                    const amountRaw = getVal(row, 'Voucher Amount') || getVal(row, 'Amount');
                    const dateRaw = getVal(row, 'Voucher Date') || getVal(row, 'Date');
                    const amount = safeNum(amountRaw);

                    if (amount !== null && dateRaw !== undefined) {
                        allTransactions.push({
                            row,
                            accountName,
                            amount: amount,
                            date: parseDate(dateRaw),
                            type: String(getVal(row, 'Voucher Type') || getVal(row, 'Type') || 'Expense').trim(),
                            category: String(getVal(row, 'Category Name') || getVal(row, 'Category') || 'General').trim(),
                            description: String(getVal(row, 'Description') || '').trim(),
                            tags: String(getVal(row, 'Tags') || '').trim()
                        });
                    }
                }
            }
        }

        // 3. EXECUTE: Wipe and Rebuild
        clearAllData();

        // Final unique account list for creation
        const accountsToCreate = new Map<string, { name: string, type: 'BANK' | 'CASH' | 'PERSON' }>();

        for (const accName of uniqueAccounts) {
            const key = accName.toLowerCase().trim();
            if (accountsToCreate.has(key)) continue;

            const nameLower = key;
            let accType: 'BANK' | 'CASH' | 'PERSON' = 'CASH';
            if (nameLower.includes('bank') || nameLower.includes('acc') || nameLower.includes('hbl') || nameLower.includes('ubl') || nameLower.includes('mcb')) {
                accType = 'BANK';
            } else if (nameLower.includes('client') || nameLower.includes('person') || nameLower.includes('loan') || nameLower.includes('debt') || nameLower.includes('receivable')) {
                accType = 'PERSON';
            }

            accountsToCreate.set(key, { name: accName, type: accType });
        }

        // Create accounts uniquely
        for (const [key, info] of accountsToCreate) {
            const currentAccs = getAccounts();
            const existing = currentAccs.find(a => a.name.toLowerCase().trim() === key);
            if (!existing) {
                addAccount(info.name, info.type, 0, 'PKR');
            } else {
                // Update existing account type if it was just 'CASH' from clearAllData
                updateAccount(existing.id, info.name, info.type, 0, 'PKR', existing.peopleType);
            }
        }

        const dbAccounts = getAccounts();
        const accountLowerMap = new Map<string, number>();
        dbAccounts.forEach(acc => {
            const key = acc.name.toLowerCase().trim();
            // Store the ID for this normalized name key
            accountLowerMap.set(key, acc.id);
        });

        console.log(`[Import] Starting transaction processing. Total: ${allTransactions.length} rows`);
        console.log(`[Import] Accounts mapped: ${Array.from(accountLowerMap.keys()).join(', ')}`);


        // Step C: Bulk Add Transactions with TRANSFER PAIRING
        let importSuccessCount = 0;
        const processedIndices = new Set<number>();

        const isSameDay = (d1: Date, d2: Date) => {
            return d1.getFullYear() === d2.getFullYear() &&
                d1.getMonth() === d2.getMonth() &&
                d1.getDate() === d2.getDate();
        };

        for (let i = 0; i < allTransactions.length; i++) {
            if (processedIndices.has(i)) continue;

            const t = allTransactions[i];
            const nameKey = t.accountName.toLowerCase().trim();
            const accId = accountLowerMap.get(nameKey);

            if (!accId || !t.date) {
                console.warn(`[Import] Skipping transaction ${i}: Account not found or no date. Account: ${t.accountName}`);
                continue;
            }

            const isTransfer = t.type.toLowerCase().includes('transfer') ||
                t.type.toLowerCase().includes('contra') ||
                t.category.toLowerCase().includes('transfer');

            if (isTransfer) {
                console.log(`[Import] Processing transfer ${i}: ${t.accountName} ${t.amount} on ${t.date.toLocaleDateString()}`);

                let pairIndex = -1;
                for (let j = i + 1; j < allTransactions.length; j++) {
                    if (processedIndices.has(j)) continue;
                    const ot = allTransactions[j];
                    if (!ot.date) continue;

                    const sameDay = isSameDay(t.date, ot.date);
                    const sameAbsAmount = Math.abs(Math.abs(t.amount) - Math.abs(ot.amount)) < 0.01;
                    const oppositeSign = (t.amount > 0 && ot.amount < 0) || (t.amount < 0 && ot.amount > 0);
                    const otIsTransfer = ot.type.toLowerCase().includes('transfer') ||
                        ot.type.toLowerCase().includes('contra') ||
                        ot.category.toLowerCase().includes('transfer');
                    const differentAccounts = t.accountName.toLowerCase().trim() !== ot.accountName.toLowerCase().trim();

                    if (sameDay && sameAbsAmount && oppositeSign && otIsTransfer && differentAccounts) {
                        pairIndex = j;
                        console.log(`  [Pairing Success] Found pair at index ${j}: ${ot.accountName} ${ot.amount}`);
                        break;
                    }
                }

                if (pairIndex !== -1) {
                    const ot = allTransactions[pairIndex];
                    const otKey = ot.accountName.toLowerCase().trim();
                    const otId = accountLowerMap.get(otKey);

                    if (otId && accId !== otId) {
                        // Deduce Source vs Destination based on sign
                        const fromAcc = t.amount < 0 ? accId : otId;
                        const toAcc = t.amount > 0 ? accId : otId;
                        const fromName = t.amount < 0 ? t.accountName : ot.accountName;
                        const toName = t.amount > 0 ? t.accountName : ot.accountName;

                        const dStr = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}-${String(t.date.getDate()).padStart(2, '0')}`;

                        console.log(`[Transfer Created] ${Math.abs(t.amount)} from "${fromName}" (ID: ${fromAcc}) to "${toName}" (ID: ${toAcc})`);

                        addTransaction(
                            Math.abs(t.amount),
                            'TRANSFER',
                            t.category !== 'General' ? t.category : (ot.category !== 'General' ? ot.category : 'Transfer'),
                            fromAcc,
                            toAcc,
                            t.description || ot.description || 'Transfer',
                            dStr
                        );
                        processedIndices.add(i);
                        processedIndices.add(pairIndex);
                        importSuccessCount++;
                        continue;
                    } else {
                        console.warn(`[Transfer Pairing Failed] Could not resolve account IDs or same account. accId: ${accId}, otId: ${otId}`);
                    }
                } else {
                    console.warn(`[Transfer Unpaired] No matching pair found for transaction ${i}. This will be treated as income/expense.`);
                }
            }

            // Normal Income/Expense (or unpaired transfer)
            const dbType = t.amount > 0 ? 'INCOME' : 'EXPENSE';
            const dStr = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}-${String(t.date.getDate()).padStart(2, '0')}`;

            console.log(`[Transaction Created] ${dbType}: ${Math.abs(t.amount)} for ${t.accountName} (${t.category})`);


            addTransaction(
                Math.abs(t.amount),
                dbType,
                t.category,
                accId,
                undefined,
                t.tags ? `${t.description} [${t.tags}]` : t.description,
                dStr
            );
            processedIndices.add(i);
            importSuccessCount++;
        }

        // Step D: Final Balance Synchronization
        // After all transactions are processed, sync to the closing balances from Excel
        console.log('[Import] Syncing final balances...');

        const currentAccounts = getAccounts();
        const syncedAccounts = new Set<string>();

        // If the file provided ANY balances, we assume accounts without balances should be 0
        const hasAnyBalances = finalBalances.size > 0;

        for (const acc of currentAccounts) {
            const accKey = acc.name.toLowerCase().trim();
            if (syncedAccounts.has(accKey)) continue;

            let targetBalance = finalBalances.get(accKey);

            // "Smart Inference": If this account was in the file but has no balance specified,
            // and we found other balances in the file, treat this as 0 (cleared account).
            const wasInFile = Array.from(uniqueAccounts).some(name => name.toLowerCase().trim() === accKey);

            if (targetBalance === undefined || targetBalance === null) {
                if (hasAnyBalances && wasInFile) {
                    targetBalance = 0;
                    console.log(`[Balance Sync] Inferring 0 balance for clearing account: ${acc.name}`);
                } else {
                    console.log(`[Balance Sync] Keeping calculated balance for ${acc.name}: ${acc.balance}`);
                    continue;
                }
            }

            console.log(`[Balance Sync] Setting ${acc.name} balance to ${targetBalance} (Calculated was ${acc.balance})`);
            updateAccount(acc.id, acc.name, acc.type, targetBalance, acc.currency, acc.peopleType);
            syncedAccounts.add(accKey);
        }


        return {
            success: true,
            message: `Import Successful!\n- Transactions: ${importSuccessCount}\n- Transfers Paired.\n- Balances Synced.`
        };
    } catch (error: any) {
        console.error('Import error:', error);
        return { success: false, message: error.message || 'Import failed.' };
    }
};
