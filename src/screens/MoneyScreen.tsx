import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Image, Dimensions, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../hooks/useTheme';
import { Plus, ChevronDown, ChevronLeft, ChevronRight, Wallet, Landmark, User, Search, Settings, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, TrendingUp, Calendar, Filter } from 'lucide-react-native';
import { getAccounts, getTransactionsForRange, getAccountStatsForRange, Account, Transaction } from '../db/database';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from 'date-fns';
import { getCategoryIcon } from '../utils/categoryIcons';
import { getBankIcon, getAccountColors } from '../utils/accountIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { getAMCIconSource } from '../utils/amcIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TransactionCard } from '../components/TransactionCard';

const screenWidth = Dimensions.get('window').width;

const MoneyScreen = ({ navigation, route }: any) => {
    const { currency, theme, accentColor } = useSettingsStore();
    const { themeColors } = useTheme();

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<number | null>(route.params?.selectedAccountId || null);
    const [selectedPeriod, setSelectedPeriod] = useState<'WEEK' | 'MONTH' | 'YEAR' | 'ALL' | 'CUSTOM'>('MONTH');
    const [dateRange, setDateRange] = useState<{ start: Date, end: Date }>({
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date())
    });
    const [stats, setStats] = useState({ income: 0, expense: 0 });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateType, setDateType] = useState<'START' | 'END'>('START');

    useEffect(() => {
        if (route.params?.selectedAccountId) {
            setSelectedAccountId(route.params.selectedAccountId);
        }
    }, [route.params?.selectedAccountId]);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [selectedAccountId, dateRange])
    );

    useEffect(() => {
        if (selectedPeriod === 'CUSTOM') return;

        const now = new Date();
        let start = now;
        let end = now;

        switch (selectedPeriod) {
            case 'WEEK':
                start = startOfWeek(now, { weekStartsOn: 1 });
                end = endOfWeek(now, { weekStartsOn: 1 });
                break;
            case 'MONTH':
                start = startOfMonth(now);
                end = endOfMonth(now);
                break;
            case 'YEAR':
                start = startOfYear(now);
                end = endOfYear(now);
                break;
            case 'ALL':
                start = new Date(2000, 0, 1);
                end = new Date(2100, 0, 1);
                break;
        }
        setDateRange({ start, end });
    }, [selectedPeriod]);

    const fetchData = async () => {
        const accs = getAccounts();
        setAccounts(accs);

        const startStr = format(dateRange.start, 'yyyy-MM-dd');
        const endStr = format(dateRange.end, 'yyyy-MM-dd');

        // If no account selected, we might want to show all but focusing on one is better for "Money" screen in context of this request
        if (selectedAccountId) {
            const trans = getTransactionsForRange(100, startStr, endStr, selectedAccountId);
            setTransactions(trans);
            const rangeStats = getAccountStatsForRange(selectedAccountId, startStr, endStr);
            setStats(rangeStats);
        } else if (accs.length > 0) {
            setSelectedAccountId(accs[0].id);
        }
    };

    const selectedAccount = accounts.find(a => a.id === selectedAccountId);
    const cardColors = selectedAccount
        ? getAccountColors(
            selectedAccount.type === 'MUTUAL_FUND' ? `${selectedAccount.amcName} ${selectedAccount.name}` : selectedAccount.name,
            selectedAccount.type,
            accentColor
        )
        : [accentColor, accentColor];

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

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Account Adaptive Card */}
                {selectedAccount ? (
                    <LinearGradient
                        colors={cardColors as any}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.mainCard}
                    >
                        {/* Background Decoration */}
                        <View style={styles.cardDecor}>
                            {(() => {
                                if (selectedAccount.type === 'MUTUAL_FUND') {
                                    const amcIcon = getAMCIconSource(selectedAccount.amcName || '');
                                    if (amcIcon) return <Image source={amcIcon} style={{ width: 140, height: 140, opacity: 0.15 }} resizeMode="contain" />;
                                }
                                return getBankIcon(selectedAccount.name, selectedAccount.type, selectedAccount.iconUri, 'white', undefined, 140);
                            })()}
                        </View>

                        <View style={{ paddingHorizontal: 4 }}>
                            {/* Top Row: Logo + Info */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                                <View style={styles.cardLogoBox}>
                                    {(() => {
                                        if (selectedAccount.type === 'MUTUAL_FUND') {
                                            const amcIcon = getAMCIconSource(selectedAccount.amcName || '');
                                            if (amcIcon) return <Image source={amcIcon} style={{ width: 40, height: 40, borderRadius: 8 }} resizeMode="contain" />;
                                        }
                                        return getBankIcon(selectedAccount.name, selectedAccount.type, selectedAccount.iconUri, 'white', undefined, 40);
                                    })()}
                                </View>
                                <View style={{ marginLeft: 14 }}>
                                    <Text style={[styles.cardAccountName]}>{selectedAccount.name}</Text>
                                    <Text style={[styles.cardBalanceValue]}>{currency} {selectedAccount.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                                </View>
                            </View>

                            {/* Bottom Row: Stats */}
                            <View style={styles.statsRow}>
                                <View style={styles.statBox}>
                                    <View style={styles.statIconIn}>
                                        <ArrowDownLeft size={14} color="#10B981" />
                                    </View>
                                    <View>
                                        <Text style={[styles.statLabel]}>
                                            {selectedAccount.type === 'PERSON' ? 'Received' : (selectedAccount.type === 'MUTUAL_FUND' ? 'In/Profit' : 'In')}
                                        </Text>
                                        <Text style={[styles.statValue]}>+{currency} {stats.income.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                                    </View>
                                </View>

                                <View style={[styles.statBox, { alignItems: 'flex-end' }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <View>
                                            <Text style={[styles.statLabel, { textAlign: 'right' }]}>
                                                {selectedAccount.type === 'PERSON' ? 'Sent' : (selectedAccount.type === 'MUTUAL_FUND' ? 'Out/Loss' : 'Out')}
                                            </Text>
                                            <Text style={[styles.statValue, { textAlign: 'right' }]}>-{currency} {stats.expense.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                                        </View>
                                        <View style={styles.statIconOut}>
                                            <ArrowUpRight size={14} color="#EF4444" />
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {selectedAccount.type === 'PERSON' ? (
                                <View style={[styles.infoTag, { backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', marginTop: 12 }]}>
                                    <Text style={[styles.infoTagText]}>
                                        {selectedAccount.balance >= 0 ? `To Receive` : `To Pay`}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    </LinearGradient>
                ) : null}

                {/* Account Selector Scroll */}
                <View style={styles.scrollSection}>
                    <Text style={[styles.sectionSubtitle, { color: themeColors.textSecondary }]}>Select Account</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountScrollView}>
                        {accounts.map(acc => (
                            <TouchableOpacity
                                key={acc.id}
                                style={[
                                    styles.accountChip,
                                    { backgroundColor: selectedAccountId === acc.id ? accentColor : themeColors.surface, borderColor: themeColors.border }
                                ]}
                                onPress={() => setSelectedAccountId(acc.id)}
                            >
                                {(() => {
                                    if (acc.type === 'MUTUAL_FUND') {
                                        const amcIcon = getAMCIconSource(acc.amcName || '');
                                        if (amcIcon) return <Image source={amcIcon} style={{ width: 18, height: 18, borderRadius: 4 }} />;
                                    }
                                    return getBankIcon(acc.name, acc.type, acc.iconUri, selectedAccountId === acc.id ? 'white' : accentColor, themeColors, 18);
                                })()}
                                <Text style={[styles.accountChipText, { color: selectedAccountId === acc.id ? 'white' : themeColors.text }]}>{acc.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Period Filters */}
                <View style={styles.scrollSection}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={[styles.sectionSubtitle, { color: themeColors.textSecondary, marginBottom: 0 }]}>Time Period</Text>
                        {selectedPeriod === 'CUSTOM' ? (
                            <Text style={{ fontSize: 11, color: accentColor, fontWeight: '600' }}>
                                {format(dateRange.start, 'dd MMM')} - {format(dateRange.end, 'dd MMM')}
                            </Text>
                        ) : null}
                    </View>
                    <View style={styles.filterRow}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                            {(['ALL', 'WEEK', 'MONTH', 'YEAR'] as const).map(p => (
                                <TouchableOpacity
                                    key={p}
                                    style={[
                                        styles.filterChip,
                                        { backgroundColor: selectedPeriod === p ? themeColors.text : themeColors.surface, borderColor: themeColors.border }
                                    ]}
                                    onPress={() => setSelectedPeriod(p)}
                                >
                                    <Text style={[styles.filterChipText, { color: selectedPeriod === p ? themeColors.background : themeColors.text }]}>{p}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            style={[styles.calendarBtn, { backgroundColor: selectedPeriod === 'CUSTOM' ? accentColor : themeColors.surface, borderColor: themeColors.border }]}
                            onPress={() => {
                                setSelectedPeriod('CUSTOM');
                                setDateType('START');
                                setShowDatePicker(true);
                            }}
                        >
                            <Calendar size={18} color={selectedPeriod === 'CUSTOM' ? 'white' : themeColors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Transactions */}
                <View style={styles.transactionsHeader}>
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Recent Transactions</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('AllTransactions')}>
                        <Text style={[{ color: accentColor, fontWeight: '600' }]}>View History</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ paddingBottom: 100 }}>
                    {transactions.length > 0 ? (
                        transactions.map((item) => (
                            <TransactionCard
                                key={item.id}
                                item={item}
                                onPress={(t) => navigation.navigate('EditTransaction', { transaction: t })}
                            />
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={[{ color: themeColors.textSecondary }]}>No transactions in this period</Text>
                        </View>
                    )}
                </View>
            </ScrollView>



            {showDatePicker ? (
                <DateTimePicker
                    value={dateType === 'START' ? dateRange.start : dateRange.end}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                        setShowDatePicker(false);
                        if (date) {
                            if (dateType === 'START') {
                                setDateRange({ ...dateRange, start: date });
                                setTimeout(() => {
                                    setDateType('END');
                                    setShowDatePicker(true);
                                }, 500);
                            } else {
                                setDateRange({ ...dateRange, end: date });
                            }
                        }
                    }}
                />
            ) : null}
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
    headerTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
    mainCard: {
        width: '100%',
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 24,
        minHeight: 180,
        overflow: 'hidden',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        marginBottom: 20
    },
    cardDecor: {
        position: 'absolute',
        right: -30,
        top: -30,
        opacity: 0.15,
        transform: [{ rotate: '-10deg' }]
    },
    cardContent: {
        flex: 1,
    },
    cardLogoBox: {
        width: 50,
        height: 50,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)'
    },
    cardAccountName: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
        textShadowColor: 'rgba(0,0,0,0.1)',
        textShadowRadius: 4,
        textShadowOffset: { width: 0, height: 2 }
    },
    cardBalanceLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    cardBalanceValue: {
        color: 'white',
        fontSize: 26,
        fontWeight: '900',
        marginTop: 2
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.15)',
        paddingTop: 16,
        marginTop: 4
    },
    statBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    statIconIn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statIconOut: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 1
    },
    statValue: {
        color: 'white',
        fontSize: 13,
        fontWeight: '800'
    },
    infoTag: {
        marginTop: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    infoTagText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '700'
    },
    scrollSection: {
        marginBottom: 20
    },
    sectionSubtitle: {
        fontSize: 13,
        fontWeight: '800',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    accountScrollView: {
        gap: 10,
        paddingRight: 20
    },
    accountChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 15,
        borderWidth: 1,
    },
    accountChipText: {
        fontSize: 14,
        fontWeight: '700'
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    filterChip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 15,
        borderWidth: 1,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '800'
    },
    calendarBtn: {
        width: 44,
        height: 44,
        borderRadius: 15,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    transactionsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 16
    },
    sectionTitle: { fontSize: 18, fontWeight: '800' },
    transactionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 20,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5
    },
    transIconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    transCategory: { fontSize: 16, fontWeight: '700' },
    transSub: { fontSize: 12, marginTop: 2 },
    transDate: { fontSize: 11, marginTop: 4 },
    transAmount: { fontSize: 16, fontWeight: '800' },
    emptyState: { padding: 40, alignItems: 'center' },
    fab: {
        position: 'absolute',
        bottom: 25,
        right: 25,
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8
    }
});

export default MoneyScreen;
