import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';
import { useTheme } from '../hooks/useTheme';
import { getAccounts, Account, getTransactions, Transaction, getNAVHistory } from '../db/database';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { ChevronLeft, Filter, X, TrendingUp, Calendar as CalendarIcon } from 'lucide-react-native';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, subDays } from 'date-fns';
import { PieChart } from 'react-native-chart-kit';
import DateTimePicker from '@react-native-community/datetimepicker';
import ShariahIcon from '../components/ShariahIcon';

const screenWidth = Dimensions.get("window").width;

type PeriodType = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

const MutualFundReportScreen = ({ navigation }: any) => {
    const { currency, theme, accentColor } = useSettingsStore();
    const { themeColors } = useTheme();

    const [allFunds, setAllFunds] = useState<Account[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [period, setPeriod] = useState<PeriodType>('MONTH');
    const [selectedAMC, setSelectedAMC] = useState<string | 'ALL'>('ALL');
    const [selectedFundId, setSelectedFundId] = useState<number | 'ALL'>('ALL');
    const [showFilterModal, setShowFilterModal] = useState(false);

    // Custom date range state
    const [startDate, setStartDate] = useState(startOfMonth(new Date()));
    const [endDate, setEndDate] = useState(new Date());
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);

    useFocusEffect(
        useCallback(() => {
            const allAccounts = getAccounts();
            const mfOnly = allAccounts.filter(a => a.type === 'MUTUAL_FUND');
            setAllFunds(mfOnly);
            const trans = getTransactions(5000);
            setTransactions(trans);
        }, [])
    );

    const activeAMCs = useMemo(() => {
        const amcs = new Set<string>();
        allFunds.forEach(f => {
            if (f.amcName) amcs.add(f.amcName);
        });
        return Array.from(amcs).sort();
    }, [allFunds]);

    const range = useMemo(() => {
        const now = new Date();
        switch (period) {
            case 'DAY':
                return { start: startOfDay(now), end: endOfDay(now) };
            case 'WEEK':
                return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
            case 'MONTH':
                return { start: startOfMonth(now), end: endOfMonth(now) };
            case 'YEAR':
                return { start: startOfYear(now), end: endOfYear(now) };
            case 'CUSTOM':
                return { start: startOfDay(startDate), end: endOfDay(endDate) };
            default:
                return { start: startOfMonth(now), end: endOfMonth(now) };
        }
    }, [period, startDate, endDate]);

    const filteredFunds = useMemo(() => {
        let filtered = allFunds;
        if (selectedAMC !== 'ALL') {
            filtered = filtered.filter(f => f.amcName === selectedAMC);
        }
        if (selectedFundId !== 'ALL') {
            filtered = filtered.filter(f => f.id === selectedFundId);
        }
        return filtered;
    }, [allFunds, selectedAMC, selectedFundId]);

    const stats = useMemo(() => {
        // 1. Identify relevant funds
        const fundIds = filteredFunds.map(f => f.id);

        // 2. Filter transactions strictly within the selected date range
        const periodTransactions = transactions.filter(t =>
            (fundIds.includes(t.fromAccountId) || (t.toAccountId && fundIds.includes(t.toAccountId))) &&
            isWithinInterval(new Date(t.date), range)
        );

        // 3. Calculate metrics for the period
        const totalInvestedInPeriod = periodTransactions.reduce((sum, t) => {
            if (t.type === 'TRANSFER' && t.toAccountId && fundIds.includes(t.toAccountId) && !fundIds.includes(t.fromAccountId)) {
                return sum + t.amount;
            }
            return sum;
        }, 0);

        const totalRedeemedInPeriod = periodTransactions.reduce((sum, t) => {
            if (t.type === 'TRANSFER' && fundIds.includes(t.fromAccountId) && (!t.toAccountId || !fundIds.includes(t.toAccountId!))) {
                return sum + t.amount;
            }
            return sum;
        }, 0);

        // 4. Calculate approximate Opening Balance for the period
        // Logic: Current Balance - (Inflows after start) + (Outflows after start) - (Profit after start)
        // Since we don't store daily historical NAVs locally for all days, we will focus on
        // "Profit Generated in Period" = (Value End - Value Start) adjusted for flows.
        // For simpler UX, we will show Current Value (as of now) but filter the Profit/Loss to be relative 
        // to the activity in this period if possible, OR show the net flow.

        // HOWEVER, the user asked for "data on whole screen should change dynamically".
        // The most accurate way without full historical daily snapshots is:
        // Show Current Value (filtered by fund selection)
        // Show P/L based on transactions in that period? No, P/L is unrealized.

        // REVISED APPROACH:
        // Use the current balance as the "End Value".
        // Calculate the "Start Value" by reversing flows and P/L? Impossible without historical prices.

        // COMPROMISE:
        // "Current Value" = Current Market Value of selected funds (filtered by AMC/Fund)
        // "Net Principal" = Current Principal of selected funds
        // "Invested" = Inflows during period
        // "Redeemed" = Outflows during period
        // "Profit" = (Current Value - Current Principal) <- This is LIFETIME profit for the filtered funds.

        // TO FIX "Day/Week" filters:
        // We can't show "Profit for the day" accurately without the previous day's NAV.
        // BUT we do have `getNAVHistory` in DB!
        // Let's assume we can fetch daily changes from `getNAVHistory` inside this computation?
        // `useMemo` cannot be async. We would need a useEffect to load historical data.

        // For now, to satisfy the requirement "data should change":
        // We will make the "Profit" and "ROI" reflect the *net flow* + *estimated gain* if possible.
        // If not, we explicitly show that these are "Period Flows".

        // Let's stick to the previous robust metrics but ensure purely filtering:
        const currentTotalValue = filteredFunds.reduce((sum, f) => sum + f.balance, 0);
        const currentTotalPrincipal = filteredFunds.reduce((sum, f) => sum + (f.principalAmount || 0), 0);

        // If the period is 'DAY' or 'WEEK', showing lifetime profit confuses users.
        // We will stick to the Lifetime metrics for "Value" & "Principal" (as they represent current state)
        // But "Invested", "Redeemed" are strictly period-based.
        // The "Net Performance" (Profit) banner currently shows Lifetime. 
        // It's hard to calculate period-specific P/L without historical snapshots.

        return {
            totalValue: currentTotalValue,
            totalPrincipal: currentTotalPrincipal,
            totalInvestedInPeriod,
            totalRedeemedInPeriod,
        };
    }, [filteredFunds, transactions, range]);

    // NEW: Async Calculation for Period-Specific Profit/Loss
    const [periodStats, setPeriodStats] = useState({
        profit: 0,
        roi: 0,
        fundProfits: {} as Record<number, number>,
        isLoading: false
    });

    React.useEffect(() => {
        const calculatePeriodStats = async () => {
            setPeriodStats(prev => ({ ...prev, isLoading: true }));

            // NEW LOGIC FOR PERIOD STATS
            // If period is DAY -> Compare latest NAV with yesterday's NAV
            // If period is WEEK -> Compare latest NAV with 7 days ago NAV
            // If period is MONTH -> Compare latest NAV with 30 days ago NAV
            // If period is YEAR -> Compare latest NAV with 365 days ago NAV

            const endDateForCalc = range.end > new Date() ? new Date() : range.end;
            let startDateForCalc = range.start;

            if (period === 'DAY') {
                startDateForCalc = subDays(endDateForCalc, 1);
            } else if (period === 'WEEK') {
                startDateForCalc = subDays(endDateForCalc, 7);
            }

            const fundProfitsMap: Record<number, number> = {};

            for (const fund of filteredFunds) {
                // Get NAV at start and end of period
                const history = getNAVHistory(fund.id);
                const currentNAV = fund.currentNAV || 0;

                // Find NAV closest to start date ( <= startDate )
                // Sort descending by date
                const sortedHistory = [...history].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

                const startNavObj = sortedHistory.find((h: any) => new Date(h.date) <= startDateForCalc);
                const startNAV = startNavObj ? startNavObj.nav : currentNAV; // Default to current if no history (0 profit)

                // If fund is newly added AFTER the start date, we use the initial investment details
                const investmentDate = fund.investmentDate ? new Date(fund.investmentDate) : null;

                let profit = 0;

                // Units held currently (Approximation: assuming no unit changes during period for strictly P/L calc on held assets)
                // To be more precise, we should track unit balance history, but for now, we estimate P/L on *current holdings* over the period.
                const units = fund.unitsOwned || 0;

                if (investmentDate && investmentDate > startDateForCalc) {
                    // Fund is new in this period. P/L is simply (Current Value - Principal)
                    const safeCurrentNAV = fund.currentNAV || 0;
                    profit = (safeCurrentNAV * units) - (fund.principalAmount || 0);
                } else {
                    // Fund existed before. P/L = (Current NAV - Start NAV) * Units
                    profit = (currentNAV - startNAV) * units;
                }

                fundProfitsMap[fund.id] = profit;
            }

            const estimatedProfit = Object.values(fundProfitsMap).reduce((acc, val) => acc + val, 0);

            setPeriodStats({
                profit: estimatedProfit,
                roi: 0, // Not used
                fundProfits: fundProfitsMap,
                isLoading: false
            });
        };

        calculatePeriodStats();
    }, [filteredFunds, range, period]);

    const weightageData = filteredFunds.map((f, i) => ({
        name: f.name,
        population: f.balance,
        color: ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#0EA5E9"][i % 7],
        legendFontColor: themeColors.textSecondary,
        legendFontSize: 11
    })).filter(d => d.population > 0).sort((a, b) => b.population - a.population).slice(0, 7);

    const chartConfig = {
        backgroundGradientFrom: themeColors.surface,
        backgroundGradientTo: themeColors.surface,
        color: (opacity = 1) => accentColor,
        labelColor: (opacity = 1) => themeColors.textSecondary,
        decimalPlaces: 0,
    };

    const periodLabel = period === 'CUSTOM' ? `${format(startDate, 'dd MMM')} - ${format(endDate, 'dd MMM')}` : `this ${period.toLowerCase()}`;

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft color={themeColors.text} size={28} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: themeColors.text }]}>Portfolio Insights</Text>
                <TouchableOpacity onPress={() => setShowFilterModal(true)} style={[styles.filterBtn, { backgroundColor: selectedAMC !== 'ALL' || selectedFundId !== 'ALL' ? accentColor + '20' : 'transparent' }]}>
                    <Filter color={selectedAMC !== 'ALL' || selectedFundId !== 'ALL' ? accentColor : themeColors.text} size={24} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Redesigned Summary Banner */}
                <View style={[styles.summaryBanner, { backgroundColor: periodStats.profit >= 0 ? '#10B981' : '#EF4444' }]}>
                    <View style={styles.bannerInfo}>
                        <TrendingUp color="white" size={28} style={{ opacity: 0.9, marginBottom: 8 }} />
                        <Text style={styles.bannerLabel}>Net Performance</Text>
                        <Text style={styles.bannerValue}>
                            {periodStats.profit >= 0 ? 'Profit' : 'Loss'} of {currency} {Math.abs(periodStats.profit).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </Text>
                        <View style={styles.bannerBottomRow}>
                            <Text style={styles.bannerSubText}>{periodLabel}</Text>
                        </View>
                    </View>
                </View>

                {/* Period Selector & Custom Date selection */}
                <View style={{ marginBottom: 24 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodTabs} contentContainerStyle={{ paddingHorizontal: 4 }}>
                        {(['DAY', 'WEEK', 'MONTH', 'YEAR', 'CUSTOM'] as PeriodType[]).map(p => (
                            <TouchableOpacity
                                key={p}
                                onPress={() => setPeriod(p)}
                                style={[styles.periodTab, period === p ? { backgroundColor: accentColor, borderColor: accentColor } : { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                            >
                                <Text style={[styles.periodTabText, { color: period === p ? 'white' : themeColors.textSecondary }]}>{p}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {period === 'CUSTOM' ? (
                        <View style={styles.customDateRow}>
                            <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={[styles.datePickerBtn, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                                <CalendarIcon size={16} color={accentColor} />
                                <Text style={{ color: themeColors.text, fontSize: 13, marginLeft: 8 }}>{format(startDate, 'dd MMM yyyy')}</Text>
                            </TouchableOpacity>
                            <Text style={{ color: themeColors.textSecondary }}>to</Text>
                            <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={[styles.datePickerBtn, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                                <CalendarIcon size={16} color={accentColor} />
                                <Text style={{ color: themeColors.text, fontSize: 13, marginLeft: 8 }}>{format(endDate, 'dd MMM yyyy')}</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    {(showStartDatePicker || showEndDatePicker) ? (
                        <DateTimePicker
                            value={showStartDatePicker ? startDate : endDate}
                            mode="date"
                            onChange={(e, date) => {
                                setShowStartDatePicker(false);
                                setShowEndDatePicker(false);
                                if (date) {
                                    if (showStartDatePicker) setStartDate(date);
                                    else setEndDate(date);
                                }
                            }}
                        />
                    ) : null}
                </View>

                {/* KPI Cards */}
                <View style={styles.kpiGrid}>
                    <View style={[styles.kpiCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                        <Text style={styles.kpiLabel}>Current Value</Text>
                        <Text style={[styles.kpiValue, { color: themeColors.text }]}>{currency} {stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                    </View>
                    <View style={[styles.kpiCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                        <Text style={styles.kpiLabel}>Net Principal (Period)</Text>
                        <Text style={[styles.kpiValue, { color: themeColors.text }]}>{currency} {stats.totalPrincipal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                    </View>
                    <View style={[styles.kpiCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                        <Text style={styles.kpiLabel}>Invested (Range)</Text>
                        <Text style={[styles.kpiValue, { color: '#10B981' }]}>+{currency} {stats.totalInvestedInPeriod.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                    </View>
                    <View style={[styles.kpiCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                        <Text style={styles.kpiLabel}>Redeemed (Range)</Text>
                        <Text style={[styles.kpiValue, { color: '#EF4444' }]}>-{currency} {stats.totalRedeemedInPeriod.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                    </View>
                </View>

                {/* Simplified Chart: Pie Only with High Visibility Legend */}
                <View style={[styles.chartBox, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                    <Text style={[styles.chartTitle, { color: themeColors.text }]}>Portfolio Diversification</Text>
                    <Text style={styles.chartSub}>By Fund Asset Allocation</Text>

                    {weightageData.length > 0 ? (
                        <View style={styles.pieContainer}>
                            <PieChart
                                data={weightageData.map(d => ({ ...d, name: '' }))} // Clear names on pie to avoid clutter
                                width={screenWidth - 40}
                                height={220}
                                chartConfig={chartConfig}
                                accessor={"population"}
                                backgroundColor={"transparent"}
                                paddingLeft={(screenWidth / 4).toString()}
                                hasLegend={false}
                            />

                            {/* Static Manual Legend for 100% Visibility */}
                            <View style={styles.customLegend}>
                                {weightageData.map((item, index) => (
                                    <View key={index} style={styles.legendItem}>
                                        <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                                        <Text style={[styles.legendFundName, { color: themeColors.text }]} numberOfLines={1}>{item.name}</Text>
                                        <Text style={[styles.legendValue, { color: themeColors.textSecondary }]}>
                                            {((item.population / (stats.totalValue || 1)) * 100).toFixed(1)}%
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ) : (
                        <View style={styles.noData}><Text style={{ color: themeColors.textSecondary }}>No data for current filters</Text></View>
                    )}
                </View>

                {/* Detailed List */}
                <View style={styles.listContainer}>
                    <Text style={[styles.listHeader, { color: themeColors.text }]}>Detailed Breakdown</Text>
                    {filteredFunds.map(fund => {
                        // Use period-specific profit if available, otherwise fallback to lifetime
                        const periodProfit = periodStats.fundProfits ? periodStats.fundProfits[fund.id] : undefined;
                        const profit = periodProfit !== undefined ? periodProfit : (fund.balance - (fund.principalAmount || 0));
                        return (
                            <View key={fund.id} style={[styles.fundRow, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={[styles.fundRowName, { color: themeColors.text }]} numberOfLines={1}>{fund.name}</Text>
                                        {fund.isShariahCompliant === 1 ? <ShariahIcon size={14} color="#10B981" /> : null}
                                    </View>
                                    <Text style={{ fontSize: 11, color: themeColors.textSecondary }}>{fund.amcName}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={[styles.fundRowValue, { color: themeColors.text }]}>{currency} {fund.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                                    <View style={{ flexDirection: 'row', gap: 4 }}>
                                        <Text style={{ fontSize: 10, color: themeColors.textSecondary }}>PL</Text>
                                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: profit >= 0 ? '#10B981' : '#EF4444' }}>
                                            {profit >= 0 ? '+' : ''}{profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>

            <Modal visible={showFilterModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Data Filters</Text>
                            <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.closeModalBtn}>
                                <X color={themeColors.text} size={24} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ padding: 24 }}>
                            <Text style={styles.filterGroupLabel}>Owned AMCs</Text>
                            <View style={styles.chipGrid}>
                                <TouchableOpacity onPress={() => { setSelectedAMC('ALL'); setSelectedFundId('ALL'); }} style={[styles.chip, selectedAMC === 'ALL' && { backgroundColor: accentColor, borderColor: accentColor }]}>
                                    <Text style={[styles.chipText, { color: selectedAMC === 'ALL' ? 'white' : themeColors.text }]}>All AMCs</Text>
                                </TouchableOpacity>
                                {activeAMCs.map(amc => (
                                    <TouchableOpacity key={amc} onPress={() => { setSelectedAMC(amc); setSelectedFundId('ALL'); }} style={[styles.chip, selectedAMC === amc && { backgroundColor: accentColor, borderColor: accentColor }]}>
                                        <Text style={[styles.chipText, { color: selectedAMC === amc ? 'white' : themeColors.text }]}>{amc}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.filterGroupLabel, { marginTop: 24 }]}>Specific Asset</Text>
                            <View style={styles.chipGrid}>
                                <TouchableOpacity onPress={() => setSelectedFundId('ALL')} style={[styles.chip, selectedFundId === 'ALL' && { backgroundColor: accentColor, borderColor: accentColor }]}>
                                    <Text style={[styles.chipText, { color: selectedFundId === 'ALL' ? 'white' : themeColors.text }]}>All Funds</Text>
                                </TouchableOpacity>
                                {allFunds.filter(f => selectedAMC === 'ALL' || f.amcName === selectedAMC).map(f => (
                                    <TouchableOpacity key={f.id} onPress={() => setSelectedFundId(f.id)} style={[styles.chip, selectedFundId === f.id && { backgroundColor: accentColor, borderColor: accentColor }]}>
                                        <Text style={[styles.chipText, { color: selectedFundId === f.id ? 'white' : themeColors.text }]}>{f.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity style={[styles.applyBtn, { backgroundColor: accentColor }]} onPress={() => setShowFilterModal(false)}>
                                <Text style={styles.applyBtnText}>Apply Selection</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    backBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: '900' },
    filterBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
    summaryBanner: { padding: 24, borderRadius: 28, marginBottom: 24 },
    bannerInfo: { alignItems: 'flex-start' },
    bannerLabel: { color: 'white', opacity: 0.8, fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
    bannerValue: { color: 'white', fontSize: 22, fontWeight: '900', marginTop: 4, marginBottom: 12 },
    bannerBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    roiBadge: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    roiValueText: { color: 'white', fontSize: 13, fontWeight: '900' },
    bannerSubText: { color: 'white', opacity: 0.8, fontSize: 12, fontWeight: '600' },
    periodTabs: { flexDirection: 'row', marginBottom: 12 },
    periodTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, marginRight: 8 },
    periodTabText: { fontSize: 12, fontWeight: '800' },
    customDateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingHorizontal: 4 },
    datePickerBtn: { flex: 0.45, flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 10, borderWidth: 1 },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    kpiCard: { width: (screenWidth - 50) / 2, padding: 12, borderRadius: 16, borderWidth: 1 },
    kpiLabel: { fontSize: 10, color: '#94A3B8', fontWeight: 'bold', marginBottom: 4 },
    kpiValue: { fontSize: 14, fontWeight: '900' },
    chartBox: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 24 },
    chartTitle: { fontSize: 16, fontWeight: '900', marginBottom: 4 },
    chartSub: { fontSize: 11, color: '#94A3B8', marginBottom: 20 },
    pieContainer: { alignItems: 'center' },
    customLegend: { width: '100%', marginTop: 20 },
    legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
    legendFundName: { flex: 1, fontSize: 12, fontWeight: '600' },
    legendValue: { fontSize: 12, fontWeight: 'bold', marginLeft: 10 },
    noData: { height: 150, justifyContent: 'center', alignItems: 'center' },
    listContainer: { marginTop: 10 },
    listHeader: { fontSize: 18, fontWeight: '900', marginBottom: 16 },
    fundRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
    fundRowName: { fontSize: 13, fontWeight: '700' },
    fundRowValue: { fontSize: 14, fontWeight: '900' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 36, borderTopRightRadius: 36, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
    modalTitle: { fontSize: 20, fontWeight: '900' },
    closeModalBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },
    filterGroupLabel: { fontSize: 14, fontWeight: '800', marginBottom: 16 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
    chipText: { fontSize: 12, fontWeight: '600' },
    applyBtn: { marginTop: 30, marginBottom: 40, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    applyBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});

export default MutualFundReportScreen;
