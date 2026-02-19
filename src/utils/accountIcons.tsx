import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { Landmark, TrendingUp, User, Wallet } from 'lucide-react-native';
import { AMC_COLORS } from './amcIcons';
import { MobileWalletIcon } from '../components/MobileWalletIcon';

// STATIC BANK ICONS MAPPING
// To add more icons:
// 1. Place .png in assets/icons/
// 2. Add to this mapping
export const PAK_BANK_ICONS: Record<string, any> = {
    'HBL': require('../../assets/icons/hbl.png'),
    ' Habib': require('../../assets/icons/hbl.png'),
    'UBL': require('../../assets/icons/ubl.png'),
    ' United': require('../../assets/icons/ubl.png'),
    'MCB': require('../../assets/icons/mcb.png'),
    ' Muslim': require('../../assets/icons/mcb.png'),
    'Allied': require('../../assets/icons/allied.png'),
    'Meezan': require('../../assets/icons/meezan.png'),
    'Alfalah': require('../../assets/icons/alfalah.png'),
    'Standard': require('../../assets/icons/standard.png'),
    'SCB': require('../../assets/icons/standard.png'),
    'Askari': require('../../assets/icons/askari.png'),
    'Easypaisa': require('../../assets/icons/easypaisa.png'),
    'JazzCash': require('../../assets/icons/jazzcash.png'),
    'Jazz Cash': require('../../assets/icons/jazzcash.png'),
    'SadaPay': require('../../assets/icons/sadapay.png'),
    'NayaPay': require('../../assets/icons/nayapay.png'),
};

export const PAK_BANK_COLORS: Record<string, string[]> = {
    'HBL': ['#008269', '#005f4c'],
    ' Habib': ['#008269', '#005f4c'],
    'UBL': ['#0054a6', '#003d7a'],
    ' United': ['#0054a6', '#003d7a'],
    'MCB': ['#009639', '#00702b'],
    ' Muslim': ['#009639', '#00702b'],
    'Allied': ['#f37021', '#c25a1a'],
    'Meezan': ['#8c1d2f', '#6b1624'],
    'Alfalah': ['#ed1c24', '#b0151a'],
    'Standard': ['#00a546', '#007b34'],
    'SCB': ['#00a546', '#007b34'],
    'Askari': ['#1e3a8a', '#1e3a8a'],
    'Easypaisa': ['#10b981', '#059669'],
    'JazzCash': ['#ef4444', '#b91c1c'],
    'SadaPay': ['#00a99d', '#007f76'],
    'NayaPay': ['#3b82f6', '#2563eb'],
};

const styles = StyleSheet.create({
    icon: {
        width: 24,
        height: 24,
        borderRadius: 4,
    }
});

export const getBankIcon = (name: string, type: string, iconUri?: string, accentColor?: string, themeColors?: any, size: number = 24) => {
    if (iconUri) {
        return <Image source={{ uri: iconUri }} style={[styles.icon, { width: size, height: size, borderRadius: size / 2 }]} />;
    }

    const lowerName = name.toLowerCase();

    // Check Local Mapping
    for (const key in PAK_BANK_ICONS) {
        if (lowerName.includes(key.trim().toLowerCase())) {
            return (
                <Image
                    source={PAK_BANK_ICONS[key]}
                    style={[styles.icon, { width: size, height: size }]}
                    resizeMode="contain"
                />
            );
        }
    }


    // Generic Fallbacks
    if (type === 'CASH') return <Wallet size={size} color="#F59E0B" />;
    if (type === 'WALLET') return <MobileWalletIcon size={size} color={accentColor || '#3B82F6'} />;
    if (type === 'MUTUAL_FUND') return <TrendingUp size={size} color="#10B981" />;
    if (type === 'PERSON') return <User size={size} color={accentColor || '#3B82F6'} />;

    return <Landmark size={size} color={themeColors?.textSecondary || '#6B7280'} />;
};

export const getAccountColors = (name: string, type: string, accentColor: string): string[] => {
    const lowerName = name.toLowerCase();
    for (const key in PAK_BANK_COLORS) {
        if (lowerName.includes(key.trim().toLowerCase())) {
            return PAK_BANK_COLORS[key];
        }
    }

    // Fallbacks
    if (type === 'MUTUAL_FUND') {
        const amcLower = lowerName; // Often the name contains the AMC as well
        for (const key in AMC_COLORS) {
            if (amcLower.includes(key.toLowerCase())) {
                return AMC_COLORS[key];
            }
        }
        return ['#10b981', '#059669'];
    }
    if (type === 'PERSON') return ['#3b82f6', '#1d4ed8'];
    if (type === 'CASH') return ['#f59e0b', '#d97706'];
    if (type === 'WALLET') return [accentColor, '#2563eb'];

    return [accentColor, accentColor + 'dd'];
};
