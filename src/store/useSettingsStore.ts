import { create } from 'zustand';
import { getSetting, setSetting } from '../db/database';

interface SettingsState {
    userName: string;
    currency: string;
    theme: 'light' | 'dark' | 'system';
    accentColor: string;
    profileImage: string | null;
    animationType: string;
    hasOnboarded: boolean;
    storageUri: string | null;
    autoSyncNAV: boolean;
    lastNAVSync: string | null;
    fundReturnsCache: any | null;
    lastFundReturnsSync: string | null;
    goal: string | null;

    setUserName: (name: string) => void;
    setCurrency: (currency: string) => void;
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    setAccentColor: (color: string) => void;
    setProfileImage: (image: string | null) => void;
    setAnimationType: (type: string) => void;
    completeOnboarding: () => void;
    setStorageUri: (uri: string | null) => void;
    setAutoSyncNAV: (enabled: boolean) => void;
    setLastNAVSync: (timestamp: string) => void;
    setFundReturnsCache: (data: any) => void;
    setGoal: (goal: string) => void;
    loadSettings: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
    userName: 'User',
    currency: 'PKR',
    theme: 'system',
    accentColor: '#4F46E5', // Indigo
    profileImage: null,
    animationType: 'Fade',
    hasOnboarded: false,
    storageUri: null,
    autoSyncNAV: false,
    lastNAVSync: null,
    fundReturnsCache: null,
    lastFundReturnsSync: null,
    goal: null,

    setUserName: (name) => {
        setSetting('userName', name);
        set({ userName: name });
    },
    setCurrency: (currency) => {
        setSetting('currency', currency);
        set({ currency });
    },
    setTheme: (theme) => {
        setSetting('theme', theme);
        set({ theme });
    },
    setAccentColor: (color) => {
        setSetting('accentColor', color);
        set({ accentColor: color });
    },
    setProfileImage: (image) => {
        if (image) setSetting('profileImage', image);
        set({ profileImage: image });
    },
    setAnimationType: (type) => {
        setSetting('animationType', type);
        set({ animationType: type });
    },
    completeOnboarding: () => {
        setSetting('hasOnboarded', 'true');
        set({ hasOnboarded: true });
    },
    setStorageUri: (uri) => {
        if (uri) setSetting('storageUri', uri);
        set({ storageUri: uri });
    },
    setAutoSyncNAV: (enabled) => {
        setSetting('autoSyncNAV', enabled ? 'true' : 'false');
        set({ autoSyncNAV: enabled });
    },
    setLastNAVSync: (timestamp) => {
        setSetting('lastNAVSync', timestamp);
        set({ lastNAVSync: timestamp });
    },
    setFundReturnsCache: (data) => {
        const timestamp = new Date().toISOString();
        setSetting('fundReturnsCache', JSON.stringify(data));
        setSetting('lastFundReturnsSync', timestamp);
        set({ fundReturnsCache: data, lastFundReturnsSync: timestamp });
    },
    setGoal: (goal) => {
        setSetting('goal', goal);
        set({ goal });
    },
    loadSettings: () => {
        const userName = getSetting('userName');
        const currency = getSetting('currency');
        const theme = getSetting('theme') as 'light' | 'dark' | 'system';
        const accentColor = getSetting('accentColor');
        const profileImage = getSetting('profileImage');
        const animationType = getSetting('animationType');
        const hasOnboarded = getSetting('hasOnboarded') === 'true';
        const autoSyncNAV = getSetting('autoSyncNAV') === 'true';
        const lastNAVSync = getSetting('lastNAVSync');
        const fundReturnsCacheRaw = getSetting('fundReturnsCache');
        const lastFundReturnsSync = getSetting('lastFundReturnsSync');
        const goal = getSetting('goal');
        let fundReturnsCache = null;
        try {
            if (fundReturnsCacheRaw) fundReturnsCache = JSON.parse(fundReturnsCacheRaw);
        } catch (e) {
            console.error('Failed to parse fund returns cache', e);
        }

        set({
            userName: userName || 'User',
            currency: currency || 'PKR',
            theme: theme || 'system',
            accentColor: accentColor || '#4F46E5',
            profileImage: profileImage || null,
            animationType: animationType || 'Fade',
            hasOnboarded: hasOnboarded,
            storageUri: getSetting('storageUri') || null,
            autoSyncNAV: autoSyncNAV,
            lastNAVSync: lastNAVSync || null,
            fundReturnsCache,
            lastFundReturnsSync: lastFundReturnsSync || null,
            goal: goal || null
        });
    }
}));
