import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';
import { useTheme } from '../hooks/useTheme';
import { format } from 'date-fns';
import { getCategoryIcon } from '../utils/categoryIcons';
import { Transaction } from '../db/database';

interface TransactionCardProps {
    item: Transaction;
    onPress: (item: Transaction) => void;
}

export const TransactionCard = ({ item, onPress }: TransactionCardProps) => {
    const { currency, theme, accentColor } = useSettingsStore();
    const { themeColors } = useTheme();

    const isExpense = item.type === 'EXPENSE';
    const isIncome = item.type === 'INCOME';
    const isTransfer = item.type === 'TRANSFER';
    const isPeople = item.type === 'PEOPLE';
    const isCGT = item.category === 'CGT';


    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
            onPress={() => isCGT ? null : onPress(item)}
            activeOpacity={isCGT ? 1 : 0.7}
        >
            <View style={[styles.iconBox, { backgroundColor: themeColors.background }]}>
                {isTransfer ? getCategoryIcon('Transfer', 20, accentColor) :
                    isPeople ? (
                        (item.category === 'Lend' || item.category === 'Pay') ?
                            <ArrowUpRight size={20} color="#EF4444" /> :
                            <ArrowDownLeft size={20} color="#10B981" />
                    ) :
                        getCategoryIcon(item.category, 20, isExpense ? '#EF4444' : '#10B981')}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 0 }}>
                    <Text style={[styles.category, { color: themeColors.text }]}>
                        {(isTransfer || isPeople) ?
                            (item.category && item.category !== 'Transfer' ? `Transfer (${item.category})` : 'Transfer') :
                            (item.category || 'No Category')}
                    </Text>
                    {item.isSystem === 1 && !isCGT ? (
                        <View style={{ backgroundColor: themeColors.border, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 }}>
                            <Text style={[{ fontSize: 8, color: themeColors.textSecondary, fontWeight: '700' }]}>SYSTEM</Text>
                        </View>
                    ) : null}
                </View>
                <Text style={[styles.subText, { color: themeColors.textSecondary }]}>
                    {isCGT ? item.fromAccountName :
                        isTransfer ? `${item.fromAccountName} → ${item.toAccountName}` :
                            isPeople ? (item.category === 'Lend' || item.category === 'Pay' ? `to ${item.toAccountName}` : `from ${item.fromAccountName}`) :
                                item.fromAccountName}
                </Text>
            </View>
            <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                <Text style={[styles.amount, { color: isExpense ? '#EF4444' : isIncome ? '#10B981' : themeColors.text }]}>
                    {isExpense ? '-' : isIncome ? '+' : ''}{currency} {item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Text>
                <Text style={[styles.date, { color: themeColors.textSecondary }]}>
                    {format(new Date(item.date), 'dd MMM')}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 16,
        marginBottom: 8,
        borderWidth: 1,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    category: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
    subText: { fontSize: 12, marginTop: 2, fontWeight: '500', opacity: 0.8 },
    amount: { fontSize: 16, fontWeight: '800' },
    date: { fontSize: 11, marginTop: 3, fontWeight: '600', opacity: 0.7 }
});
