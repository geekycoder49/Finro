import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, Modal } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';
import { getStatsForRange } from '../db/database';
import { LineChart } from 'react-native-chart-kit';
import { format, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import DonutChart from '../components/DonutChart';

const screenWidth = Dimensions.get("window").width;

type RangeType = 'MONTH' | 'QUARTER' | 'HALF_YEAR' | 'YEAR' | 'CUSTOM';

const ReportsScreen = ({ navigation }: any) => {
    const { currency, theme, accentColor } = useSettingsStore();
    const themeColors = theme === 'dark' ? DARK_THEME : LIGHT_THEME;

    const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
    const [rangeType, setRangeType] = useState<RangeType>('MONTH');
    const [referenceDate, setReferenceDate] = useState(new Date());
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        loadStats();
    }, [rangeType, referenceDate]);

    const loadStats = () => {
        let start: Date, end: Date;

        switch (rangeType) {
            case 'MONTH':
                start = startOfMonth(referenceDate);
                end = endOfMonth(referenceDate);
                break;
            case 'QUARTER':
                start = subMonths(endOfMonth(referenceDate), 3);
                end = endOfMonth(referenceDate);
                break;
            case 'HALF_YEAR':
                start = subMonths(endOfMonth(referenceDate), 6);
                end = endOfMonth(referenceDate);
                break;
            case 'YEAR':
                start = startOfYear(referenceDate);
                end = endOfYear(referenceDate);
                break;
            default:
                start = startOfMonth(referenceDate);
                end = endOfMonth(referenceDate);
        }

        const startStr = format(start, 'yyyy-MM-dd');
        const endStr = format(end, 'yyyy-MM-dd');
        const results = getStatsForRange(startStr, endStr);
        setStats(results);
    };

    const changePeriod = (increment: number) => {
        if (rangeType === 'MONTH') setReferenceDate(prev => subMonths(prev, -increment));
        else if (rangeType === 'YEAR') setReferenceDate(prev => subMonths(prev, -increment * 12));
        else setReferenceDate(prev => subMonths(prev, -increment * 3)); // For half/quarter just move 3 months
    };

    if (!stats) return null;

    const dataForPie = type === 'EXPENSE' ? stats.expenses : stats.income;
    const totalForType = type === 'EXPENSE' ? stats.totalExpense : stats.totalIncome;

    const pieData = dataForPie.map((item: any, index: number) => ({
        value: item.total,
        color: ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#0EA5E9"][index % 7],
        label: item.category
    }));

    const chartConfig = {
        backgroundGradientFrom: themeColors.surface,
        backgroundGradientTo: themeColors.surface,
        color: (opacity = 1) => accentColor,
        labelColor: (opacity = 1) => themeColors.textSecondary,
        strokeWidth: 2,
        decimalPlaces: 0,
    };

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <Text style={[styles.title, { color: themeColors.text }]}>Reports</Text>
            </View>

            {/* Range Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rangeSelector}>
                {[
                    { label: 'Month', value: 'MONTH' },
                    { label: 'Quarterly', value: 'QUARTER' },
                    { label: '6 Months', value: 'HALF_YEAR' },
                    { label: 'Annual', value: 'YEAR' }
                ].map((item) => (
                    <TouchableOpacity
                        key={item.value}
                        onPress={() => setRangeType(item.value as RangeType)}
                        style={[
                            styles.rangeChip,
                            { backgroundColor: rangeType === item.value ? accentColor : themeColors.surface, borderColor: themeColors.border }
                        ]}
                    >
                        <Text style={[styles.rangeText, { color: rangeType === item.value ? 'white' : themeColors.textSecondary }]}>
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={styles.periodSwitcher}>
                <TouchableOpacity onPress={() => changePeriod(-1)}>
                    <ChevronLeft color={themeColors.text} size={24} />
                </TouchableOpacity>
                <Text style={[styles.periodText, { color: themeColors.text }]}>
                    {rangeType === 'MONTH' ? format(referenceDate, 'MMMM yyyy') :
                        rangeType === 'YEAR' ? format(referenceDate, 'yyyy') :
                            rangeType === 'QUARTER' ? `Last 3 Months (${format(referenceDate, 'MMM yy')})` :
                                `Last 6 Months (${format(referenceDate, 'MMM yy')})`}
                </Text>
                <TouchableOpacity onPress={() => changePeriod(1)}>
                    <ChevronRight color={themeColors.text} size={24} />
                </TouchableOpacity>
            </View>

            {/* Income/Expense Toggle */}
            <View style={[styles.tabs, { backgroundColor: themeColors.surface }]}>
                <TouchableOpacity
                    onPress={() => setType('EXPENSE')}
                    style={[styles.tab, type === 'EXPENSE' ? { backgroundColor: '#EF4444' } : {}]}
                >
                    <Text style={[styles.tabText, { color: type === 'EXPENSE' ? 'white' : themeColors.textSecondary }]}>Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setType('INCOME')}
                    style={[styles.tab, type === 'INCOME' ? { backgroundColor: '#10B981' } : {}]}
                >
                    <Text style={[styles.tabText, { color: type === 'INCOME' ? 'white' : themeColors.textSecondary }]}>Income</Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {pieData.length > 0 ? (
                    <View style={{ alignItems: 'center', marginTop: 20 }}>
                        <DonutChart
                            data={pieData}
                            currency={currency}
                            textColor={themeColors.text}
                            radius={80}
                            innerRadius={55}
                        />

                        <View style={[styles.summaryCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                            <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>Total {type === 'EXPENSE' ? 'Spent' : 'Earned'}</Text>
                            <Text style={[styles.summaryValue, { color: type === 'EXPENSE' ? '#EF4444' : '#10B981' }]}>
                                {currency} {totalForType.toLocaleString()}
                            </Text>
                        </View>

                        <View style={{ width: '100%', marginTop: 20 }}>
                            {dataForPie.sort((a: any, b: any) => b.total - a.total).map((item: any, idx: number) => {
                                const percentage = ((item.total / totalForType) * 100).toFixed(1);
                                return (
                                    <View key={idx} style={[styles.categoryRow, { borderBottomColor: themeColors.border }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.categoryName, { color: themeColors.text }]}>{item.category}</Text>
                                            <Text style={{ fontSize: 12, color: themeColors.textSecondary }}>{percentage}% of total</Text>
                                        </View>
                                        <Text style={[styles.categoryTotal, { color: themeColors.text }]}>{currency} {item.total.toLocaleString()}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <Calendar size={60} color={themeColors.border} />
                        <Text style={{ textAlign: 'center', marginTop: 20, color: themeColors.textSecondary, fontSize: 16 }}>
                            No data for this period
                        </Text>
                    </View>
                )}
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { marginBottom: 20 },
    title: { fontSize: 24, fontWeight: 'bold' },
    rangeSelector: { gap: 10, paddingRight: 20, marginBottom: 20 },
    rangeChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    rangeText: { fontSize: 13, fontWeight: '600' },
    periodSwitcher: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        paddingHorizontal: 10
    },
    periodText: { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
    tabs: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 10,
    },
    tabText: { fontSize: 14, fontWeight: '700' },
    summaryCard: {
        width: '100%',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        marginVertical: 10
    },
    summaryLabel: { fontSize: 14, marginBottom: 4 },
    summaryValue: { fontSize: 28, fontWeight: 'bold' },
    categoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    categoryName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
    categoryTotal: { fontSize: 16, fontWeight: '700' },
    emptyState: { alignItems: 'center', marginTop: 80, opacity: 0.5 },
});

export default ReportsScreen;
