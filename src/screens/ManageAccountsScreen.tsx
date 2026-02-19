import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, Animated } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { useFocusEffect } from '@react-navigation/native';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../hooks/useTheme';
import { ChevronLeft, Landmark, Wallet, User, Plus, Trash2, Edit2, CheckCircle2, Circle } from 'lucide-react-native';
import { getAccounts, deleteAccount, Account } from '../db/database';
import { getBankIcon } from '../utils/accountIcons';

const ManageAccountsScreen = ({ navigation }: any) => {
    const { currency, theme, accentColor } = useSettingsStore();
    const { themeColors } = useTheme();

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    useFocusEffect(
        useCallback(() => {
            fetchAccounts();
        }, [])
    );

    const fetchAccounts = () => {
        setAccounts(getAccounts());
    };

    const toggleSelection = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleDeleteSingle = (id: number, name: string) => {
        Alert.alert(
            "Delete Account",
            `Are you sure you want to delete "${name}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        deleteAccount(id);
                        fetchAccounts();
                    }
                }
            ]
        );
    };

    const handleDeleteMultiple = () => {
        if (selectedIds.length === 0) return;

        Alert.alert(
            "Delete Multiple",
            `Are you sure you want to delete ${selectedIds.length} accounts?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete All",
                    style: "destructive",
                    onPress: () => {
                        selectedIds.forEach(id => deleteAccount(id));
                        setSelectedIds([]);
                        setIsSelectionMode(false);
                        fetchAccounts();
                    }
                }
            ]
        );
    };

    const renderAccount = (acc: Account) => {
        const isSelected = selectedIds.includes(acc.id);

        return (
            <TouchableOpacity
                key={acc.id}
                activeOpacity={0.7}
                onPress={() => isSelectionMode ? toggleSelection(acc.id) : null}
                onLongPress={() => {
                    if (!isSelectionMode) {
                        setIsSelectionMode(true);
                        setSelectedIds([acc.id]);
                    }
                }}
                style={[
                    styles.card,
                    {
                        backgroundColor: themeColors.surface,
                        borderColor: isSelected ? accentColor : themeColors.border,
                        borderWidth: isSelected ? 2 : 1
                    }
                ]}
            >
                {isSelectionMode ? (
                    <View style={styles.selectionIndicator}>
                        {isSelected ? (
                            <CheckCircle2 size={24} color={accentColor} fill={accentColor + '20'} />
                        ) : (
                            <Circle size={24} color={themeColors.textSecondary} />
                        )}
                    </View>
                ) : null}

                <View style={[styles.iconBox, { backgroundColor: isSelected ? accentColor + '20' : themeColors.background }]}>
                    {getBankIcon(acc.name, acc.type, acc.iconUri, isSelected ? accentColor : undefined, themeColors, 24)}
                </View>

                <View style={{ flex: 1, marginLeft: 15 }}>
                    <Text style={[styles.name, { color: themeColors.text }]}>{acc.name}</Text>
                    <Text style={[styles.type, { color: themeColors.textSecondary }]}>
                        {acc.type === 'WALLET' ? 'Online Wallet' : acc.type === 'MUTUAL_FUND' ? 'Investment' : acc.type.charAt(0) + acc.type.slice(1).toLowerCase()}
                    </Text>
                    <Text style={[styles.balance, { color: themeColors.text }]}>{currency} {acc.balance.toLocaleString()}</Text>
                </View>

                {!isSelectionMode ? (
                    <View style={styles.actions}>
                        {acc.type !== 'MUTUAL_FUND' ? (
                            <TouchableOpacity
                                onPress={() => navigation.navigate('EditAccount', { account: acc })}
                                style={[styles.actionBtn, { backgroundColor: themeColors.background }]}
                            >
                                <Edit2 size={18} color={themeColors.text} />
                            </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                            onPress={() => handleDeleteSingle(acc.id, acc.name)}
                            style={[styles.actionBtn, { backgroundColor: '#EF444415' }]}
                        >
                            <Trash2 size={18} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                ) : null}
            </TouchableOpacity>
        );
    };

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity onPress={() => isSelectionMode ? setIsSelectionMode(false) : navigation.goBack()}>
                        <ChevronLeft color={themeColors.text} size={28} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: themeColors.text }]}>
                        {isSelectionMode ? `${selectedIds.length} Selected` : 'Accounts'}
                    </Text>
                </View>

                {isSelectionMode ? (
                    <TouchableOpacity onPress={handleDeleteMultiple} disabled={selectedIds.length === 0}>
                        <Trash2 color={selectedIds.length > 0 ? "#EF4444" : themeColors.textSecondary} size={28} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={() => navigation.navigate('AddAccount')}>
                        <Plus color={accentColor} size={28} />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
                {accounts.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Landmark size={64} color={themeColors.textSecondary} opacity={0.2} />
                        <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No accounts yet</Text>
                    </View>
                ) : (
                    accounts.map(renderAccount)
                )}
            </ScrollView>

            {isSelectionMode ? (
                <View style={[styles.selectionFooter, { backgroundColor: themeColors.surface, borderTopColor: themeColors.border }]}>
                    <TouchableOpacity
                        style={[styles.footerBtn, { backgroundColor: themeColors.background }]}
                        onPress={() => setSelectedIds(accounts.map(a => a.id))}
                    >
                        <Text style={{ color: themeColors.text, fontWeight: '600' }}>Select All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.footerBtn, { backgroundColor: '#EF4444', opacity: selectedIds.length > 0 ? 1 : 0.5 }]}
                        onPress={handleDeleteMultiple}
                        disabled={selectedIds.length === 0}
                    >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>Delete Selected</Text>
                    </TouchableOpacity>
                </View>
            ) : null}
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerTitle: { fontSize: 22, fontWeight: 'bold' },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    selectionIndicator: {
        marginRight: 12,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    name: { fontSize: 16, fontWeight: 'bold' },
    type: { fontSize: 12 },
    balance: { fontSize: 15, fontWeight: '600', marginTop: 4 },
    actions: { flexDirection: 'row', gap: 8 },
    actionBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: { alignItems: 'center', marginTop: 100, gap: 16 },
    emptyText: { fontSize: 16, fontWeight: '500' },
    selectionFooter: {
        position: 'absolute',
        bottom: 0,
        left: -20,
        right: -20,
        padding: 20,
        flexDirection: 'row',
        gap: 12,
        borderTopWidth: 1,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 5
    },
    footerBtn: {
        flex: 1,
        height: 50,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center'
    }
});

export default ManageAccountsScreen;
