import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Image } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Plus, ChevronDown, ChevronLeft, ChevronRight, Wallet, Landmark, User, Search, Settings, ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from 'lucide-react-native';
import { getAccounts, getTransactions, Account, Transaction } from '../db/database';
import { format, addMonths } from 'date-fns';
import { getCategoryIcon } from '../utils/categoryIcons';

const MoneyScreen = ({ navigation, route }: any) => {
    const { currency, theme, accentColor } = useSettingsStore();
    const themeColors = theme === 'dark' ? DARK_THEME : LIGHT_THEME;

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [selectedAccountId, setSelectedAccountId] = useState<number | null>(route.params?.selectedAccountId || null);
    const [showAccountPicker, setShowAccountPicker] = useState(false);

    useEffect(() => {
        if (route.params?.selectedAccountId) {
            setSelectedAccountId(route.params.selectedAccountId);
        }
    }, [route.params?.selectedAccountId]);

    useEffect(() => {
        fetchData();
    }, [selectedMonth, selectedAccountId]);

    const fetchData = () => {
        const accs = getAccounts();
        const monthStr = format(selectedMonth, 'yyyy-MM');
        const trans = getTransactions(50, monthStr, selectedAccountId || undefined);

        setAccounts(accs);
        setTransactions(trans);
    };

    const changeMonth = (increment: number) => {
        setSelectedMonth(prev => addMonths(prev, increment));
    };

    const selectedAccount = accounts.find(a => a.id === selectedAccountId);

    const renderAccountIcon = (account: Account, size = 20) => {
        if (account.iconUri) {
            return <Image source={{ uri: account.iconUri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
        }
        return account.type === 'BANK' ? <Landmark size={size} color={accentColor} /> :
            account.type === 'CASH' ? <Wallet size={size} color={accentColor} /> :
                <User size={size} color={accentColor} />;
    };

    const renderTransaction = (item: Transaction) => {
        const isExpense = item.type === 'EXPENSE';
        const isIncome = item.type === 'INCOME';
        const isTransfer = item.type === 'TRANSFER';
        const isPeople = item.type === 'PEOPLE';

        return (
            <TouchableOpacity
                key={item.id}
                style={[styles.transactionRow, { backgroundColor: themeColors.surface }]}
                onPress={() => navigation.navigate('EditTransaction', { transaction: item })}
            >
                <View style={[styles.transIconBox, { backgroundColor: themeColors.background }]}>
                    {isTransfer ? getCategoryIcon('Transfer', 20, accentColor) :
                        isPeople ? (
                            (item.category === 'Lend' || item.category === 'Pay') ?
                                <ArrowUpRight size={20} color="#EF4444" /> :
                                <ArrowDownLeft size={20} color="#10B981" />
                        ) :
                            getCategoryIcon(item.category, 20, isExpense ? '#EF4444' : '#10B981')}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.transCategory, { color: themeColors.text }]}>
                        {(isTransfer || isPeople) ?
                            (item.category && item.category !== 'Transfer' ? `Transfer (${item.category})` : 'Transfer') :
                            (item.category || 'No Category')}
                    </Text>
                    <Text style={[styles.transSub, { color: themeColors.textSecondary }]}>
                        {isTransfer ? `${item.fromAccountName} → ${item.toAccountName}` :
                            isPeople ? (item.category === 'Lend' || item.category === 'Pay' ? `to ${item.toAccountName}` : `from ${item.fromAccountName}`) :
                                item.fromAccountName}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.transAmount, { color: isExpense ? '#EF4444' : isIncome ? '#10B981' : themeColors.text }]}>
                        {isExpense ? '-' : isIncome ? '+' : ''}{currency} {item.amount.toLocaleString()}
                    </Text>
                    <Text style={[styles.transDate, { color: themeColors.textSecondary }]}>{format(new Date(item.date), 'dd MMM')}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: themeColors.text }]}>Money</Text>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                    <TouchableOpacity onPress={() => navigation.navigate('Search')}>
                        <Search color={themeColors.text} size={24} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('ManageAccounts')}>
                        <Settings color={themeColors.text} size={24} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Account Dropdown Selector */}
            <View style={styles.selectorContainer}>
                <TouchableOpacity
                    style={[styles.dropdown, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                    onPress={() => setShowAccountPicker(true)}
                >
                    <View style={styles.dropdownInner}>
                        <View style={[styles.iconBox, { backgroundColor: accentColor + '20' }]}>
                            {selectedAccount ? renderAccountIcon(selectedAccount, 18) : <Landmark size={18} color={accentColor} />}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.dropdownText, { color: themeColors.text }]} numberOfLines={1}>
                                {selectedAccount ? selectedAccount.name : 'All Accounts'}
                            </Text>
                            {selectedAccount?.type === 'PERSON' && (
                                <Text style={{ color: selectedAccount.balance >= 0 ? '#10B981' : '#EF4444', fontSize: 11, fontWeight: '600' }}>
                                    {selectedAccount.balance >= 0 ? `${selectedAccount.name} owes you` : `You owe ${selectedAccount.name}`} {currency} {Math.abs(selectedAccount.balance).toLocaleString()}
                                </Text>
                            )}
                        </View>
                    </View>
                    <ChevronDown size={20} color={themeColors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.manageBtn, { backgroundColor: accentColor + '15' }]}
                    onPress={() => navigation.navigate('ManageAccounts')}
                >
                    <Text style={{ color: accentColor, fontWeight: '600', fontSize: 13 }}>Manage Accounts</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.monthSelector}>
                <TouchableOpacity onPress={() => changeMonth(-1)}>
                    <ChevronLeft color={themeColors.text} size={24} />
                </TouchableOpacity>
                <View style={styles.monthTextContainer}>
                    <Text style={[styles.monthText, { color: themeColors.text }]}>{format(selectedMonth, 'MMMM yyyy')}</Text>
                </View>
                <TouchableOpacity onPress={() => changeMonth(1)}>
                    <ChevronRight color={themeColors.text} size={24} />
                </TouchableOpacity>
            </View>

            <View style={styles.transactionsHeader}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Transactions</Text>
                <TouchableOpacity onPress={() => navigation.navigate('AllTransactions')}>
                    <Text style={{ color: accentColor }}>View More</Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {transactions.length > 0 ? (
                    transactions.map(renderTransaction)
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={{ color: themeColors.textSecondary }}>No transactions found</Text>
                    </View>
                )}
            </ScrollView>

            {/* Account Picker Modal */}
            <Modal visible={showAccountPicker} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowAccountPicker(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
                        <Text style={[styles.modalTitle, { color: themeColors.text }]}>Select Account</Text>
                        <ScrollView>
                            <TouchableOpacity
                                style={styles.accountOption}
                                onPress={() => { setSelectedAccountId(null); setShowAccountPicker(false); }}
                            >
                                <View style={[styles.iconBox, { backgroundColor: accentColor + '20' }]}>
                                    <Landmark size={18} color={accentColor} />
                                </View>
                                <Text style={[styles.accountOptionText, { color: themeColors.text, fontWeight: selectedAccountId === null ? 'bold' : 'normal' }]}>All Accounts</Text>
                            </TouchableOpacity>
                            {accounts.map(acc => (
                                <TouchableOpacity
                                    key={acc.id}
                                    style={styles.accountOption}
                                    onPress={() => { setSelectedAccountId(acc.id); setShowAccountPicker(false); }}
                                >
                                    <View style={[styles.iconBox, { backgroundColor: accentColor + '20' }]}>
                                        {renderAccountIcon(acc, 18)}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.accountOptionText, { color: themeColors.text, fontWeight: selectedAccountId === acc.id ? 'bold' : 'normal' }]}>{acc.name}</Text>
                                        {acc.type === 'PERSON' ? (
                                            <Text style={{ color: acc.balance >= 0 ? '#10B981' : '#EF4444', fontSize: 12, fontWeight: '500' }}>
                                                {acc.balance >= 0 ? `${acc.name} owes you` : `You owe ${acc.name}`} {currency} {Math.abs(acc.balance).toLocaleString()}
                                            </Text>
                                        ) : (
                                            <Text style={{ color: themeColors.textSecondary, fontSize: 12 }}>{currency} {acc.balance.toLocaleString()}</Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            style={[styles.closeModalBtn, { backgroundColor: themeColors.background }]}
                            onPress={() => setShowAccountPicker(false)}
                        >
                            <Text style={{ color: themeColors.text }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: { fontSize: 24, fontWeight: 'bold' },
    selectorContainer: {
        marginBottom: 24,
        gap: 12
    },
    dropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
    },
    dropdownInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    dropdownText: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
    manageBtn: {
        padding: 12,
        borderRadius: 12,
        alignItems: 'center'
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    monthSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: 'rgba(0,0,0,0.03)',
        padding: 10,
        borderRadius: 12
    },
    monthTextContainer: { flex: 1, alignItems: 'center' },
    monthText: { fontSize: 16, fontWeight: '600' },
    transactionsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    sectionTitle: { fontSize: 18, fontWeight: '700' },
    transactionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        marginBottom: 10
    },
    transIconBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    transCategory: { fontSize: 16, fontWeight: '600' },
    transSub: { fontSize: 12, marginTop: 2 },
    transDate: { fontSize: 11, marginTop: 4 },
    transAmount: { fontSize: 16, fontWeight: '700' },
    emptyState: { padding: 40, alignItems: 'center' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20
    },
    modalContent: {
        borderRadius: 24,
        padding: 20,
        maxHeight: '70%'
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
    accountOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        gap: 12
    },
    accountOptionText: { fontSize: 16 },
    closeModalBtn: {
        marginTop: 20,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center'
    }
});

export default MoneyScreen;
