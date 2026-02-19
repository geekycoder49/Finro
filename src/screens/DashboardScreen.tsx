import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image, SafeAreaView, StatusBar, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';
import { Plus, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, TrendingUp, TrendingDown, Search, Wallet, Landmark, ChevronRight, ArrowUp, ArrowDown, CreditCard, ArrowDownCircle } from 'lucide-react-native';
import { useTheme } from '../hooks/useTheme';
import { getAccounts, getTransactions, Account, Transaction, getMonthlyStats } from '../db/database';
import { format } from 'date-fns';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { getBankIcon } from '../utils/accountIcons';
import { TransactionCard } from '../components/TransactionCard';
import { LinearGradient } from 'expo-linear-gradient';

const screenWidth = Dimensions.get("window").width;

const DashboardScreen = ({ navigation }: any) => {
    const { userName, currency, theme, accentColor, profileImage } = useSettingsStore();
    const { themeColors } = useTheme();

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState({ income: 0, expense: 0 });
    const [prevStats, setPrevStats] = useState({ income: 0, expense: 0, balance: 0 });

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = () => {
        const allAccounts = getAccounts();
        const sortedAccounts = [...allAccounts].sort((a, b) => b.balance - a.balance);
        setAccounts(sortedAccounts);
        const transactions = getTransactions(5);
        setRecentTransactions(transactions);

        const currentMonth = new Date().toISOString().substring(0, 7);
        const monthlyStats = getMonthlyStats(currentMonth);
        setStats({
            income: monthlyStats.totalIncome,
            expense: monthlyStats.totalExpense
        });

        // Last Month Comparison
        const lastMonthDate = new Date();
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        const lastMonthStr = lastMonthDate.toISOString().substring(0, 7);
        const lastMonthStats = getMonthlyStats(lastMonthStr);

        setPrevStats({
            income: lastMonthStats.totalIncome,
            expense: lastMonthStats.totalExpense,
            balance: lastMonthStats.totalIncome - lastMonthStats.totalExpense
        });
    };

    const getPercentageChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? '+100%' : '0%';
        const change = ((current - previous) / previous) * 100;
        return (change >= 0 ? '+' : '') + Math.round(change) + '%';
    };

    return (
        <ScreenWrapper scroll={true} noPadding={true}>
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        {profileImage ? (
                            <Image source={{ uri: profileImage }} style={styles.profileImage} />
                        ) : (
                            <View style={[styles.profilePlaceholder, { backgroundColor: accentColor + '20' }]}>
                                <Text style={[{ color: accentColor, fontWeight: 'bold', fontSize: 18 }]}>{userName ? userName.charAt(0) : '?'}</Text>
                            </View>
                        )}
                        <View>
                            <Text style={[styles.greeting, { color: themeColors.textSecondary }]}>Hello,</Text>
                            <Text style={[styles.userName, { color: themeColors.text }]}>{userName}</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.searchBtn, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                        onPress={() => navigation.navigate('Search')}
                    >
                        <Search color={themeColors.text} size={22} />
                    </TouchableOpacity>
                </View>

                {/* Total Balance Card */}
                <View style={[styles.totalCard, { backgroundColor: accentColor, overflow: 'hidden' }]}>
                    <View style={{ position: 'absolute', right: -20, top: -20, opacity: 0.1 }}>
                        <Wallet size={150} color="white" />
                    </View>

                    <View style={styles.balanceHeader}>
                        <Text style={[styles.totalLabel]}>Total Balance</Text>
                        <TrendingUp color="white" size={24} />
                    </View>
                    <Text
                        style={[styles.totalValue]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                    >
                        {currency} {accounts.reduce((sum, acc) => sum + acc.balance, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </Text>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statLabel]}>Income</Text>
                            <Text style={[styles.statValue]}>+{currency} {stats.income.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                            {prevStats.income > 0 ? (
                                <Text style={[styles.compareText]}>
                                    {getPercentageChange(stats.income, prevStats.income)} vs last month
                                </Text>
                            ) : null}
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statLabel]}>Expense</Text>
                            <Text style={[styles.statValue]}>-{currency} {stats.expense.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                            {prevStats.expense > 0 ? (
                                <Text style={[styles.compareText]}>
                                    {getPercentageChange(stats.expense, prevStats.expense)} vs last month
                                </Text>
                            ) : null}
                        </View>
                    </View>
                </View>

                {/* Accounts Section */}
                <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Accounts</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Money')}>
                        <Text style={[{ color: accentColor, fontWeight: '600' }]}>View all</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountsScroll}>
                    <TouchableOpacity
                        style={[styles.accountGridItem, { borderColor: '#10B981', backgroundColor: '#10B98110' }]}
                        onPress={() => navigation.navigate('MutualFunds')}
                    >
                        <View style={[styles.gridIconBox, { backgroundColor: '#10B98120' }]}>
                            <TrendingUp color="#10B981" size={24} />
                        </View>
                        <Text style={[styles.gridName, { color: themeColors.text }]}>Investments</Text>
                        <Text style={[styles.gridBalance, { color: '#10B981', textAlign: 'center' }]}>{currency} {accounts.filter(a => a.type === 'MUTUAL_FUND').reduce((sum, a) => sum + a.balance, 0).toLocaleString()}</Text>
                    </TouchableOpacity>

                    {accounts.filter(a => a.type !== 'MUTUAL_FUND').slice(0, 5).map((acc) => (
                        <TouchableOpacity
                            key={acc.id}
                            style={[styles.accountGridItem, { borderColor: themeColors.border, backgroundColor: themeColors.surface }]}
                            onPress={() => navigation.push('Main', { screen: 'Money', params: { selectedAccountId: acc.id } })}
                        >
                            <View style={styles.gridIconBox}>
                                {getBankIcon(acc.name, acc.type, acc.iconUri, accentColor, themeColors, 28)}
                            </View>
                            <Text style={[styles.gridName, { color: themeColors.text }]}>{acc.name}</Text>
                            <Text style={[styles.gridBalance, { color: themeColors.textSecondary }]}>{currency} {Math.abs(acc.balance).toLocaleString()}</Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                        style={[styles.accountGridItem, { borderColor: accentColor, borderStyle: 'dashed', backgroundColor: themeColors.background }]}
                        onPress={() => navigation.navigate('AddAccount')}
                    >
                        <View style={[styles.gridIconBox, { backgroundColor: accentColor + '10' }]}>
                            <Plus color={accentColor} size={24} />
                        </View>
                        <Text style={[{ color: accentColor, fontSize: 13, fontWeight: '700' }]}>Add New</Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* Quick Actions Section */}
                <View style={styles.quickActionsContainer}>
                    <TouchableOpacity
                        style={[styles.quickActionBtn, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                        onPress={() => navigation.navigate('AddTransaction', { mode: 'ATM' })}
                    >
                        <View style={[styles.quickIconBox, { backgroundColor: '#3B82F620' }]}>
                            <CreditCard color="#3B82F6" size={20} />
                        </View>
                        <Text style={[styles.quickActionLabel, { color: themeColors.text }]}>ATM</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.quickActionBtn, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                        onPress={() => navigation.navigate('AddTransaction', { initialTab: 'Transfer' })}
                    >
                        <View style={[styles.quickIconBox, { backgroundColor: '#8B5CF620' }]}>
                            <ArrowLeftRight color="#8B5CF6" size={20} />
                        </View>
                        <Text style={[styles.quickActionLabel, { color: themeColors.text }]}>Transfer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.quickActionBtn, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                        onPress={() => navigation.navigate('AddTransaction', { initialTab: 'Expense' })}
                    >
                        <View style={[styles.quickIconBox, { backgroundColor: '#EF444420' }]}>
                            <ArrowDownCircle color="#EF4444" size={20} />
                        </View>
                        <Text style={[styles.quickActionLabel, { color: themeColors.text }]}>Expense</Text>
                    </TouchableOpacity>
                </View>

                {/* Financial Tools Section */}
                <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Financial Tools</Text>
                </View>

                <View style={[styles.toolsContainer, { marginBottom: 24 }]}>
                    <TouchableOpacity
                        style={[styles.toolCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                        onPress={() => navigation.navigate('SIPCalculator')}
                    >
                        <View style={[styles.toolIconBox, { backgroundColor: '#8B5CF620' }]}>
                            <TrendingUp color="#8B5CF6" size={24} />
                        </View>
                        <View>
                            <Text style={[styles.toolTitle, { color: themeColors.text }]}>SIP Calculator</Text>
                            <Text style={{ fontSize: 11, color: themeColors.textSecondary }}>Returns</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.toolCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                        onPress={() => navigation.navigate('GoalCalculator')}
                    >
                        <View style={[styles.toolIconBox, { backgroundColor: '#10B98120' }]}>
                            <Landmark color="#10B981" size={24} />
                        </View>
                        <View>
                            <Text style={[styles.toolTitle, { color: themeColors.text }]}>Goal Planner</Text>
                            <Text style={{ fontSize: 11, color: themeColors.textSecondary }}>Planning</Text>
                        </View>
                    </TouchableOpacity>
                </View>





                {/* Recent Transactions */}
                <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Recent Activity</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('AllTransactions')}>
                        <Text style={[{ color: accentColor, fontWeight: '600' }]}>See History</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ marginTop: 12, paddingBottom: 2 }}>
                    {recentTransactions.map((item) => (
                        <TransactionCard
                            key={item.id}
                            item={item}
                            onPress={(t) => navigation.navigate('EditTransaction', { transaction: t })}
                        />
                    ))}
                    {recentTransactions.length === 0 ? (
                        <View style={styles.emptyTransactions}>
                            <Text style={{ color: themeColors.textSecondary }}>No transactions yet</Text>
                        </View>
                    ) : null}
                </View>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    content: { paddingHorizontal: 20, paddingBottom: 0, paddingTop: 10 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    profileImage: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#fff' },
    profilePlaceholder: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    greeting: { fontSize: 13, fontWeight: '500' },
    userName: { fontSize: 18, fontWeight: '800' },
    searchBtn: { padding: 10, borderRadius: 14, borderWidth: 1 },

    totalCard: { borderRadius: 24, padding: 24, marginBottom: 20, minHeight: 190, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
    totalLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    totalValue: { color: 'white', fontSize: 34, fontWeight: '900', marginVertical: 12 },
    balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
    statItem: { flex: 1 },
    statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 4 },
    statValue: { color: 'white', fontSize: 16, fontWeight: '700' },
    compareText: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    miniStat: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    miniStatVal: { color: 'white', fontSize: 12, fontWeight: '700' },



    summaryGrid: { flexDirection: 'row', gap: 12 },
    summaryCard: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, borderWidth: 1, gap: 12 },
    summaryIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    summaryLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    summaryValue: { fontSize: 16, fontWeight: '900' },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
    accountsScroll: { gap: 12, paddingRight: 20 },
    accountGridItem: { width: 130, padding: 16, borderRadius: 24, borderWidth: 1, alignItems: 'center' },
    gridIconBox: { width: 52, height: 52, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    gridName: { fontSize: 13, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
    gridBalance: { fontSize: 14, fontWeight: '800' },

    emptyTransactions: { padding: 40, alignItems: 'center' },
    quickActionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 24,
        gap: 12
    },
    quickActionBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 8,
        borderRadius: 18,
        borderWidth: 1,
        gap: 8
    },
    quickIconBox: {
        width: 40,
        height: 40,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4
    },
    quickActionLabel: {
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center'
    },

    toolsContainer: { flexDirection: 'row', gap: 12 },
    toolCard: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, borderWidth: 1, gap: 12 },
    toolIconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    toolTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 }
});

export default DashboardScreen;

