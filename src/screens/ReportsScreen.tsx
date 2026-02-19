import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, Modal, Platform, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';
import { getStatsForRange, getFinancialOverview } from '../db/database';
import { LineChart } from 'react-native-chart-kit';
import { format, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, FileText, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import DonutChart from '../components/DonutChart';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { getFinroFolderUri } from '../utils/storage';
import { useToast } from '../components/ToastProvider';
import { useTheme } from '../hooks/useTheme';

const screenWidth = Dimensions.get("window").width;

type RangeType = 'MONTH' | 'QUARTER' | 'HALF_YEAR' | 'YEAR' | 'CUSTOM';

const ReportsScreen = ({ navigation }: any) => {
    const { currency, theme, accentColor } = useSettingsStore();
    const { themeColors } = useTheme();
    const { showToast } = useToast();

    const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
    const [rangeType, setRangeType] = useState<RangeType>('MONTH');
    const [referenceDate, setReferenceDate] = useState(new Date());
    const [stats, setStats] = useState<any>(null);
    const [overview, setOverview] = useState({ netWorth: 0, receivable: 0, payable: 0 });

    useFocusEffect(
        useCallback(() => {
            loadStats();
            setOverview(getFinancialOverview());
        }, [rangeType, referenceDate])
    );

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

    const handleExportPDF = async () => {
        try {
            const html = `
                <html>
                    <head>
                        <style>
                            body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; line-height: 1.6; }
                            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid ${accentColor}; padding-bottom: 20px; }
                            .header h1 { color: ${accentColor}; margin: 0; font-size: 28px; }
                            .header p { color: #666; margin-top: 5px; }
                            
                            .section { margin-bottom: 35px; }
                            .section-title { font-size: 20px; color: ${accentColor}; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 15px; font-weight: bold; }
                            
                            .grid { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
                            .card { flex: 1; padding: 15px; background: #f8f9fa; border-radius: 12px; border: 1px solid #eee; }
                            .card-label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 5px; font-weight: bold; }
                            .card-value { font-size: 20px; color: #111; font-weight: bold; }
                            
                            .table { width: 100%; border-collapse: collapse; margin-top: 10px; background: #fff; }
                            .table th { background: #f8f9fa; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; font-size: 13px; }
                            .table td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
                            .table tr:last-child td { border-bottom: none; }
                            
                            .insight-box { padding: 20px; background: ${accentColor}10; border-left: 4px solid ${accentColor}; border-radius: 0 12px 12px 0; margin-top: 20px; }
                            .insight-title { font-weight: bold; color: ${accentColor}; margin-bottom: 10px; display: flex; alignItems: center; }
                            
                            .footer { text-align: center; margin-top: 50px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
                            .status-badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; }
                            .badge-positive { background: #d1fae5; color: #065f46; }
                            .badge-negative { background: #fee2e2; color: #991b1b; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>Finro Statement</h1>
                            <p>${rangeType === 'MONTH' ? format(referenceDate, 'MMMM yyyy') : rangeType === 'YEAR' ? format(referenceDate, 'yyyy') : 'Financial Analysis Report'}</p>
                            <p>Generated on ${format(new Date(), 'PPP')}</p>
                        </div>

                        <div class="section">
                            <div class="section-title">Wealth Snapshot</div>
                            <div class="grid">
                                <div class="card">
                                    <div class="card-label">Net Worth</div>
                                    <div class="card-value">${currency} ${overview.netWorth.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                </div>
                                <div class="card">
                                    <div class="card-label">Total Receivable</div>
                                    <div class="card-value" style="color: #10B981;">${currency} ${overview.receivable.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                </div>
                                <div class="card">
                                    <div class="card-label">Total Payable</div>
                                    <div class="card-value" style="color: #EF4444;">${currency} ${overview.payable.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                </div>
                            </div>
                        </div>

                        <div class="section">
                            <div class="section-title">Budget Performance</div>
                            <div class="grid">
                                <div class="card">
                                    <div class="card-label">Total Income</div>
                                    <div class="card-value">${currency} ${stats.totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                </div>
                                <div class="card">
                                    <div class="card-label">Total Expenses</div>
                                    <div class="card-value">${currency} ${stats.totalExpense.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                </div>
                                <div class="card">
                                    <div class="card-label">Savings Rate</div>
                                    <div class="card-value">${stats.totalIncome > 0 ? (((stats.totalIncome - stats.totalExpense) / stats.totalIncome) * 100).toFixed(1) : 0}%</div>
                                </div>
                            </div>
                        </div>

                        <div class="section">
                            <div class="section-title">${type === 'EXPENSE' ? 'Top Expenditures' : 'Income Streams'}</div>
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Category</th>
                                        <th>Transaction Count</th>
                                        <th style="text-align: right;">Amount (${currency})</th>
                                        <th style="text-align: right;">Share</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${sortedData.map(item => `
                                        <tr>
                                            <td style="font-weight: 500;">${item.category}</td>
                                            <td style="color: #666;">-</td>
                                            <td style="text-align: right; font-weight: bold;">${item.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                            <td style="text-align: right;">
                                                <span class="status-badge ${type === 'EXPENSE' ? 'badge-negative' : 'badge-positive'}">
                                                    ${((item.total / totalForType) * 100).toFixed(1)}%
                                                </span>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>

                        <div class="section">
                            <div class="section-title">Financial Forecast & Advice</div>
                            <div class="insight-box">
                                <div class="insight-title">Smart Analysis</div>
                                <p>Based on your data for this period, your primary focus was <span style="font-weight: bold;">${sortedData[0]?.label || 'General'}</span>.</p>
                                ${type === 'EXPENSE' ? `
                                    <p>🛡️ <span style="font-weight: bold;">Advice:</span> Your top category accounts for ${((sortedData[0]?.value / totalForType) * 100).toFixed(1)}% of your spending. Trimming this category by just 10% could save you ${currency} ${(sortedData[0]?.value * 0.1).toLocaleString(undefined, { maximumFractionDigits: 0 })} next month.</p>
                                ` : `
                                    <p>📈 <span style="font-weight: bold;">Growth:</span> Your income is predominantly coming from ${sortedData[0]?.label}. Diversifying your income streams could further stabilize your long-term wealth.</p>
                                `}
                                <p>💡 <span style="font-weight: bold;">Tip:</span> Tracking small repetitive expenses often reveals more saving potential than cutting big one-time costs.</p>
                            </div>
                        </div>

                        <div class="footer">
                            <p>This report was generated by Finro Personal Finance Manager.</p>
                            <p>&copy; ${new Date().getFullYear()} Finro App. All Rights Reserved.</p>
                        </div>
                    </body>
                </html>
            `;

            const { uri } = await Print.printToFileAsync({ html });

            if (Platform.OS === 'android') {
                const folderUri = await getFinroFolderUri();
                if (folderUri) {
                    const fileName = `Finro_Report_${format(referenceDate, 'yyyy_MM')}.pdf`;
                    const safUri = await FileSystem.StorageAccessFramework.createFileAsync(
                        folderUri,
                        fileName,
                        'application/pdf'
                    );
                    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
                    await FileSystem.writeAsStringAsync(safUri, base64, { encoding: FileSystem.EncodingType.Base64 });
                    showToast('Report saved to Finro folder!', 'success');
                    return;
                }
            }

            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (error) {
            console.error('Error generating PDF:', error);
            showToast('Could not generate PDF report', 'error');
        }
    };

    if (!stats) return null;

    const dataForPie = type === 'EXPENSE' ? stats.expenses : stats.income;
    const totalForType = type === 'EXPENSE' ? stats.totalExpense : stats.totalIncome;

    const sortedData = [...dataForPie].sort((a: any, b: any) => b.total - a.total);

    const pieData = sortedData.map((item: any, index: number) => ({
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
                <View style={{ width: 44 }} />
                <Text style={[styles.title, { color: themeColors.text }]}>Reports</Text>
                <TouchableOpacity
                    style={[styles.exportBtn, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                    onPress={handleExportPDF}
                >
                    <FileText color={accentColor} size={20} />
                </TouchableOpacity>
            </View>

            {/* Financial Summary */}
            <View style={[styles.overviewContainer, { backgroundColor: accentColor + '10', borderColor: accentColor + '30' }]}>
                <View style={styles.netWorthSection}>
                    <Text style={[styles.overviewLabel, { color: themeColors.textSecondary }]}>Total Net Worth</Text>
                    <Text style={[styles.netWorthValue, { color: themeColors.text }]}>{currency} {overview.netWorth.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.debtSection}>
                    <View style={styles.debtItem}>
                        <Text style={[styles.debtLabel, { color: '#10B981' }]}>To Receive</Text>
                        <Text style={[styles.debtValue, { color: themeColors.text }]}>{currency} {overview.receivable.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                    </View>
                    <View style={styles.debtItem}>
                        <Text style={[styles.debtLabel, { color: '#EF4444' }]}>To Pay</Text>
                        <Text style={[styles.debtValue, { color: themeColors.text }]}>{currency} {overview.payable.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                    </View>
                </View>
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
                                {currency} {totalForType.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </Text>
                        </View>

                        {/* Financial Insights */}
                        {pieData.length > 0 ? (
                            <View style={[styles.insightCard, { backgroundColor: accentColor + '08', borderColor: accentColor + '20' }]}>
                                <View style={styles.insightHeader}>
                                    <AlertCircle size={18} color={accentColor} />
                                    <Text style={[styles.insightTitle, { color: themeColors.text }]}>Quick Insights</Text>
                                </View>
                                <Text style={[styles.insightContent, { color: themeColors.textSecondary }]}>
                                    {type === 'EXPENSE' ? (
                                        <>You spent the most on <Text style={{ color: themeColors.text, fontWeight: 'bold' }}>{pieData[0]?.label}</Text> this period, which accounts for <Text style={{ color: themeColors.text, fontWeight: 'bold' }}>{((pieData[0]?.value / totalForType) * 100).toFixed(1)}%</Text> of your total expenses.</>
                                    ) : (
                                        <>Your primary source of income this period was <Text style={{ color: themeColors.text, fontWeight: 'bold' }}>{pieData[0]?.label}</Text>, contributing <Text style={{ color: themeColors.text, fontWeight: 'bold' }}>{((pieData[0]?.value / totalForType) * 100).toFixed(1)}%</Text> to your total earnings.</>
                                    )}
                                </Text>
                            </View>
                        ) : null}

                        <View style={{ width: '100%', marginTop: 20 }}>
                            {sortedData.map((item: any, idx: number) => {
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
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
    overviewContainer: {
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 25,
    },
    netWorthSection: {
        alignItems: 'center',
        marginBottom: 15,
    },
    overviewLabel: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 5,
    },
    netWorthValue: {
        fontSize: 32,
        fontWeight: '900',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginVertical: 15,
    },
    debtSection: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    debtItem: {
        alignItems: 'center',
    },
    debtLabel: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 4,
    },
    debtValue: {
        fontSize: 18,
        fontWeight: '800',
    },
    exportBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        gap: 6
    },
    exportText: {
        fontSize: 12,
        fontWeight: '700'
    },
    insightCard: {
        width: '100%',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginTop: 10,
    },
    insightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8
    },
    insightTitle: {
        fontSize: 14,
        fontWeight: '700'
    },
    insightContent: {
        fontSize: 13,
        lineHeight: 18
    }
});

export default ReportsScreen;
