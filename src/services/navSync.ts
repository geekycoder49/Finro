import { getAccounts, updateNAV, Account, upsertHistoricalNAV } from '../db/database';
import { useSettingsStore } from '../store/useSettingsStore';

const NAV_API_URL = 'https://geekycoder49.github.io/mufap-backend/navs.json';
const RETURNS_API_URL = 'https://mufap-nav-api.onrender.com/returns/latest';

export interface NAVData {
    fund: string;
    category: string;
    nav: number;
    date: string;
}

export interface SyncResult {
    updated: number;
    total: number;
    skipped: number;
    errors: string[];
}

let isSyncingInProgress = false;
let currentSyncPromise: Promise<SyncResult> | null = null;

/**
 * Fetches the latest NAVs from the Render API with timeout
 */
export const fetchLatestNAVs = async (): Promise<NAVData[]> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
        const response = await fetch(NAV_API_URL, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) {
            throw new Error(`Failed to fetch NAVs: ${response.statusText}`);
        }
        const json = await response.json();

        if (!json || !Array.isArray(json.data)) {
            throw new Error('Invalid NAV API response format');
        }

        return json.data as NAVData[];
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Cloud connection timed out. The service might be booting up.');
        }
        console.error('[NAV Sync] Fetch Error:', error);
        throw error;
    }
};

/**
 * Synchronizes all Mutual Fund accounts in the database with the latest API data
 */
export const syncAllFunds = async (): Promise<SyncResult> => {
    if (isSyncingInProgress && currentSyncPromise) {
        console.log('[NAV Sync] Sync already in progress, joining existing request...');
        return currentSyncPromise;
    }

    isSyncingInProgress = true;
    currentSyncPromise = (async () => {
        const result: SyncResult = {
            updated: 0,
            total: 0,
            skipped: 0,
            errors: []
        };

        try {
            const apiData = await fetchLatestNAVs();

            // Populate Historical DB with all latest data
            apiData.forEach(f => {
                // Ensure date is in a sortable format if needed, but assuming API provides consistent strings
                upsertHistoricalNAV(f.fund, f.date, f.nav, f.category);
            });

            const accounts = getAccounts().filter(acc => acc.type === 'MUTUAL_FUND');

            result.total = accounts.length;

            for (const account of accounts) {
                // Priority 1: Match by fundCode
                // Priority 2: Match by fund name exactly
                let matchedFund = apiData.find(f =>
                    (account.fundCode && f.fund.toLowerCase().includes(account.fundCode.toLowerCase())) ||
                    f.fund.toLowerCase() === account.name.toLowerCase()
                );

                // If still no match, try case-insensitive partial match on name
                if (!matchedFund) {
                    matchedFund = apiData.find(f =>
                        f.fund.toLowerCase().includes(account.name.toLowerCase()) ||
                        account.name.toLowerCase().includes(f.fund.toLowerCase())
                    );
                }

                if (matchedFund) {
                    try {
                        updateNAV(account.id, matchedFund.nav);
                        result.updated++;
                        continue; // Move to next account after successful update
                    } catch (e: any) {
                        result.errors.push(`Error updating ${account.name}: ${e.message}`);
                    }
                } else {
                    result.skipped++;
                    console.log(`[NAV Sync] No match found for ${account.name} (Code: ${account.fundCode})`);
                }
            }

            // Always update last sync timestamp if we successfully reached the API
            useSettingsStore.getState().setLastNAVSync(new Date().toISOString());

            return result;
        } catch (error: any) {
            result.errors.push(`Critical Sync Error: ${error.message}`);
            return result;
        } finally {
            isSyncingInProgress = false;
            currentSyncPromise = null;
        }
    })();

    return currentSyncPromise;
};

/**
 * Fetches potential matches for a fund name
 */
export const fetchFundMatches = async (fundName: string): Promise<NAVData[]> => {
    try {
        const apiData = await fetchLatestNAVs();
        // Try exact match first
        const exactMatches = apiData.filter(f => f.fund.toLowerCase() === fundName.toLowerCase());
        if (exactMatches.length > 0) return exactMatches;

        // Create a search name by stripping parentheses if present (e.g., "Fund Name (Equity)" -> "Fund Name")
        const cleanSearchName = fundName.includes('(') ? fundName.split('(')[0].trim() : fundName;

        // Fallback to partial matches using the clean name
        const partialMatches = apiData.filter(f =>
            f.fund.toLowerCase().includes(cleanSearchName.toLowerCase()) ||
            cleanSearchName.toLowerCase().includes(f.fund.toLowerCase())
        );

        return partialMatches;
    } catch (error) {
        console.error('[NAV Sync] Match Fetch Error:', error);
        return [];
    }
};

/**
 * Fetches and caches the latest Fund Returns data
 * @param force If true, ignores cache validity and forces fetch
 */
export const syncFundReturns = async (force = false): Promise<any> => {
    const { fundReturnsCache, lastFundReturnsSync } = useSettingsStore.getState();

    // Cache Validity Policy: 24 Hours
    if (!force && fundReturnsCache && lastFundReturnsSync) {
        const lastSyncTime = new Date(lastFundReturnsSync).getTime();
        const now = new Date().getTime();
        const diffHours = (now - lastSyncTime) / (1000 * 60 * 60);

        if (diffHours < 24) {
            console.log('[NAV Sync] Fund returns cache is valid (<24h). Skipping fetch.');
            return fundReturnsCache;
        }
    }
    try {
        console.log('[NAV Sync] Fetching fund returns...');
        const response = await fetch(RETURNS_API_URL);
        if (!response.ok) throw new Error('Failed to fetch returns');
        const json = await response.json();

        if (json && Array.isArray(json.data)) {
            // Cache the data
            useSettingsStore.getState().setFundReturnsCache(json.data);
            console.log(`[NAV Sync] Fund returns cached. Count: ${json.data.length}`);
            return json.data;
        }
        return null;
    } catch (error) {
        console.error('[NAV Sync] Error caching fund returns:', error);
        return null;
    }
};

/**
 * Fetches the NAV for a specific fund name (Legacy/Simple)
 */
export const fetchSingleFundNAV = async (fundName: string): Promise<number | null> => {
    const matches = await fetchFundMatches(fundName);
    return matches.length > 0 ? matches[0].nav : null;
};

/**
 * Checks if a scheduled sync is due (9:05 PM and 10:35 PM)
 */
export const checkScheduledSync = async () => {
    const { lastNAVSync } = useSettingsStore.getState();

    const now = new Date();
    const lastSync = lastNAVSync ? new Date(lastNAVSync) : new Date(0);

    // Milestones: 9:05 PM and 10:35 PM
    // Update: User requested 10:00 PM PST daily update
    const milestones = [
        { h: 22, m: 0 }  // 10:00 PM
    ];

    let triggerSync = false;

    for (const ms of milestones) {
        const milestoneDate = new Date(now);
        milestoneDate.setHours(ms.h, ms.m, 0, 0);

        // If currently earlier than milestone, check yesterday's instance
        if (now < milestoneDate) {
            milestoneDate.setDate(milestoneDate.getDate() - 1);
        }

        // If not synced since this milestone passed
        if (lastSync < milestoneDate) {
            triggerSync = true;
            break;
        }
    }

    if (triggerSync) {
        console.log(`[NAV Sync] Scheduled sync due (10:00 PM). Triggering auto-update...`);
        try {
            const result = await syncAllFunds();
            // Also sync returns (Force update for daily sync)
            await syncFundReturns(true);
            console.log(`[NAV Sync] Auto-sync complete. Updated: ${result.updated}, Errors: ${result.errors.length}`);
        } catch (error) {
            console.error(`[NAV Sync] Auto-sync failed:`, error);
        }
    }
};
