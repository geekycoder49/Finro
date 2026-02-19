import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Switch, TextInput } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTheme } from '../hooks/useTheme';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { ChevronLeft, TrendingUp } from 'lucide-react-native';
import { PieChart, LineChart } from 'react-native-chart-kit';
import Slider from '@react-native-community/slider';

const screenWidth = Dimensions.get("window").width;

const SIPCalculatorScreen = ({ navigation }: any) => {
    const { currency, accentColor } = useSettingsStore();
    const { themeColors } = useTheme();

    const [mode, setMode] = useState<'SIP' | 'LUMPSUM'>('SIP');
    const [investment, setInvestment] = useState(25000);
    const [rate, setRate] = useState(12);
    const [years, setYears] = useState(10);
    const [initialAmount, setInitialAmount] = useState(0); // Optional for SIP

    // Step-up states
    const [enableStepUp, setEnableStepUp] = useState(false);
    const [stepUpType, setStepUpType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
    const [stepUpValue, setStepUpValue] = useState(10); // % or Amount

    const [results, setResults] = useState({
        invested: 0,
        returns: 0,
        total: 0
    });

    const [chartData, setChartData] = useState<{ labels: string[], data: number[], investedData?: number[] }>({ labels: [], data: [] });

    const [tooltip, setTooltip] = useState<{ x: number, y: number, visible: boolean, index: number }>({ x: 0, y: 0, visible: false, index: 0 });

    useEffect(() => {
        calculate();
    }, [mode, investment, rate, years, initialAmount, enableStepUp, stepUpType, stepUpValue]);

    const formatAmountInWords = (amount: number) => {
        if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Crore`;
        if (amount >= 100000) return `${(amount / 100000).toFixed(2)} Lakh`;
        return '';
    };

    const formatYLabelCompact = (value: string) => {
        const val = parseFloat(value);
        if (val >= 10000000) return (val / 10000000).toFixed(1) + ' Cr';
        if (val >= 100000) return (val / 100000).toFixed(1) + ' L';
        if (val >= 1000) return (val / 1000).toFixed(1) + ' k';
        return val.toFixed(0);
    };

    const calculate = () => {
        let totalInvested = 0;
        let totalValue = 0;
        const investedData: number[] = [];
        const totalData: number[] = [];
        const labels: string[] = [];

        if (mode === 'LUMPSUM') {
            totalInvested = investment;
            totalValue = investment * Math.pow((1 + rate / 100), years);

            // Generate chart data
            for (let i = 0; i <= years; i++) {
                const val = investment * Math.pow((1 + rate / 100), i);
                investedData.push(investment); // Constant for lumpsum
                totalData.push(val);
                if (i === 0 || i === years || i % Math.max(1, Math.floor(years / 5)) === 0) {
                    labels.push((new Date().getFullYear() + i).toString());
                } else {
                    labels.push('');
                }
            }

        } else {
            // SIP Calculation with Step Up
            let currentMonthlyInvestment = investment;
            let currentCorpus = initialAmount;
            let currentInvested = initialAmount;

            // Start point
            investedData.push(currentInvested);
            totalData.push(currentCorpus);
            labels.push((new Date().getFullYear()).toString());

            const monthlyRate = rate / 12 / 100;

            for (let y = 1; y <= years; y++) {
                for (let m = 1; m <= 12; m++) {
                    currentCorpus = (currentCorpus + currentMonthlyInvestment) * (1 + monthlyRate);
                    currentInvested += currentMonthlyInvestment;
                }

                if (enableStepUp) {
                    if (stepUpType === 'PERCENTAGE') {
                        currentMonthlyInvestment += currentMonthlyInvestment * (stepUpValue / 100);
                    } else {
                        currentMonthlyInvestment += stepUpValue;
                    }
                }

                investedData.push(currentInvested);
                totalData.push(currentCorpus);

                if (y === years || y % Math.max(1, Math.floor(years / 5)) === 0) {
                    labels.push((new Date().getFullYear() + y).toString());
                } else {
                    labels.push('');
                }
            }
            totalInvested = currentInvested;
            totalValue = currentCorpus;
        }

        setResults({
            invested: Math.round(totalInvested),
            returns: Math.round(totalValue - totalInvested),
            total: Math.round(totalValue)
        });

        setChartData({ labels, data: totalData, investedData }); // Check type def change in state
    };

    const handleTextChange = (text: string, setter: (val: number) => void) => {
        const val = parseFloat(text.replace(/,/g, ''));
        setter(isNaN(val) ? 0 : val);
    };

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft color={themeColors.text} size={28} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: themeColors.text }]}>SIP Calculator</Text>
                <View style={{ width: 28 }} />
            </View>
            <Text style={{ color: themeColors.textSecondary, marginBottom: 20, textAlign: 'center' }}>Calculate your SIP and Lumpsum investment returns</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>

                    {/* Toggle Mode */}
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity style={[styles.toggleBtn, mode === 'SIP' && styles.activeToggle]} onPress={() => setMode('SIP')}>
                            <Text style={[styles.toggleText, mode === 'SIP' && styles.activeToggleText]}>SIP</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.toggleBtn, mode === 'LUMPSUM' && styles.activeToggle]} onPress={() => setMode('LUMPSUM')}>
                            <Text style={[styles.toggleText, mode === 'LUMPSUM' && styles.activeToggleText]}>Lumpsum</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Investment Input */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: themeColors.text }]}>
                            {mode === 'SIP' ? 'Monthly Investment' : 'Total Investment'}
                        </Text>
                        <View style={[styles.inputContainer, { borderColor: accentColor }]}>
                            <Text style={[styles.currencyPrefix, { color: accentColor }]}>{currency}</Text>
                            <TextInput
                                style={[styles.input, { color: themeColors.text }]}
                                keyboardType="numeric"
                                value={investment.toLocaleString()}
                                onChangeText={(t) => handleTextChange(t, setInvestment)}
                            />
                        </View>
                        <Text style={[styles.wordAmount, { color: themeColors.textSecondary }]}>{formatAmountInWords(investment)}</Text>
                        <Slider
                            value={investment}
                            minimumValue={500}
                            maximumValue={1000000}
                            step={500}
                            onValueChange={setInvestment}
                            minimumTrackTintColor={accentColor}
                            thumbTintColor={accentColor}
                            style={{ marginTop: 10 }}
                        />
                    </View>

                    {/* Rate Input */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: themeColors.text }]}>Expected Return Rate (p.a)</Text>
                        <View style={[styles.inputContainer, { borderColor: accentColor }]}>
                            <TextInput
                                style={[styles.input, { color: themeColors.text }]}
                                keyboardType="numeric"
                                value={rate.toString()}
                                onChangeText={(t) => handleTextChange(t, setRate)}
                            />
                            <Text style={[styles.suffix, { color: accentColor }]}>%</Text>
                        </View>
                        <Slider
                            value={rate}
                            minimumValue={1}
                            maximumValue={30}
                            step={0.1}
                            onValueChange={setRate}
                            minimumTrackTintColor={accentColor}
                            thumbTintColor={accentColor}
                            style={{ marginTop: 10 }}
                        />
                    </View>

                    {/* Time Input */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: themeColors.text }]}>Time Period</Text>
                        <View style={[styles.inputContainer, { borderColor: accentColor }]}>
                            <TextInput
                                style={[styles.input, { color: themeColors.text }]}
                                keyboardType="numeric"
                                value={years.toString()}
                                onChangeText={(t) => handleTextChange(t, setYears)}
                            />
                            <Text style={[styles.suffix, { color: accentColor }]}>Yr</Text>
                        </View>
                        <Slider
                            value={years}
                            minimumValue={1}
                            maximumValue={40}
                            step={1}
                            onValueChange={setYears}
                            minimumTrackTintColor={accentColor}
                            thumbTintColor={accentColor}
                            style={{ marginTop: 10 }}
                        />
                    </View>

                    {/* Optional Initial Amount for SIP */}
                    {mode === 'SIP' ? (
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: themeColors.text }]}>Initial Amount (Optional)</Text>
                            <View style={[styles.inputContainer, { borderColor: themeColors.border }]}>
                                <Text style={[styles.currencyPrefix, { color: themeColors.textSecondary }]}>{currency}</Text>
                                <TextInput
                                    style={[styles.input, { color: themeColors.text }]}
                                    keyboardType="numeric"
                                    value={initialAmount.toLocaleString()}
                                    onChangeText={(t) => handleTextChange(t, setInitialAmount)}
                                />
                            </View>
                            <Text style={[styles.wordAmount, { color: themeColors.textSecondary }]}>{formatAmountInWords(initialAmount)}</Text>
                        </View>
                    ) : null}

                    {/* SIP Step Up */}
                    {mode === 'SIP' ? (
                        <View style={styles.stepUpSection}>
                            <View style={styles.rowBetween}>
                                <Text style={[styles.label, { color: themeColors.text }]}>Enable step-up SIP</Text>
                                <Switch
                                    value={enableStepUp}
                                    onValueChange={setEnableStepUp}
                                    trackColor={{ false: "#767577", true: accentColor }}
                                />
                            </View>

                            {enableStepUp ? (
                                <>
                                    <View style={styles.toggleContainerSmall}>
                                        <TouchableOpacity
                                            style={[styles.toggleBtnSmall, stepUpType === 'PERCENTAGE' && styles.activeToggleSmall]}
                                            onPress={() => setStepUpType('PERCENTAGE')}
                                        >
                                            <Text style={[styles.toggleTextSmall, stepUpType === 'PERCENTAGE' && styles.activeToggleTextSmall]}>Percentage</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.toggleBtnSmall, stepUpType === 'FIXED' && styles.activeToggleSmall]}
                                            onPress={() => setStepUpType('FIXED')}
                                        >
                                            <Text style={[styles.toggleTextSmall, stepUpType === 'FIXED' && styles.activeToggleTextSmall]}>Amount</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.label, { color: themeColors.text }]}>
                                            {stepUpType === 'PERCENTAGE' ? 'Yearly increase (%)' : 'Yearly increase (Amount)'}
                                        </Text>
                                        <View style={[styles.inputContainer, { borderColor: accentColor }]}>
                                            <TextInput
                                                style={[styles.input, { color: themeColors.text }]}
                                                keyboardType="numeric"
                                                value={stepUpValue.toString()}
                                                onChangeText={(t) => handleTextChange(t, setStepUpValue)}
                                            />
                                            {stepUpType === 'PERCENTAGE' ? <Text style={[styles.suffix, { color: accentColor }]}>%</Text> : null}
                                        </View>
                                        <Slider
                                            value={stepUpValue}
                                            minimumValue={stepUpType === 'PERCENTAGE' ? 1 : 100}
                                            maximumValue={stepUpType === 'PERCENTAGE' ? 20 : 10000}
                                            step={stepUpType === 'PERCENTAGE' ? 1 : 100}
                                            onValueChange={setStepUpValue}
                                            minimumTrackTintColor={accentColor}
                                            thumbTintColor={accentColor}
                                        />
                                    </View>
                                </>
                            ) : null}
                        </View>
                    ) : null}
                </View>

                {/* Results Section with Donut */}
                <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border, alignItems: 'center' }]}>
                    <View style={{ justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                        <PieChart
                            data={[
                                { name: 'Invested', population: results.invested, color: accentColor, legendFontColor: themeColors.text, legendFontSize: 10 },
                                { name: 'Returns', population: results.returns, color: accentColor + '40', legendFontColor: themeColors.text, legendFontSize: 10 },
                            ]}
                            width={180}
                            height={180}
                            chartConfig={{
                                color: (opacity = 1) => accentColor,
                            }}
                            accessor={"population"}
                            backgroundColor={"transparent"}
                            paddingLeft={"45"}
                            hasLegend={false}
                            absolute
                        />
                    </View>

                    <View style={{ width: '100%', paddingHorizontal: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                            <ResultRow label="Invested amount" value={results.invested} currency={currency} color={themeColors.text} />
                            <ResultRow label="Est. returns" value={results.returns} currency={currency} color={themeColors.text} />
                        </View>
                        <View style={[styles.divider, { marginVertical: 8 }]} />
                        <View style={{ alignItems: 'center', marginVertical: 8 }}>
                            <ResultRow label="Total value" value={results.total} currency={currency} bold color={accentColor} size={24} center />
                        </View>
                    </View>

                    {/* Donut Legend */}
                    <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'center', gap: 20, marginTop: 10 }}>
                        <LegendItem color={accentColor} label="Invested" textColor={themeColors.text} />
                        <LegendItem color={accentColor + '40'} label="Returns" textColor={themeColors.text} />
                    </View>
                </View>

                {/* Wealth Projection Chart */}
                <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border, marginBottom: 50, marginTop: 10 }]}>
                    <Text style={[styles.subHead, { color: themeColors.text }]}>Growth Projection</Text>
                    {chartData.data.length > 0 ? (
                        <View>
                            <LineChart
                                data={{
                                    labels: chartData.labels,
                                    datasets: [
                                        { data: chartData.data, color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`, strokeWidth: 2 }, // Total Value
                                        { data: chartData.investedData || [], color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, strokeWidth: 2 } // Invested
                                    ],
                                    legend: ['Lumpsum + SIP Value', 'Total Invested']
                                }}
                                width={screenWidth - 60}
                                height={220}
                                yAxisLabel={currency === 'PKR' ? 'Rs ' : '$'}
                                yAxisSuffix=""
                                formatYLabel={formatYLabelCompact}
                                chartConfig={{
                                    backgroundColor: themeColors.surface,
                                    backgroundGradientFrom: themeColors.surface,
                                    backgroundGradientTo: themeColors.surface,
                                    decimalPlaces: 0,
                                    color: (opacity = 1) => accentColor,
                                    labelColor: (opacity = 1) => themeColors.textSecondary,
                                    propsForDots: { r: "4", strokeWidth: "2", stroke: "#fff" },
                                    propsForBackgroundLines: { strokeWidth: 0 }
                                }}
                                withInnerLines={false}
                                withOuterLines={false}
                                withVerticalLines={false}
                                withHorizontalLines={false}
                                bezier
                                onDataPointClick={({ x, y, index }) => {
                                    setTooltip({ x, y, visible: true, index });
                                }}
                                style={{ marginVertical: 8, borderRadius: 16 }}
                            />
                            {tooltip.visible && tooltip.index < chartData.data.length ? (
                                <View style={[styles.tooltip, { left: Math.min(tooltip.x - 50, screenWidth - 160), top: tooltip.y - 60, backgroundColor: themeColors.surface, borderColor: accentColor }]}>
                                    <View>
                                        <Text style={[styles.tooltipLabel, { color: themeColors.textSecondary }]}>Year {chartData.labels[tooltip.index]}</Text>
                                        <Text style={[styles.tooltipValue, { color: accentColor }]}>Total: {currency}{chartData.data[tooltip.index].toLocaleString()}</Text>
                                        <Text style={[styles.tooltipValue, { color: '#10B981' }]}>Inv: {currency}{chartData.investedData?.[tooltip.index].toLocaleString()}</Text>
                                    </View>
                                </View>
                            ) : null}
                        </View>
                    ) : null}
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

// UI Helpers
const ResultRow = ({ label, value, currency, bold, color, size, center }: any) => (
    <View style={[{ marginBottom: 12 }, center && { alignItems: 'center' }]}>
        <Text style={{ fontSize: 11, color: '#888' }}>{label}</Text>
        <Text style={{ fontSize: size || 15, fontWeight: bold ? '800' : '600', color: color }}>
            {currency} {value.toLocaleString()}
        </Text>
    </View>
);

const LegendItem = ({ color, label, textColor }: any) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
        <Text style={{ fontSize: 12, color: textColor }}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    backBtn: { padding: 4 },
    title: { fontSize: 24, fontWeight: '800' },
    card: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    toggleContainer: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 30, padding: 4, marginBottom: 20 },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 25 },
    activeToggle: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    toggleText: { fontWeight: '600', color: '#6b7280', fontSize: 14 },
    activeToggleText: { color: '#000', fontWeight: '700' },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '600', marginBottom: 8, color: '#374151' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, height: 56, backgroundColor: '#f9fafb' },
    currencyPrefix: { fontSize: 16, fontWeight: 'bold', marginRight: 8 },
    input: { flex: 1, fontSize: 18, fontWeight: '700' },
    suffix: { fontSize: 14, fontWeight: '700' },
    stepUpSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    toggleContainerSmall: { flexDirection: 'row', width: 220, backgroundColor: '#f3f4f6', borderRadius: 20, padding: 3, marginBottom: 15 },
    toggleBtnSmall: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 18 },
    activeToggleSmall: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
    toggleTextSmall: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
    activeToggleTextSmall: { color: '#000', fontWeight: '700' },
    divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },
    subHead: { fontSize: 18, fontWeight: '700', marginBottom: 15 },

    wordAmount: { fontSize: 12, fontWeight: '500', marginTop: 6, marginLeft: 2, color: '#6b7280' },
    tooltip: { position: 'absolute', padding: 8, borderRadius: 8, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5, zIndex: 10, minWidth: 120 },
    tooltipLabel: { fontSize: 10, marginBottom: 2, fontWeight: '600' },
    tooltipValue: { fontSize: 11, fontWeight: '700' }
});

export default SIPCalculatorScreen;
