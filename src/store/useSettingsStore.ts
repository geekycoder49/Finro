import { create } from 'zustand';
import { getSetting, setSetting } from '../db/database';

interface SettingsState {
    userName: string;
    currency: string;
    theme: 'light' | 'dark' | 'system';
    accentColor: string;
    profileImage: string | null;
    fontFamily: string;
    hasOnboarded: boolean;

    setUserName: (name: string) => void;
    setCurrency: (currency: string) => void;
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    setAccentColor: (color: string) => void;
    setProfileImage: (image: string | null) => void;
    setFontFamily: (font: string) => void;
    completeOnboarding: () => void;
    loadSettings: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
    userName: 'User',
    currency: 'PKR',
    theme: 'system',
    accentColor: '#4F46E5', // Indigo
    profileImage: null,
    fontFamily: 'System',
    hasOnboarded: false,

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
    setFontFamily: (font) => {
        setSetting('fontFamily', font);
        set({ fontFamily: font });
    },
    completeOnboarding: () => {
        setSetting('hasOnboarded', 'true');
        set({ hasOnboarded: true });
    },
    loadSettings: () => {
        const userName = getSetting('userName');
        const currency = getSetting('currency');
        const theme = getSetting('theme') as 'light' | 'dark' | 'system';
        const accentColor = getSetting('accentColor');
        const profileImage = getSetting('profileImage');
        const fontFamily = getSetting('fontFamily');
        const hasOnboarded = getSetting('hasOnboarded') === 'true';

        set({
            userName: userName || 'User',
            currency: currency || 'PKR',
            theme: theme || 'system',
            accentColor: accentColor || '#4F46E5',
            profileImage: profileImage || null,
            fontFamily: fontFamily || 'System',
            hasOnboarded: hasOnboarded
        });
    }
}));
