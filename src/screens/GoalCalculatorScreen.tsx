import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Switch, TextInput } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTheme } from '../hooks/useTheme';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { ChevronLeft } from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import Slider from '@react-native-community/slider';

const screenWidth = Dimensions.get("window").width;

const GoalCalculatorScreen = ({ navigation }: any) => {
    const { currency, accentColor } = useSettingsStore();
    const { themeColors } = useTheme();

    const [targetAmount, setTargetAmount] = useState(1000000);
    const [years, setYears] = useState(12);
    const [rate, setRate] = useState(15);
    const [frequency, setFrequency] = useState<'Monthly' | 'Quarterly' | 'Half Yearly' | 'Yearly'>('Monthly');
    const [initialAmount, setInitialAmount] = useState(0);

    const [requiredInvestment, setRequiredInvestment] = useState(0);
    const [projectionData, setProjectionData] = useState<{ labels: string[], data: number[], investedData?: number[] }>({ labels: [], data: [] });

    const [tooltip, setTooltip] = useState<{ x: number, y: number, visible: boolean, index: number }>({ x: 0, y: 0, visible: false, index: 0 });

    useEffect(() => {
        calculate();
    }, [targetAmount, years, rate, frequency, initialAmount]);

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
        // Goal Calculation Logic
        // We need to find 'P' (Periodic Investment)

        // FV_total = FV_initial + FV_sip
        // Target = Initial * (1 + r_eff)^N + P * [ (1 + r_eff)^N - 1 ] / r_eff * (1 + r_eff)
        // Note: Mutual funds usually assume investment at beginning of period (SIP), so * (1+r) term is there.

        const r = rate / 100;
        let n = 12; // frequency per year
        if (frequency === 'Quarterly') n = 4;
        if (frequency === 'Half Yearly') n = 2;
        if (frequency === 'Yearly') n = 1;

        const r_eff = r / n;
        const totalPeriods = years * n;

        // Future Value of Initial Lump Sum
        const fv_initial = initialAmount * Math.pow((1 + r_eff), totalPeriods);

        // Remaining Target to be achieved by SIP
        const remainingTarget = targetAmount - fv_initial;

        let pmt = 0;
        if (remainingTarget > 0) {
            // P = Target / [ ((1+i)^N - 1)/i * (1+i) ]
            // Denominator
            const factor = (Math.pow(1 + r_eff, totalPeriods) - 1) / r_eff * (1 + r_eff);
            pmt = remainingTarget / factor;
        }

        setRequiredInvestment(Math.max(0, Math.round(pmt)));

        // Generate Projection Data with both invested and total value
        const chartLabels = [];
        const chartData = [];
        const investedData = [];
        const step = Math.max(1, Math.floor(years / 6));

        for (let y = 0; y <= years; y++) {
            if (y % step === 0 || y === years) {
                chartLabels.push((new Date().getFullYear() + y).toString());

                // Calculate corpus at year y
                const periods = y * n;
                const fv_init = initialAmount * Math.pow((1 + r_eff), periods);

                let fv_sip = 0;
                if (pmt > 0 && periods > 0) {
                    fv_sip = pmt * ((Math.pow(1 + r_eff, periods) - 1) / r_eff) * (1 + r_eff);
                }

                // Total invested till year y
                const totalInvested = initialAmount + (pmt * periods);

                investedData.push(Math.round(totalInvested));
                chartData.push(Math.round(fv_init + fv_sip));
            }
        }

        setProjectionData({ labels: chartLabels, data: chartData, investedData });
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
                <Text style={[styles.title, { color: themeColors.text }]}>Goal Calculator</Text>
                <View style={{ width: 28 }} />
            </View>
            <Text style={{ color: themeColors.textSecondary, marginBottom: 20, textAlign: 'center' }}>Plan your financial future by calculating the investment needed to reach your goals</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>

                    {/* Target Amount */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: themeColors.text }]}>Target Amount (Goal)</Text>
                        <View style={[styles.inputContainer, { borderColor: accentColor }]}>
                            <Text style={[styles.currencyPrefix, { color: accentColor }]}>{currency}</Text>
                            <TextInput
                                style={[styles.input, { color: themeColors.text }]}
                                keyboardType="numeric"
                                value={targetAmount.toLocaleString()}
                                onChangeText={(t) => handleTextChange(t, setTargetAmount)}
                            />
                        </View>
                        <Text style={[styles.wordAmount, { color: themeColors.textSecondary }]}>{formatAmountInWords(targetAmount)}</Text>
                        <Slider
                            value={targetAmount}
                            minimumValue={100000}
                            maximumValue={100000000}
                            step={100000}
                            onValueChange={setTargetAmount}
                            minimumTrackTintColor={accentColor}
                            thumbTintColor={accentColor}
                            style={{ marginTop: 10 }}
                        />
                    </View>

                    {/* Time Period */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: themeColors.text }]}>Time Period</Text>
                        <View style={[styles.inputContainer, { borderColor: accentColor }]}>
                            <TextInput
                                style={[styles.input, { color: themeColors.text }]}
                                keyboardType="numeric"
                                value={years.toString()}
                                onChangeText={(t) => handleTextChange(t, setYears)}
                            />
                            <Text style={[styles.suffix, { color: accentColor }]}>Years</Text>
                        </View>
                        <Slider
                            value={years}
                            minimumValue={1}
                            maximumValue={40}
                            step={1}
                            onValueChange={setYears}
                            minimumTrackTintColor={accentColor}
                            thumbTintColor={accentColor}
                        />
                    </View>

                    {/* Rate */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: themeColors.text }]}>Expected Annual Return</Text>
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
                        />
                    </View>

                    {/* Frequency */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: themeColors.text }]}>Investment Frequency</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                            {['Monthly', 'Quarterly', 'Half Yearly', 'Yearly'].map((freq) => (
                                <TouchableOpacity
                                    key={freq}
                                    style={[styles.freqBtn, frequency === freq && { backgroundColor: accentColor + '20', borderColor: accentColor }]}
                                    onPress={() => setFrequency(freq as any)}
                                >
                                    <View style={[styles.radioOuter, { borderColor: frequency === freq ? accentColor : themeColors.textSecondary }]}>
                                        {frequency === freq ? <View style={[styles.radioInner, { backgroundColor: accentColor }]} /> : null}
                                    </View>
                                    <Text style={{ color: themeColors.text, fontSize: 12 }}>{freq}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Initial Lumpsum */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: themeColors.text }]}>Initial Lumpsum (Optional)</Text>
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
                </View>

                {/* Result Card */}
                <View style={[styles.resultCard, { backgroundColor: '#F3E8FF', borderColor: '#D8B4FE' }]}>
                    <Text style={{ fontSize: 12, color: '#6B21A8', marginBottom: 4, fontWeight: '600' }}>Required Investment</Text>
                    <Text style={{ fontSize: 36, fontWeight: '800', color: '#7E22CE', letterSpacing: -1 }}>
                        {currency} {requiredInvestment.toLocaleString()}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#6B21A8', marginTop: 2 }}>per {frequency.replace('ly', '').toLowerCase()}</Text>
                    <Text style={{ fontSize: 10, color: '#9333EA', marginTop: 8, opacity: 0.7 }}>{formatAmountInWords(requiredInvestment)}</Text>
                </View>

                {/* Summary */}
                <View style={{ padding: 20 }}>
                    <View style={styles.summaryRow}>
                        <Text style={{ color: themeColors.textSecondary }}>Total Investment</Text>
                        <Text style={{ color: themeColors.text, fontWeight: '700' }}>
                            {currency} {Math.round((requiredInvestment * years * (frequency === 'Monthly' ? 12 : frequency === 'Quarterly' ? 4 : frequency === 'Half Yearly' ? 2 : 1)) + initialAmount).toLocaleString()}
                        </Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={{ color: themeColors.textSecondary }}>Target Amount</Text>
                        <Text style={{ color: themeColors.text, fontWeight: '700' }}>
                            {currency} {targetAmount.toLocaleString()}
                        </Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={{ color: themeColors.textSecondary }}>Expected Returns</Text>
                        <Text style={{ color: '#10B981', fontWeight: '700' }}>
                            +{currency} {Math.round(targetAmount - ((requiredInvestment * years * (frequency === 'Monthly' ? 12 : frequency === 'Quarterly' ? 4 : frequency === 'Half Yearly' ? 2 : 1)) + initialAmount)).toLocaleString()}
                        </Text>
                    </View>
                </View>

                {/* What if returns are different? */}
                <View style={{ marginBottom: 24, paddingLeft: 20 }}>
                    <Text style={[styles.subHead, { color: themeColors.text, fontSize: 13, paddingRight: 20 }]}>ⓘ What if returns are different?</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20, gap: 10 }}>
                        {[rate - 5, rate - 2, rate, rate + 2, rate + 5].map((r) => {
                            if (r <= 0) return null;
                            // Calculate PMT for this rate
                            const localR = r / 100;
                            let n = 12;
                            if (frequency === 'Quarterly') n = 4;
                            if (frequency === 'Half Yearly') n = 2;
                            if (frequency === 'Yearly') n = 1;

                            const r_eff = localR / n;
                            const totalPeriods = years * n;
                            const fv_initial = initialAmount * Math.pow((1 + r_eff), totalPeriods);
                            const remTarget = targetAmount - fv_initial;
                            let localPmt = 0;
                            if (remTarget > 0) {
                                const factor = (Math.pow(1 + r_eff, totalPeriods) - 1) / r_eff * (1 + r_eff);
                                localPmt = remTarget / factor;
                            }

                            const isCurrent = r === rate;

                            return (
                                <View key={r} style={[styles.whatIfCard, isCurrent ? { borderColor: accentColor, backgroundColor: accentColor + '10' } : { borderColor: themeColors.border, backgroundColor: themeColors.surface }]}>
                                    <Text style={{ fontSize: 10, color: themeColors.textSecondary }}>At {r.toFixed(1)}% return</Text>
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: isCurrent ? accentColor : themeColors.text, marginVertical: 4 }}>
                                        {currency} {Math.round(localPmt).toLocaleString()}
                                    </Text>
                                    <Text style={{ fontSize: 10, color: themeColors.textSecondary }}>per {frequency.replace('ly', '').toLowerCase()}</Text>
                                    {isCurrent ? <Text style={{ fontSize: 9, color: accentColor, fontWeight: 'bold', marginTop: 4 }}>Current</Text> : null}
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* CTA */}

                {/* Path to Goal Chart */}
                <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border, marginBottom: 50, marginTop: 20 }]}>
                    <Text style={[styles.subHead, { color: themeColors.text }]}>Path to Goal</Text>
                    {projectionData.data.length > 0 ? (
                        <View>
                            <LineChart
                                data={{
                                    labels: projectionData.labels,
                                    datasets: [
                                        { data: projectionData.data, color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`, strokeWidth: 2 }, // Target Path
                                        { data: projectionData.investedData || [], color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, strokeWidth: 2 } // Invested
                                    ],
                                    legend: ['Goal Value', 'Invested']
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
                            {tooltip.visible && tooltip.index < projectionData.data.length ? (
                                <View style={[styles.tooltip, { left: Math.min(tooltip.x - 50, screenWidth - 160), top: tooltip.y - 60, backgroundColor: themeColors.surface, borderColor: accentColor }]}>
                                    <View>
                                        <Text style={[styles.tooltipLabel, { color: themeColors.textSecondary }]}>Year {projectionData.labels[tooltip.index]}</Text>
                                        <Text style={[styles.tooltipValue, { color: accentColor }]}>Goal: {currency}{projectionData.data[tooltip.index].toLocaleString()}</Text>
                                        <Text style={[styles.tooltipValue, { color: '#10B981' }]}>Inv: {currency}{projectionData.investedData?.[tooltip.index].toLocaleString()}</Text>
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

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    backBtn: { padding: 4 },
    title: { fontSize: 24, fontWeight: '800' },
    card: { padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, height: 54, backgroundColor: 'rgba(0,0,0,0.02)' },
    currencyPrefix: { fontSize: 16, fontWeight: 'bold', marginRight: 8 },
    input: { flex: 1, fontSize: 18, fontWeight: '700' },
    suffix: { fontSize: 14, fontWeight: '700' },

    freqBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 24, borderWidth: 1.5, borderColor: '#eee', gap: 6 },
    radioOuter: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    radioInner: { width: 8, height: 8, borderRadius: 4 },

    resultCard: { padding: 30, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, marginBottom: 20, shadowColor: '#9333EA', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    ctaBtn: { padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 20 },
    ctaText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
    subHead: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
    whatIfCard: { padding: 12, borderRadius: 12, borderWidth: 1, minWidth: 100, alignItems: 'center' },
    wordAmount: { fontSize: 12, fontWeight: '500', marginTop: 6, marginLeft: 2, color: '#6b7280' },
    tooltip: { position: 'absolute', padding: 8, borderRadius: 8, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5, zIndex: 10, minWidth: 120 },
    tooltipLabel: { fontSize: 10, marginBottom: 2, fontWeight: '600' },
    tooltipValue: { fontSize: 11, fontWeight: '700' }
});

export default GoalCalculatorScreen;
