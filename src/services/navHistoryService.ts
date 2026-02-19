import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
// @ts-ignore - Asset might not be typed correctly or recognized yet
import { Asset } from 'expo-asset';
import { upsertHistoricalNAV, getHistoricalNAV, HistoricalNAV } from '../db/database';
import { NAVData } from './navSync';

let archiveDb: SQLite.SQLiteDatabase | null = null;
const ARCHIVE_DB_NAME = 'navs_archive.db';

/**
 * Normalizes a date string to YYYY-MM-DD for consistent database storage and comparison.
 * Supports ISO strings and generic date strings.
 */
export const normalizeDate = (dateStr: string): string => {
    try {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        return dateStr;
    }
};

export const initArchiveDatabase = async () => {
    try {
        if (Platform.OS === 'web') {
            console.log('[History Service] Archive DB: Running on Web, skipping SQLite initialization.');
            return;
        }

        console.log('[History Service] Initializing Archive DB...');

        // Try to get document directory through multiple means
        let docDir = FileSystem.documentDirectory;
        if (!docDir) {
            const fs: any = FileSystem;
            docDir = fs.DocumentDirectory || fs.cacheDirectory || fs.CacheDirectory;
        }

        // Ultimate fallback to react-native-fs if available
        if (!docDir) {
            try {
                const RNFS = require('react-native-fs');
                docDir = 'file://' + RNFS.DocumentDirectoryPath + '/';
                console.log('[History Service] Fallback to RNFS: ' + docDir);
            } catch (e) {
                console.log('[History Service] RNFS fallback failed or not available');
            }
        }

        if (!docDir) {
            console.error('[History Service] Error: No writable directory found (all directory providers are null).');
            return;
        }

        const normalizedDocDir = docDir.endsWith('/') ? docDir : `${docDir}/`;
        const dbPath = `${normalizedDocDir}SQLite/${ARCHIVE_DB_NAME}`;
        const dbDir = `${normalizedDocDir}SQLite`;

        console.log('[History Service] Selected DB path:', dbPath);

        // Ensure SQLite directory exists
        const dirInfo = await FileSystem.getInfoAsync(dbDir);
        if (!dirInfo.exists) {
            console.log('[History Service] Creating SQLite directory at:', dbDir);
            await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
        }

        const fileInfo = await FileSystem.getInfoAsync(dbPath);
        if (!fileInfo.exists) {
            console.log('[History Service] Archive DB file missing, copying from assets...');
            // Copy from assets
            const asset = Asset.fromModule(require('../../assets/databases/navs.db'));
            await asset.downloadAsync();
            if (asset.localUri) {
                await FileSystem.copyAsync({
                    from: asset.localUri,
                    to: dbPath,
                });
                console.log('[History Service] Copy successful from:', asset.localUri);
            } else {
                console.warn('[History Service] Asset download successful but localUri is null');
            }
        } else {
            console.log('[History Service] Archive DB file already exists.');
        }

        archiveDb = SQLite.openDatabaseSync(ARCHIVE_DB_NAME);

        // Diagnostic: Check if tables exist
        try {
            const tables = archiveDb.getAllSync("SELECT name FROM sqlite_master WHERE type='table'");
            console.log('[History Service] Archive DB Tables:', tables.map((t: any) => t.name).join(', '));
        } catch (e) {
            console.error('[History Service] Error checking tables:', e);
        }

        console.log('[History Service] Archive DB Initialized');
    } catch (error) {
        console.error('[History Service] Archive DB Init Error:', error);
    }
};

/**
 * Fetches the NAV for a specific fund on or before the target date.
 * Queries both the pre-populated archive and the live synced database.
 */
export const getNAVForDate = async (fundName: string, date: string): Promise<HistoricalNAV | null> => {
    const normalizedDate = normalizeDate(date);
    console.log(`[History Service] Querying NAV for ${fundName} on ${normalizedDate}`);

    if (archiveDb) {
        try {
            // Priority 1: Try the structured archive schema (nav_history + funds)
            // Some versions of our dataset use this schema
            let results: any = [];
            try {
                results = archiveDb.getAllSync(`
                    SELECT f.name as fund_name, h.date, h.nav
                    FROM nav_history h
                    JOIN funds f ON h.fund_id = f.id
                    WHERE f.name = ? AND h.date <= ?
                    ORDER BY h.date DESC
                    LIMIT 1
                `, [fundName, normalizedDate]);
            } catch (e) {
                // Table might not exist, ignore and try next schema
                console.log('[History Service] Structured schema query failed, trying flat schema...');
            }

            // Priority 2: Try the flat "historical_navs" schema
            if (results.length === 0) {
                try {
                    results = archiveDb.getAllSync(`
                        SELECT fund_name, date, nav
                        FROM historical_navs
                        WHERE fund_name = ? AND date <= ?
                        ORDER BY date DESC
                        LIMIT 1
                    `, [fundName, normalizedDate]);
                } catch (e) {
                    console.log('[History Service] Flat schema query failed.');
                }
            }

            // Priority 3: Try "navs" schema (common name)
            if (results.length === 0) {
                try {
                    results = archiveDb.getAllSync(`
                        SELECT fund as fund_name, date, nav
                        FROM navs
                        WHERE fund = ? AND date <= ?
                        ORDER BY date DESC
                        LIMIT 1
                    `, [fundName, normalizedDate]);
                } catch (e) {
                    console.log('[History Service] navs schema query failed.');
                }
            }

            if (results.length > 0) {
                console.log(`[History Service] Found in Archive: ${results[0].nav}`);
                return results[0] as HistoricalNAV;
            }
        } catch (error) {
            console.error('[History Service] Query Error:', error);
        }
    }

    // Fallback to local synced history
    console.log('[History Service] Not found in archive or archive missing, checking local sync...');
    const local = getHistoricalNAV(fundName, normalizedDate);
    if (local) {
        console.log(`[History Service] Found in Local: ${local.nav}`);
    } else {
        console.log('[History Service] No NAV data found for date.');
    }
    return local;
};

/**
 * Fetches all NAV entries for a fund between two dates (inclusive).
 * Returns sorted oldest → newest.
 */
export const getNAVRangeForFund = async (fundName: string, fromDate: string, toDate: string): Promise<{ date: string; nav: number }[]> => {
    const from = normalizeDate(fromDate);
    const to = normalizeDate(toDate);

    if (archiveDb) {
        try {
            let results: any[] = [];

            // Try structured schema
            try {
                results = archiveDb.getAllSync(`
                    SELECT h.date, h.nav
                    FROM nav_history h
                    JOIN funds f ON h.fund_id = f.id
                    WHERE f.name = ? AND h.date >= ? AND h.date <= ?
                    ORDER BY h.date ASC
                `, [fundName, from, to]);
            } catch (e) { }

            // Try flat historical_navs schema
            if (results.length === 0) {
                try {
                    results = archiveDb.getAllSync(`
                        SELECT date, nav
                        FROM historical_navs
                        WHERE fund_name = ? AND date >= ? AND date <= ?
                        ORDER BY date ASC
                    `, [fundName, from, to]);
                } catch (e) { }
            }

            // Try navs schema
            if (results.length === 0) {
                try {
                    results = archiveDb.getAllSync(`
                        SELECT date, nav
                        FROM navs
                        WHERE fund = ? AND date >= ? AND date <= ?
                        ORDER BY date ASC
                    `, [fundName, from, to]);
                } catch (e) { }
            }

            if (results.length > 0) {
                return results as { date: string; nav: number }[];
            }
        } catch (error) {
            console.error('[History Service] Range Query Error:', error);
        }
    }

    return [];
};

/**
 * Ingests a batch of NAV data into the historical database.
 */
export const ingestHistoricalData = async (data: any[]) => {
    for (const entry of data) {
        // Handle both API (NAVData) and custom formats
        const name = entry.fund || entry.fund_name || entry.FundName;
        const nav = entry.nav || entry.NAV || entry.Nav;
        const date = normalizeDate(entry.date || entry.Date);
        const category = entry.category || entry.Category;

        if (name && nav && date) {
            upsertHistoricalNAV(name, date, parseFloat(nav.toString()), category);
        }
    }
};

/**
 * Fetches historical NAVs from a remote URL.
 * Used for importing external historical archives.
 */
export const fetchAndIngestHistoricalNAVs = async (url: string): Promise<{ success: boolean; count: number }> => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const json = await response.json();

        let data = [];
        if (Array.isArray(json)) data = json;
        else if (json.data && Array.isArray(json.data)) data = json.data;

        if (data.length > 0) {
            await ingestHistoricalData(data);
            return { success: true, count: data.length };
        }
        return { success: false, count: 0 };
    } catch (error) {
        console.error('[History Service] Bulk Ingest Error:', error);
        return { success: false, count: 0 };
    }
};
