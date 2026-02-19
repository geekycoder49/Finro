import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';
import { useTheme } from '../hooks/useTheme';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { ChevronLeft, ChevronRight, Search, Filter, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Plus, Landmark, Wallet, User, Calendar } from 'lucide-react-native';
import { getTransactions, Transaction } from '../db/database';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { getCategoryIcon } from '../utils/categoryIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TransactionCard } from '../components/TransactionCard';

const AllTransactionsScreen = ({ navigation }: any) => {
    const { currency, theme, accentColor } = useSettingsStore();
    const { themeColors } = useTheme();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [selectedPeriod, setSelectedPeriod] = useState<'ALL' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM'>('MONTH');
    const [dateRange, setDateRange] = useState<{ start: Date, end: Date }>({
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date())
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateType, setDateType] = useState<'START' | 'END'>('START');

    useEffect(() => {
        const trans = getTransactions(1000); // Higher limit for history
        setTransactions(trans);
    }, []);

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

    const filteredTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        const matchesRange = tDate >= dateRange.start && tDate <= dateRange.end;

        const matchesSearch = (t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.fromAccountName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.toAccountName || '').toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesType = filterType === 'ALL' || t.type === filterType;

        return matchesRange && matchesSearch && matchesType;
    });

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: themeColors.surface }]}>
                    <ChevronLeft color={themeColors.text} size={24} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: themeColors.text }]}>History</Text>
                <View style={{ width: 44 }} />
            </View>

            {/* Period Filters */}
            <View style={styles.periodFilterSection}>
                <View style={styles.filterRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {(['ALL', 'WEEK', 'MONTH', 'YEAR'] as const).map(p => (
                            <TouchableOpacity
                                key={p}
                                style={[
                                    styles.periodChip,
                                    { backgroundColor: selectedPeriod === p ? themeColors.text : themeColors.surface, borderColor: themeColors.border }
                                ]}
                                onPress={() => setSelectedPeriod(p)}
                            >
                                <Text style={[styles.periodChipText, { color: selectedPeriod === p ? themeColors.background : themeColors.text }]}>{p}</Text>
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
                {selectedPeriod === 'CUSTOM' ? (
                    <Text style={[{ fontSize: 12, color: accentColor, fontWeight: '700', marginTop: 8, textAlign: 'center' }]}>
                        {format(dateRange.start, 'dd MMM yyyy')} - {format(dateRange.end, 'dd MMM yyyy')}
                    </Text>
                ) : null}
            </View>

            <View style={[styles.searchContainer, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                <Search color={themeColors.textSecondary} size={20} />
                <TextInput
                    style={[styles.searchInput, { color: themeColors.text }]}
                    placeholder="Search transactions..."
                    placeholderTextColor={themeColors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <View style={styles.typeFiltersSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {['ALL', 'EXPENSE', 'INCOME', 'TRANSFER', 'PEOPLE'].map(type => (
                        <TouchableOpacity
                            key={type}
                            onPress={() => setFilterType(type)}
                            style={[
                                styles.typeChip,
                                { backgroundColor: filterType === type ? accentColor : themeColors.surface, borderColor: themeColors.border }
                            ]}
                        >
                            <Text style={[styles.typeFilterText, { color: filterType === type ? 'white' : themeColors.text }]}>
                                {type.charAt(0) + type.slice(1).toLowerCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 20 }}>
                {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((item) => (
                        <TransactionCard
                            key={item.id}
                            item={item}
                            onPress={(t) => item.isSystem === 1 ? null : navigation.navigate('EditTransaction', { transaction: t })}
                        />
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={[{ color: themeColors.textSecondary }]}>No transactions found</Text>
                    </View>
                )}
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
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
    periodFilterSection: {
        marginBottom: 20
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    periodChip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 15,
        borderWidth: 1,
    },
    periodChipText: {
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 54,
        borderRadius: 18,
        marginBottom: 16,
        borderWidth: 1,
    },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16, fontWeight: '500' },
    typeFiltersSection: { marginBottom: 16 },
    typeChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 15,
        borderWidth: 1,
    },
    typeFilterText: { fontSize: 14, fontWeight: '700' },
    emptyState: { padding: 60, alignItems: 'center' },
});

export default AllTransactionsScreen;
