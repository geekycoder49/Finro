import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { ChevronLeft, ChevronRight, Search, Filter, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Plus, Landmark, Wallet, User } from 'lucide-react-native';
import { getTransactions, Transaction } from '../db/database';
import { format } from 'date-fns';
import { getCategoryIcon } from '../utils/categoryIcons';

const AllTransactionsScreen = ({ navigation }: any) => {
    const { currency, theme, accentColor } = useSettingsStore();
    const themeColors = theme === 'dark' ? DARK_THEME : LIGHT_THEME;

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [selectedMonth, setSelectedMonth] = useState(new Date());

    useEffect(() => {
        const trans = getTransactions(1000); // Higher limit for history
        setTransactions(trans);
    }, []);

    const changeMonth = (increment: number) => {
        const newDate = new Date(selectedMonth);
        newDate.setMonth(newDate.getMonth() + increment);
        setSelectedMonth(newDate);
    };

    const filteredTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        const matchesMonth = tDate.getMonth() === selectedMonth.getMonth() &&
            tDate.getFullYear() === selectedMonth.getFullYear();

        const matchesSearch = (t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.fromAccountName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.toAccountName || '').toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesType = filterType === 'ALL' || t.type === filterType;

        return matchesMonth && matchesSearch && matchesType;
    });

    const renderTransaction = (item: Transaction) => {
        const isExpense = item.type === 'EXPENSE';
        const isIncome = item.type === 'INCOME';
        const isTransfer = item.type === 'TRANSFER';
        const isPeople = item.type === 'PEOPLE';

        const categoryIcon = isExpense ? <ArrowUpRight color="#EF4444" size={20} /> :
            isIncome ? <ArrowDownLeft color="#10B981" size={20} /> :
                isTransfer ? <ArrowLeftRight color={accentColor} size={20} /> :
                    <Plus color={accentColor} size={20} />;

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
                    <Text style={[styles.transDescription, { color: themeColors.textSecondary }]}>
                        {isTransfer ? `${item.fromAccountName} → ${item.toAccountName}` :
                            isPeople ? (item.category === 'Lend' || item.category === 'Pay' ? `to ${item.toAccountName}` : `from ${item.fromAccountName}`) :
                                `${item.fromAccountName} ${item.description ? `• ${item.description}` : ''}`}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.transAmount, { color: isExpense ? '#EF4444' : isIncome ? '#10B981' : themeColors.text }]}>
                        {isExpense ? '-' : isIncome ? '+' : ''}{currency} {item.amount.toLocaleString()}
                    </Text>
                    <Text style={[styles.transDate, { color: themeColors.textSecondary }]}>
                        {format(new Date(item.date), 'dd MMM yyyy')}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ChevronLeft color={themeColors.text} size={28} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: themeColors.text }]}>History</Text>
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.monthSelector}>
                <TouchableOpacity onPress={() => changeMonth(-1)}>
                    <ChevronLeft color={themeColors.text} size={24} />
                </TouchableOpacity>
                <Text style={[styles.monthText, { color: themeColors.text }]}>{format(selectedMonth, 'MMMM yyyy')}</Text>
                <TouchableOpacity onPress={() => changeMonth(1)}>
                    <ChevronRight color={themeColors.text} size={24} />
                </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: themeColors.surface }]}>
                <Search color={themeColors.textSecondary} size={20} />
                <TextInput
                    style={[styles.searchInput, { color: themeColors.text }]}
                    placeholder="Search transactions..."
                    placeholderTextColor={themeColors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <View style={styles.filtersSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {['ALL', 'EXPENSE', 'INCOME', 'TRANSFER', 'PEOPLE'].map(type => (
                        <TouchableOpacity
                            key={type}
                            onPress={() => setFilterType(type)}
                            style={[
                                styles.filterChip,
                                { backgroundColor: filterType === type ? accentColor : themeColors.surface, borderColor: themeColors.border }
                            ]}
                        >
                            <Text style={[styles.filterText, { color: filterType === type ? 'white' : themeColors.text }]}>
                                {type.charAt(0) + type.slice(1).toLowerCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 20 }}>
                {filteredTransactions.length > 0 ? (
                    filteredTransactions.map(renderTransaction)
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={{ color: themeColors.textSecondary }}>No transactions found</Text>
                    </View>
                )}
            </ScrollView>
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
    headerTitle: { fontSize: 22, fontWeight: 'bold' },
    monthSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: 'rgba(0,0,0,0.02)',
        padding: 12,
        borderRadius: 12,
    },
    monthText: { fontSize: 16, fontWeight: '600' },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 50,
        borderRadius: 12,
        marginBottom: 16,
    },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
    filtersSection: { marginBottom: 16 },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    filterText: { fontSize: 14, fontWeight: '500' },
    transactionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
    },
    transIconBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    transCategory: { fontSize: 16, fontWeight: '600' },
    transDescription: { fontSize: 12, marginTop: 2 },
    transAmount: { fontSize: 16, fontWeight: '700' },
    transDate: { fontSize: 11, marginTop: 4 },
    emptyState: { padding: 40, alignItems: 'center' },
});

export default AllTransactionsScreen;
