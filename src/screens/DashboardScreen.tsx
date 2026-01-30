import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image, SafeAreaView, StatusBar, Platform } from 'react-native';

import { AnimatedGradientCard } from '../components/AnimatedGradientCard';
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';
import { Plus, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, TrendingUp, TrendingDown, Search, Wallet, Landmark } from 'lucide-react-native';
import { getAccounts, getTransactions, Account, Transaction, getMonthlyStats } from '../db/database';
import { format } from 'date-fns';
import { getCategoryIcon } from '../utils/categoryIcons';
import DonutChart from '../components/DonutChart';

// 1. PLACE YOUR LOCAL ICONS IN: assets/icons/
// 2. Use require() here. It must be static strings.
const LOCAL_ICONS: any = {
    hbl: require('../../assets/icons/hbl.png'),
    ubl: require('../../assets/icons/ubl.png'),
};

const screenWidth = Dimensions.get("window").width;

const DashboardScreen = ({ navigation }: any) => {
    const { userName, currency, theme, accentColor, profileImage } = useSettingsStore();
    const themeColors = theme === 'dark' ? DARK_THEME : LIGHT_THEME;

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState({ income: 0, expense: 0 });
    const [prevStats, setPrevStats] = useState({ income: 0, expense: 0, balance: 0 });
    const [pieData, setPieData] = useState<any[]>([]);
    const [chartType, setChartType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');

    useEffect(() => {
        loadData();
    }, [chartType]);

    const loadData = () => {
        const allAccounts = getAccounts();
        const sortedAccounts = [...allAccounts].sort((a, b) => b.balance - a.balance);
        setAccounts(sortedAccounts);
        const transactions = getTransactions();
        setRecentTransactions(transactions.slice(0, 5));
        const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
        const monthlyStats = getMonthlyStats(currentMonth);
        setStats({
            income: monthlyStats.totalIncome,
            expense: monthlyStats.totalExpense
        });

        // Prepare Chart Data
        const relevantTransactions = transactions.filter(t =>
            t.date.startsWith(currentMonth) && t.type === chartType
        );

        const categoryTotals: Record<string, number> = {};
        relevantTransactions.forEach(t => {
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        });

        const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'];
        const data = Object.keys(categoryTotals).map((cat, index) => ({
            value: categoryTotals[cat],
            color: colors[index % colors.length],
            label: cat
        }));
        setPieData(data);

        // Fetch Last Month Stats for Comparison
        const lastMonthDate = new Date();
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        const lastMonthStr = lastMonthDate.toISOString().substring(0, 7);
        const lastMonthStats = getMonthlyStats(lastMonthStr);

        // Simplified balance MoM: net change last month
        setPrevStats({
            income: lastMonthStats.totalIncome,
            expense: lastMonthStats.totalExpense,
            balance: lastMonthStats.totalIncome - lastMonthStats.totalExpense
        });
    };

    const getBankIcon = (acc: Account) => {
        if (acc.iconUri) {
            return <Image source={{ uri: acc.iconUri }} style={styles.gridIcon} />;
        }

        const name = acc.name.toLowerCase();
        // ... (rest of local icon logic remains)
        if ((name.includes('hbl') || name.includes('habib')) && LOCAL_ICONS.hbl) return <Image source={LOCAL_ICONS.hbl} style={styles.gridIcon} />;
        if ((name.includes('ubl') || name.includes('united')) && LOCAL_ICONS.ubl) return <Image source={LOCAL_ICONS.ubl} style={styles.gridIcon} />;

        let iconUrl = null;
        if (name.includes('hbl') || name.includes('habib')) {
            iconUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/HBL_Logo.svg/500px-HBL_Logo.svg.png';
        } else if (name.includes('ubl') || name.includes('united')) {
            iconUrl = 'https://upload.wikimedia.org/wikipedia/en/thumb/f/fb/UBL_Logo.svg/500px-UBL_Logo.svg.png';
        } else if (name.includes('mcb') || name.includes('muslim')) {
            iconUrl = 'https://upload.wikimedia.org/wikipedia/en/thumb/6/6f/MCB_Bank_Limited_logo.svg/500px-MCB_Bank_Limited_logo.svg.png';
        } else if (name.includes('easypaisa') || name.includes('telenor')) {
            iconUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Easypaisa_Logo.png/400px-Easypaisa_Logo.png';
        } else if (name.includes('jazzcash') || name.includes('mobilink')) {
            iconUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/JazzCash_logo.svg/500px-JazzCash_logo.svg.png';
        }

        if (iconUrl) return <Image source={{ uri: iconUrl }} style={styles.gridIcon} />;
        if (acc.type === 'CASH') return <Wallet size={24} color="#F59E0B" />;
        return <Landmark size={24} color={themeColors.textSecondary} />;
    };

    return (
        <View style={{ flex: 1, backgroundColor: themeColors.background }}>
            <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
            <View style={{ height: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 20 : 50 }} />
            <ScrollView showsVerticalScrollIndicator={false} style={[styles.container, { backgroundColor: themeColors.background }]}>
                <View style={styles.content}>
                    {/* Header */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            {profileImage && (
                                <Image
                                    source={{ uri: profileImage }}
                                    style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: accentColor }}
                                />
                            )}
                            <View>
                                <Text style={[styles.greeting, { color: themeColors.textSecondary }]}>Hello,</Text>
                                <Text style={[styles.userName, { color: themeColors.text, marginBottom: 0 }]}>{userName}</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={{ padding: 10, backgroundColor: themeColors.surface, borderRadius: 12, borderWidth: 1, borderColor: themeColors.border }}
                            onPress={() => navigation.navigate('Search')}
                        >
                            <Search color={themeColors.text} size={24} />
                        </TouchableOpacity>
                    </View>

                    <AnimatedGradientCard
                        primaryColor={accentColor}
                        style={styles.totalCard}
                    >
                        <View style={styles.balanceHeader}>
                            <Text style={styles.totalLabel}>Total Balance</Text>
                            <TrendingUp color="white" size={24} />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
                            <Text style={styles.totalValue}>{currency} {accounts.reduce((sum, acc) => sum + acc.balance, 0).toLocaleString()}</Text>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Income</Text>
                                <Text style={styles.statValue}>+{currency} {stats.income.toLocaleString()}</Text>
                                {prevStats.income > 0 && (
                                    <Text style={styles.compareText}>
                                        {Math.round((stats.income / prevStats.income - 1) * 100)}% vs last month
                                    </Text>
                                )}
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Expense</Text>
                                <Text style={styles.statValue}>-{currency} {stats.expense.toLocaleString()}</Text>
                                {prevStats.expense > 0 && (
                                    <Text style={styles.compareText}>
                                        {Math.round((stats.expense / prevStats.expense - 1) * 100)}% vs last month
                                    </Text>
                                )}
                            </View>
                        </View>
                    </AnimatedGradientCard>

                    {/* Accounts Section (Moved Above Chart) */}
                    <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border, marginTop: 24 }]}>
                        <View style={styles.cardHeader}>
                            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Accounts</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Money')}>
                                <Text style={{ color: accentColor }}>View all</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.accountsGrid}>
                            {accounts.slice(0, 5).map((acc) => (
                                <TouchableOpacity
                                    key={acc.id}
                                    style={[styles.gridItem, { borderColor: themeColors.border, backgroundColor: themeColors.surface }]}
                                    onPress={() => navigation.navigate('Money', { selectedAccountId: acc.id })}
                                >
                                    <View style={styles.gridIconBox}>
                                        {getBankIcon(acc)}
                                    </View>
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={[styles.gridName, { color: themeColors.text }]} numberOfLines={1}>{acc.name}</Text>
                                        {acc.type === 'PERSON' && (
                                            <Text style={{ color: acc.balance >= 0 ? '#10B981' : '#EF4444', fontSize: 9, fontWeight: '600' }}>
                                                {acc.balance >= 0 ? 'owes you' : 'you owe'}
                                            </Text>
                                        )}
                                        <Text style={[styles.gridBalance, { color: themeColors.textSecondary }]}>{currency} {Math.abs(acc.balance).toLocaleString()}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                style={[styles.gridItem, { borderColor: accentColor, borderStyle: 'dashed', backgroundColor: themeColors.background }]}
                                onPress={() => navigation.navigate('AddAccount')}
                            >
                                <View style={styles.gridIconBox}>
                                    <Plus color={accentColor} size={24} />
                                </View>
                                <Text style={{ color: accentColor, fontSize: 13, fontWeight: '600' }}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Chart Section (In Card) */}
                    <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border, marginTop: 20 }]}>
                        <View style={styles.toggleContainer}>
                            <TouchableOpacity
                                style={[styles.toggleBtn, chartType === 'EXPENSE' ? { backgroundColor: '#EF4444' } : null]}
                                onPress={() => setChartType('EXPENSE')}
                            >
                                <Text style={[styles.toggleText, { color: chartType === 'EXPENSE' ? 'white' : themeColors.textSecondary }]}>Expense</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.toggleBtn, chartType === 'INCOME' ? { backgroundColor: '#10B981' } : null]}
                                onPress={() => setChartType('INCOME')}
                            >
                                <Text style={[styles.toggleText, { color: chartType === 'INCOME' ? 'white' : themeColors.textSecondary }]}>Income</Text>
                            </TouchableOpacity>
                        </View>

                        {pieData.length > 0 ? (
                            <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                                <DonutChart
                                    data={pieData}
                                    currency={currency}
                                    textColor={themeColors.text}
                                    radius={70}
                                    innerRadius={45}
                                />
                            </View>
                        ) : (
                            <View style={{ height: 150, justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={{ color: themeColors.textSecondary }}>No {chartType.toLowerCase()} data this month</Text>
                            </View>
                        )}
                    </View>

                    {/* Recent Transactions (In Card) */}
                    <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border, marginTop: 20 }]}>
                        <View style={styles.cardHeader}>
                            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Recent Activity</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('AllTransactions')}>
                                <Text style={{ color: accentColor }}>View all</Text>
                            </TouchableOpacity>
                        </View>

                        {recentTransactions.map((item, index) => {
                            const isExpense = item.type === 'EXPENSE';
                            const isIncome = item.type === 'INCOME';
                            const isTransfer = item.type === 'TRANSFER';
                            const isPeople = item.type === 'PEOPLE';
                            const isLast = index === recentTransactions.length - 1;

                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.transactionRow, { borderBottomWidth: isLast ? 0 : 1, borderBottomColor: themeColors.border }]}
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
                                        <Text style={[styles.transDate, { color: themeColors.textSecondary }]}>
                                            {format(new Date(item.date), 'dd MMM')}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                        {recentTransactions.length === 0 && (
                            <Text style={{ color: themeColors.textSecondary, textAlign: 'center', padding: 20 }}>No usage yet!</Text>
                        )}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20, paddingTop: 10, paddingBottom: 20 },
    greeting: { fontSize: 14 },
    userName: { fontSize: 20, fontWeight: 'bold' },

    card: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        // Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold' },

    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    toggleText: { fontWeight: '600', fontSize: 14 },

    // Accounts
    accountCard: {
        width: 140,
        padding: 16,
        borderRadius: 16,
        marginRight: 12,
        borderWidth: 1,
    },
    accName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
    accBalance: { fontSize: 16, fontWeight: 'bold' },
    addAccountCard: {
        width: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 2,
        borderStyle: 'dashed',
        marginRight: 10,
    },

    // Grid Accounts
    accountsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 0,
    },
    gridItem: {
        width: '31%',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
    },
    gridIconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    gridIcon: {
        width: 36,
        height: 36,
        borderRadius: 8,
        resizeMode: 'contain',
    },
    gridName: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 2,
        textAlign: 'center',
    },
    gridBalance: {
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'center',
    },
    // Account Grid Styles
    accountGridItem: {
        height: 36,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        borderRadius: 18,
        borderWidth: 1,
        marginBottom: 8,
        gap: 6,
    },
    accIconBox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    accountGridName: { fontSize: 12, fontWeight: '600' },

    // Transactions
    transactionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
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

    // Balance Card Styles
    totalCard: {
        borderRadius: 20,
        padding: 24,
        minHeight: 180,
        marginBottom: 24
    },
    balanceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    totalLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '500' },
    totalValue: { color: 'white', fontSize: 36, fontWeight: 'bold', marginBottom: 20 },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statItem: {
        flex: 1,
    },
    statLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        marginBottom: 4,
    },
    statValue: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    compareText: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
});

export default DashboardScreen;
