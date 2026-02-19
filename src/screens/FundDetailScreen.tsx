import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, TextInput, Alert, Platform, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';
import { useTheme } from '../hooks/useTheme';
import { getNAVHistory, updateNAV, Account, getAccounts, deleteAccount, updateAccount, getTransactions, Transaction, deleteNAVHistoryEntry, updateNAVHistoryEntry, updateUnits } from '../db/database';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { ChevronLeft, TrendingUp, TrendingDown, Target, LineChart as ChartIcon, Plus, Save, Settings, Trash2, X as CloseIcon, ArrowLeftRight, Download, Calendar, History as HistoryIcon, ArrowRight } from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Path, Text as TextSVG } from 'react-native-svg';
import { MUTUAL_FUND_AMCS } from '../constants/amcs';
import { getSetting } from '../db/database';
import { fetchFundMatches, NAVData, syncFundReturns } from '../services/navSync';
import { getNAVRangeForFund } from '../services/navHistoryService';
import { Landmark, Search, Image as ImageIcon } from 'lucide-react-native';
import { Image } from 'react-native';
import { getAMCIconSource } from '../utils/amcIcons';
import { getInitials } from '../utils/helpers';
import ShariahIcon from '../components/ShariahIcon';

const { width } = Dimensions.get('window');

const FundDetailScreen = ({ navigation, route }: any) => {
    const { fundId } = route.params;
    const { currency, theme, accentColor } = useSettingsStore();
    const { themeColors } = useTheme();

    const [fund, setFund] = useState<Account | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [newNAV, setNewNAV] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    // Edit states
    const [editName, setEditName] = useState('');
    const [editRisk, setEditRisk] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');
    const [editNAV, setEditNAV] = useState('');
    const [editInvestDate, setEditInvestDate] = useState(new Date());
    const [editLockedProfit, setEditLockedProfit] = useState('0');
    const [editIsShariah, setEditIsShariah] = useState(0);
    const [editFundType, setEditFundType] = useState<'MUTUAL_FUND' | 'VPS' | 'ETF'>('MUTUAL_FUND');
    const [editAmcName, setEditAmcName] = useState('');
    const [editFundCode, setEditFundCode] = useState('');
    const [showAMCModal, setShowAMCModal] = useState(false);
    const [amcSearch, setAmcSearch] = useState('');
    const [showFundModal, setShowFundModal] = useState(false);
    const [fundSearch, setFundSearch] = useState('');
    const [isLoadingNAV, setIsLoadingNAV] = useState(false);
    const [potentialNAVMatches, setPotentialNAVMatches] = useState<NAVData[]>([]);
    const [showNAVSelectionModal, setShowNAVSelectionModal] = useState(false);
    const [fundReturns, setFundReturns] = useState<any>(null);
    const [indexedNavData, setIndexedNavData] = useState<{ date: string; value: number }[]>([]);

    // History Edit States
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showEditHistoryDialog, setShowEditHistoryDialog] = useState(false);
    const [editingHistoryItem, setEditingHistoryItem] = useState<any>(null);
    const [editHistoryNAV, setEditHistoryNAV] = useState('');
    const [editHistoryDate, setEditHistoryDate] = useState(new Date());
    const [showHistoryDatePicker, setShowHistoryDatePicker] = useState(false);

    useEffect(() => {
        if (!fund?.name) return;

        const loadReturns = async () => {
            const { fundReturnsCache, lastFundReturnsSync } = useSettingsStore.getState();

            // Check cache validity (5 minutes)
            let useCache = false;
            if (fundReturnsCache && lastFundReturnsSync) {
                const diff = new Date().getTime() - new Date(lastFundReturnsSync).getTime();
                if (diff < 5 * 60 * 1000) {
                    useCache = true;
                }
            }

            let returnsData = fundReturnsCache;

            if (!useCache || !returnsData) {
                console.log('Cache expired or missing, fetching returns...');
                const newData = await syncFundReturns();
                if (newData) returnsData = newData;
            } else {
                console.log('Using cached fund returns');
            }

            if (returnsData && Array.isArray(returnsData)) {
                const match = returnsData.find((f: any) => f.fund === fund.name);
                if (match) {
                    setFundReturns(match.returns);
                }
            }
        };

        loadReturns();
    }, [fund?.name]);

    // Load indexed NAV chart data (base 100) from investment date to today
    useEffect(() => {
        if (!fund?.name || !fund?.investmentDate) return;

        const loadIndexedData = async () => {
            const today = new Date().toISOString();
            const fromDate = fund.investmentDate!;

            // Try archive DB first
            let range = await getNAVRangeForFund(fund.name, fromDate, today);

            // Fallback: use local nav_history synced entries
            if (range.length === 0 && history.length > 0) {
                range = history.map(h => ({ date: h.date, nav: h.nav }));
            }

            if (range.length < 2) return;

            const baseNAV = range[0].nav;
            if (baseNAV <= 0) return;

            // Downsample to max 60 points for performance
            const maxPoints = 60;
            const step = range.length > maxPoints ? Math.floor(range.length / maxPoints) : 1;
            const sampled = range.filter((_, i) => i % step === 0 || i === range.length - 1);

            const indexed = sampled.map(r => ({
                date: r.date,
                value: parseFloat(((r.nav / baseNAV) * 100).toFixed(2))
            }));

            setIndexedNavData(indexed);
        };

        loadIndexedData();
    }, [fund?.name, fund?.investmentDate, history]);

    const formatWithCommas = (val: string) => {
        const clean = val.replace(/,/g, '');
        if (!clean) return '';
        const parts = clean.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    };

    const handleNAVChange = (val: string) => {
        const clean = val.replace(/,/g, '');
        if (clean === '' || /^\d*\.?\d*$/.test(clean)) {
            setEditNAV(formatWithCommas(clean));
        }
    };

    const handleProfitChange = (val: string) => {
        const clean = val.replace(/,/g, '');
        if (clean === '' || /^\d*\.?\d*$/.test(clean)) {
            setEditLockedProfit(formatWithCommas(clean));
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [fundId])
    );

    const loadData = () => {
        const all = getAccounts();
        const f = all.find(a => a.id === fundId);
        if (f) {
            const txs = getTransactions(1000, undefined, fundId);

            // Recalculate units from transaction history (source of truth)
            let computedUnits = 0;
            const sortedTxs = [...txs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            sortedTxs.forEach(tx => {
                const isInflow = tx.toAccountId === fundId;
                const isOutflow = tx.fromAccountId === fundId;
                if (!isInflow && !isOutflow) return;
                const nav = tx.transactionNAV || f.currentNAV || 0;
                const unitChange = nav > 0 ? tx.amount / nav : 0;
                if (isInflow) computedUnits += unitChange;
                else computedUnits -= unitChange;
            });
            computedUnits = Math.max(0, computedUnits);

            // Sync DB if there's a drift
            if (Math.abs(computedUnits - (f.unitsOwned || 0)) > 0.0001) {
                updateUnits(fundId, computedUnits);
                f.unitsOwned = computedUnits; // update local copy immediately
            }

            setFund(f);
            setHistory(getNAVHistory(fundId));
            setTransactions(txs);

            // Set edit states
            setEditName(f.name);
            setEditRisk(f.riskLevel || 'LOW');
            setEditNAV(formatWithCommas(f.currentNAV?.toString() || ''));
            setEditInvestDate(f.investmentDate ? new Date(f.investmentDate) : new Date());
            setEditLockedProfit(formatWithCommas(f.lockedProfit?.toString() || '0'));
            setEditIsShariah(f.isShariahCompliant || 0);
            setEditFundType(f.fundType || 'MUTUAL_FUND');
            setEditAmcName(f.amcName || '');
            setEditFundCode(f.fundCode || '');
        }
    };

    const handleUpdateNAV = () => {
        const nav = parseFloat(newNAV.replace(/,/g, ''));
        if (isNaN(nav) || nav <= 0) {
            Alert.alert('Error', 'Please enter a valid NAV');
            return;
        }

        setIsUpdating(true);
        updateNAV(fundId, nav);
        setNewNAV('');
        setIsUpdating(false);
        loadData();
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Fund',
            'Are you sure you want to delete this fund? All history will be lost.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        deleteAccount(fundId);
                        navigation.goBack();
                    }
                }
            ]
        );
    };

    const handleDeleteHistory = (id: number) => {
        Alert.alert(
            'Delete Entry',
            'Are you sure you want to delete this history record?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        deleteNAVHistoryEntry(id);
                        loadData(); // Reload history
                    }
                }
            ]
        );
    };

    const handleUpdateHistoryEntry = () => {
        if (!editingHistoryItem) return;
        const nav = parseFloat(editHistoryNAV);
        if (isNaN(nav) || nav <= 0) {
            Alert.alert('Error', 'Invalid NAV value');
            return;
        }

        updateNAVHistoryEntry(editingHistoryItem.id, nav, editHistoryDate.toISOString());
        setShowEditHistoryDialog(false);
        loadData();
    };

    const handleSaveEdit = () => {
        if (!editName.trim()) {
            Alert.alert('Error', 'Name is required');
            return;
        }
        const nav = parseFloat(editNAV.replace(/,/g, '')) || 0;
        const princ = fund?.principalAmount || 0;
        const units = fund?.unitsOwned || 0;
        const balance = units * nav || fund?.balance || 0;

        updateAccount(
            fundId,
            editName,
            'MUTUAL_FUND',
            balance,
            currency,
            undefined,
            undefined,
            editRisk,
            units,
            nav,
            princ,
            editInvestDate.toISOString().split('T')[0],
            parseFloat(editLockedProfit.replace(/,/g, '')) || 0,
            editIsShariah,
            editFundType,
            editAmcName,
            editFundCode
        );
        // Auto sync returns on save
        syncFundReturns().catch(e => console.log('Background returns sync failed', e));

        setShowEditModal(false);
        loadData();
    };

    if (!fund) return null;

    const profit = fund.balance - (fund.principalAmount || 0);
    const dailyChange = history.length > 1 ? (fund.currentNAV || 0) - history[history.length - 2].nav : 0;
    const dailyProfit = dailyChange * (fund.unitsOwned || 0);
    const isProfit = profit >= 0;
    const isDailyProfit = dailyProfit >= 0;

    // Prepare chart data starting from inception
    const initialNav = (fund.principalAmount && fund.unitsOwned) ? (fund.principalAmount + (fund.lockedProfit || 0)) / fund.unitsOwned : (fund.currentNAV || 0);
    const inceptionPoint = { nav: initialNav, date: fund.investmentDate || new Date().toISOString() };
    const chartHistory = [inceptionPoint, ...history];

    const chartData = {
        labels: chartHistory.length > 7 ? chartHistory.slice(-7).map(h => format(new Date(h.date), 'dd/MM')) : chartHistory.map(h => format(new Date(h.date), 'dd/MM')),
        datasets: [{
            data: chartHistory.length > 0 ? chartHistory.slice(-7).map(h => h.nav) : [fund.currentNAV || 0],
            color: (opacity = 1) => isProfit ? `rgba(16, 185, 129, ${opacity})` : `rgba(239, 68, 68, ${opacity})`,
            strokeWidth: 3
        }]
    };

    return (
        <ScreenWrapper noPadding>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: themeColors.surface, marginRight: 12 }]}>
                    <ChevronLeft color={themeColors.text} size={24} />
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
                    {(() => {
                        const iconSource = getAMCIconSource(fund.amcName);
                        return iconSource ? (
                            <Image
                                source={iconSource}
                                style={{ width: 36, height: 36, borderRadius: 8, marginRight: 10 }}
                            />
                        ) : (
                            <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: themeColors.surface, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                                <TrendingUp size={22} color={accentColor} />
                            </View>
                        );
                    })()}
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Text style={[styles.headerTitle, { color: themeColors.text, marginRight: 8, textAlign: 'center' }]}>
                                {fund.name}
                            </Text>
                            {fund.isShariahCompliant === 1 ? (
                                <ShariahIcon size={18} color="#10B981" />
                            ) : null}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, justifyContent: 'center' }}>
                            {(() => {
                                let typeLabel = fund.fundType === 'VPS' ? 'VPS' : 'Mutual Fund';
                                let typeColor = fund.fundType === 'VPS' ? '#8B5CF6' : '#10B981';

                                // Auto detect ETF if name mentions it or if explicitly set
                                if (fund.fundType === 'ETF' || fund.name.toUpperCase().includes('ETF') || fund.name.toUpperCase().includes('EXCHANGE TRADED FUND')) {
                                    typeLabel = 'ETF';
                                    typeColor = '#3B82F6';
                                }

                                return (
                                    <View style={{ backgroundColor: typeColor + '20', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginRight: 6 }}>
                                        <Text style={{ fontSize: 9, color: typeColor, fontWeight: 'bold' }}>{typeLabel}</Text>
                                    </View>
                                );
                            })()}
                            <Text style={{ fontSize: 11, fontWeight: '700', color: themeColors.textSecondary }}>
                                {fund.fundCode || getInitials(fund.name)}
                            </Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity onPress={handleDelete} style={[styles.backBtn, { backgroundColor: themeColors.surface, marginLeft: 12 }]}>
                    <Trash2 color="#EF4444" size={20} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
                <View style={[styles.mainCard, { backgroundColor: isProfit ? '#10B98115' : '#EF444415', borderColor: isProfit ? '#10B98130' : '#EF444430' }]}>
                    <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.cardLabel, { color: themeColors.textSecondary }]}>Total Value</Text>
                            <Text style={[styles.cardValue, { color: themeColors.text, fontSize: 28 }]}>{currency} {fund.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                                <Text style={{ fontSize: 14, color: isDailyProfit ? '#10B981' : '#EF4444', fontWeight: 'bold' }}>
                                    {isDailyProfit ? '↑' : '↓'} {currency} {Math.abs(dailyProfit).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </Text>
                                <Text style={{ fontSize: 13, color: themeColors.textSecondary, marginLeft: 6 }}>Daily P/L</Text>
                            </View>
                        </View>
                        <View style={[styles.arrowBox, { backgroundColor: isProfit ? '#10B981' : '#EF4444' }]}>
                            {isProfit ? <TrendingUp color="white" size={28} /> : <TrendingDown color="white" size={28} />}
                        </View>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Principal</Text>
                            <Text style={[styles.statValue, { color: themeColors.text, fontSize: 15 }]}>{currency} {fund.principalAmount?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Gain/Loss</Text>
                            <Text style={[styles.statValue, { color: isProfit ? '#10B981' : '#EF4444', fontSize: 15 }]}>
                                {isProfit ? '+' : ''}{currency} {profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>CGT (15%)</Text>
                            <Text style={[styles.statValue, { color: isProfit ? '#F59E0B' : themeColors.textSecondary, fontSize: 15 }]}>
                                {currency} {(isProfit ? profit * 0.15 : 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity onPress={() => navigation.navigate('AddTransaction', { initialTab: 'Investment', initialInvestTab: 'Invest', preselectedToAccount: fundId })} style={[styles.actionButton, { backgroundColor: '#10B981' }]}>
                        <Plus color="white" size={18} />
                        <Text style={[styles.actionButtonText, { color: 'white' }]}>Invest</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('AddTransaction', { initialTab: 'Investment', initialInvestTab: 'Redeem', preselectedFromAccount: fundId })} style={[styles.actionButton, { backgroundColor: '#EF4444' }]}>
                        <ArrowLeftRight color="white" size={18} />
                        <Text style={[styles.actionButtonText, { color: 'white' }]}>Redeem</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('AddTransaction', { initialTab: 'Investment', initialInvestTab: 'Convert', preselectedFromAccount: fundId })} style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}>
                        <ArrowRight color="white" size={18} />
                        <Text style={[styles.actionButtonText, { color: 'white' }]}>Convert</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.section, { marginTop: 32 }]}>
                    <View style={styles.sectionHeader}>
                        <ChartIcon size={20} color={accentColor} />
                        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Performance Analysis</Text>
                        {indexedNavData.length > 0 ? (
                            <View style={{ marginLeft: 'auto', alignItems: 'flex-end' }}>
                                <Text style={{ fontSize: 11, color: themeColors.textSecondary }}>Current (Base 100)</Text>
                                <Text style={{
                                    fontSize: 15,
                                    fontWeight: '800',
                                    color: (indexedNavData[indexedNavData.length - 1]?.value ?? 100) >= 100 ? '#10B981' : '#EF4444'
                                }}>
                                    {indexedNavData[indexedNavData.length - 1]?.value?.toFixed(2)}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    {indexedNavData.length > 1 ? (() => {
                        const vals = indexedNavData.map(d => d.value);
                        const currentVal = vals[vals.length - 1];
                        const isChartProfit = currentVal >= 100;
                        const lineColor = isChartProfit ? '#3B82F6' : '#EF4444';

                        // Chart dimensions
                        const chartW = width - 40;
                        const chartH = 220;
                        const padLeft = 30; // Increased to fit Y-axis labels
                        const padRight = 4;
                        const padTop = 16;
                        const padBottom = 32; // space for date labels
                        const plotW = chartW - padLeft - padRight;
                        const plotH = chartH - padTop - padBottom;

                        const minVal = Math.min(...vals, 100); // ensure 100 is in range or handled
                        const maxVal = Math.max(...vals, 100);
                        const valRange = maxVal - minVal || 1;

                        // Map value → Y pixel (top = maxVal, bottom = minVal)
                        const toY = (v: number) => padTop + plotH - ((v - minVal) / valRange) * plotH;
                        // Map index → X pixel
                        const toX = (i: number) => padLeft + (i / (vals.length - 1)) * plotW;

                        // Build smooth polyline path
                        const points = vals.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');

                        // Y position of the 100 baseline
                        const y100 = toY(100);
                        // Y position of the line just above date labels (bottom of plot area)
                        const yBottom = padTop + plotH;

                        // Date labels: 6 labels evenly spaced
                        const dateLabelCount = 6;
                        const dateLabelIndices = Array.from({ length: dateLabelCount }, (_, i) =>
                            Math.floor((i * (vals.length - 1)) / (dateLabelCount - 1))
                        );
                        const dateLabels = dateLabelIndices.map(i => ({
                            x: toX(i),
                            label: format(new Date(indexedNavData[i].date), 'dd/MM/yy')
                        }));

                        // Y-axis labels: At least 5 labels evenly spaced
                        const yTicks = 5;
                        const yAxisLabels = Array.from({ length: yTicks }, (_, i) => {
                            const val = minVal + (i * valRange) / (yTicks - 1);
                            return { val: Math.round(val), y: toY(val) };
                        });

                        // Ensure 100 is included if it's within range but not already represented
                        if (!yAxisLabels.some(l => Math.abs(l.val - 100) < 2)) {
                            yAxisLabels.push({ val: 100, y: y100 });
                        }
                        yAxisLabels.sort((a, b) => a.val - b.val);

                        return (
                            <View style={{ alignItems: 'center', marginTop: 10 }}>
                                <Svg width={chartW} height={chartH}>
                                    {/* Y-axis labels rendered as SVG Text */}
                                    {yAxisLabels.map((l, i) => (
                                        <TextSVG
                                            key={i}
                                            x={padLeft - 5}
                                            y={l.y + 3}
                                            fontSize="9"
                                            fill={themeColors.textSecondary}
                                            textAnchor="end"
                                        >
                                            {l.val}
                                        </TextSVG>
                                    ))}

                                    {/* Line above date labels (X-axis) */}
                                    <Path
                                        d={`M ${padLeft} ${yBottom} L ${chartW - padRight} ${yBottom}`}
                                        stroke={themeColors.border}
                                        strokeWidth={1}
                                        opacity={0.6}
                                    />
                                    {/* Vertical line on the left (Y-axis) */}
                                    <Path
                                        d={`M ${padLeft} ${padTop} L ${padLeft} ${yBottom}`}
                                        stroke={themeColors.border}
                                        strokeWidth={1}
                                        opacity={0.6}
                                    />
                                    {/* Baseline at 100 — only draw if 100 is within visible range */}
                                    {y100 >= padTop && y100 <= yBottom ? (
                                        <Path
                                            d={`M ${padLeft} ${y100.toFixed(1)} L ${chartW - padRight} ${y100.toFixed(1)}`}
                                            stroke={themeColors.textSecondary}
                                            strokeWidth={1}
                                            strokeDasharray="4,4"
                                            opacity={0.4}
                                        />
                                    ) : null}
                                    {/* Main data line */}
                                    <Path
                                        d={points.split(' ').map((p, i) => `${i === 0 ? 'M' : 'L'} ${p}`).join(' ')}
                                        stroke={lineColor}
                                        strokeWidth={2.5}
                                        fill="none"
                                        strokeLinejoin="round"
                                        strokeLinecap="round"
                                    />
                                    {/* Date labels rendered as SVG Text */}
                                    {dateLabels.map((dl, i) => (
                                        <TextSVG
                                            key={i}
                                            x={dl.x}
                                            y={chartH - 8}
                                            fontSize="8"
                                            fill={themeColors.textSecondary}
                                            textAnchor={i === 0 ? "start" : i === dateLabels.length - 1 ? "end" : "middle"}
                                        >
                                            {dl.label}
                                        </TextSVG>
                                    ))}
                                </Svg>
                            </View>
                        );
                    })() : (
                        <View style={[styles.emptyChart, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                            <Text style={{ color: themeColors.textSecondary }}>Collecting data for growth chart...</Text>
                        </View>
                    )}
                </View>

                <View style={[styles.section, { marginTop: 32 }]}>
                    <View style={styles.sectionHeader}>
                        <Target size={20} color={accentColor} />
                        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Current Holdings</Text>
                    </View>

                    <View style={[styles.holdingGrid, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                        <View style={styles.holdingItem}>
                            <Text style={[styles.holdingLabel, { color: themeColors.textSecondary }]}>Units Base</Text>
                            <Text style={[styles.holdingValue, { color: themeColors.text }]}>{fund.unitsOwned?.toFixed(4)}</Text>
                        </View>
                        <View style={[styles.dividerVertical, { backgroundColor: themeColors.border }]} />
                        <View style={styles.holdingItem}>
                            <Text style={[styles.holdingLabel, { color: themeColors.textSecondary }]}>Market NAV</Text>
                            <Text style={[styles.holdingValue, { color: themeColors.text }]}>{currency} {fund.currentNAV?.toLocaleString()}</Text>
                        </View>
                    </View>
                </View>

                <View style={[styles.section, { marginTop: 32 }]}>
                    <View style={[styles.infoCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={[styles.calendarIconBox, { backgroundColor: accentColor + '20' }]}>
                                <Calendar size={20} color={accentColor} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: themeColors.text, fontSize: 16, fontWeight: '700' }}>{fund.investmentDate ? format(new Date(fund.investmentDate), 'PPP') : 'Inception Date Not Set'}</Text>
                                <Text style={{ color: themeColors.textSecondary, fontSize: 13 }}>Investment Start Date</Text>
                            </View>
                            <View style={[styles.riskTag, { backgroundColor: fund.riskLevel === 'LOW' ? '#10B98120' : fund.riskLevel === 'MEDIUM' ? '#F59E0B20' : '#EF444420' }]}>
                                <Text style={{ color: fund.riskLevel === 'LOW' ? '#10B981' : fund.riskLevel === 'MEDIUM' ? '#F59E0B' : '#EF4444', fontSize: 12, fontWeight: 'bold' }}>
                                    {fund.riskLevel} Risk
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {fundReturns ? (
                    <View style={[styles.section, { marginTop: 32 }]}>
                        <View style={styles.sectionHeader}>
                            <TrendingUp size={20} color={accentColor} />
                            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Returns on Rs. 100,000</Text>
                        </View>
                        <View style={[styles.returnsTable, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                            {/* Header */}
                            <View style={styles.tableRow}>
                                <Text style={[styles.tableHeader, { flex: 1.2 }]}>Duration</Text>
                                <Text style={[styles.tableHeader, { flex: 1, textAlign: 'right' }]}>Return %</Text>
                                <Text style={[styles.tableHeader, { flex: 1.5, textAlign: 'right' }]}>Value (Rs)</Text>
                            </View>
                            <View style={styles.tableDivider} />
                            {/* Rows */}
                            {['1d', '15d', '30d', '90d', '180d', '270d', '365d', '2y', '3y'].map((key, index) => {
                                const val = fundReturns[key];
                                if (val === null || val === undefined) return null;
                                const rupees = val * 1000;
                                const label = key
                                    .replace('1d', '1 Day')
                                    .replace('15d', '15 Days')
                                    .replace('30d', '30 Days')
                                    .replace('90d', '90 Days')
                                    .replace('180d', '180 Days')
                                    .replace('270d', '270 Days')
                                    .replace('365d', '365 Days')
                                    .replace('2y', '2 Years')
                                    .replace('3y', '3 Years');

                                return (
                                    <View key={key}>
                                        <View style={styles.tableRow}>
                                            <Text style={{ flex: 1.2, color: themeColors.text, fontWeight: '500' }}>{label}</Text>
                                            <Text style={{ flex: 1, textAlign: 'right', color: val >= 0 ? '#10B981' : '#EF4444', fontWeight: '600' }}>{val}%</Text>
                                            <Text style={{ flex: 1.5, textAlign: 'right', color: val >= 0 ? '#10B981' : '#EF4444', fontWeight: '700' }}>
                                                {rupees.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                            </Text>
                                        </View>
                                        {index < 8 ? (
                                            <View style={[styles.divider, { opacity: 0.05, backgroundColor: themeColors.text }]} />
                                        ) : null}
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                ) : null}

                <View style={[styles.section, { marginTop: 32 }]}>
                    <View style={styles.sectionHeader}>
                        <HistoryIcon size={20} color={accentColor} />
                        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Transaction History</Text>
                        <Text style={{ color: themeColors.textSecondary, fontSize: 12, marginLeft: 'auto' }}>{transactions.length} records</Text>
                    </View>
                    {transactions.length > 0 ? (() => {
                        // Build running unit totals (oldest → newest)
                        const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                        let runningUnits = 0;
                        const unitMap: Record<number, { unitChange: number; unitsAfter: number; isInflow: boolean }> = {};
                        sorted.forEach(tx => {
                            // Inflow: money/units coming INTO the fund (toAccountId === fundId, or INCOME directly to fund)
                            // Outflow: money/units leaving the fund (fromAccountId === fundId, including EXPENSE/CGT)
                            const isInflow = tx.toAccountId === fundId;
                            const isOutflow = tx.fromAccountId === fundId;
                            if (!isInflow && !isOutflow) return; // skip unrelated transactions

                            const nav = tx.transactionNAV || fund?.currentNAV || 0;
                            const unitChange = nav > 0 ? tx.amount / nav : 0;
                            if (isInflow) {
                                runningUnits += unitChange;
                            } else {
                                runningUnits -= unitChange;
                            }
                            unitMap[tx.id] = { unitChange, unitsAfter: Math.max(0, runningUnits), isInflow };
                        });

                        return (
                            <View style={{ gap: 10 }}>
                                {transactions.map((transaction) => {
                                    const unitInfo = unitMap[transaction.id];
                                    const isInflow = unitInfo ? unitInfo.isInflow : (transaction.toAccountId === fundId);
                                    const nav = transaction.transactionNAV || fund?.currentNAV || 0;
                                    return (
                                        <View
                                            key={transaction.id}
                                            style={[styles.transactionRow, {
                                                backgroundColor: themeColors.surface,
                                                borderColor: themeColors.border,
                                                borderWidth: 1,
                                                borderRadius: 16,
                                                opacity: transaction.isSystem === 1 ? 0.65 : 1,
                                                flexDirection: 'column',
                                                padding: 14,
                                                gap: 0
                                            }]}
                                        >
                                            {/* Top row: category + amount */}
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <View style={{ flex: 1 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                        <View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: isInflow ? '#10B981' : '#EF4444' }]} />
                                                        <Text style={[styles.transactionCategory, { color: themeColors.text }]}>{transaction.category.replace('Mutual Fund ', '')}</Text>
                                                        {transaction.isSystem === 1 ? (
                                                            <View style={{ backgroundColor: themeColors.border, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 }}>
                                                                <Text style={{ fontSize: 7, color: themeColors.textSecondary }}>System</Text>
                                                            </View>
                                                        ) : null}
                                                    </View>
                                                    <Text style={[styles.transactionDate, { color: themeColors.textSecondary, marginTop: 2 }]}>{format(new Date(transaction.date), 'dd MMM yyyy')}</Text>
                                                </View>
                                                <View style={{ alignItems: 'flex-end' }}>
                                                    <Text style={[styles.transactionAmount, { color: isInflow ? '#10B981' : '#EF4444' }]}>
                                                        {isInflow ? '+' : '-'}{currency} {transaction.amount.toLocaleString()}
                                                    </Text>
                                                    {transaction.cgtAmount && transaction.cgtAmount > 0 ? (
                                                        <Text style={{ fontSize: 10, color: '#F59E0B', marginTop: 2 }}>CGT: {currency} {transaction.cgtAmount.toLocaleString()}</Text>
                                                    ) : null}
                                                </View>
                                            </View>

                                            {/* Bottom row: unit info */}
                                            {unitInfo && nav > 0 ? (
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: themeColors.border }}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={{ fontSize: 10, color: themeColors.textSecondary }}>NAV Used</Text>
                                                        <Text style={{ fontSize: 11, fontWeight: '700', color: themeColors.text }}>{nav.toLocaleString(undefined, { maximumFractionDigits: 4 })}</Text>
                                                    </View>
                                                    <View style={{ alignItems: 'center', flex: 1 }}>
                                                        <Text style={{ fontSize: 10, color: themeColors.textSecondary }}>Units {isInflow ? 'Bought' : 'Sold'}</Text>
                                                        <Text style={{ fontSize: 11, fontWeight: '700', color: isInflow ? '#10B981' : '#EF4444' }}>
                                                            {isInflow ? '+' : '-'}{unitInfo.unitChange.toFixed(4)}
                                                        </Text>
                                                    </View>
                                                    <View style={{ alignItems: 'flex-end', flex: 1 }}>
                                                        <Text style={{ fontSize: 10, color: themeColors.textSecondary }}>Remaining</Text>
                                                        <Text style={{ fontSize: 11, fontWeight: '700', color: themeColors.text }}>{unitInfo.unitsAfter.toFixed(4)}</Text>
                                                    </View>
                                                </View>
                                            ) : null}
                                        </View>
                                    );
                                })}
                            </View>
                        );
                    })() : (
                        <View style={[styles.emptyState, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                            <Text style={{ color: themeColors.textSecondary }}>No transaction records found</Text>
                        </View>
                    )}
                </View>


            </ScrollView >

            {/* Config Modal */}
            < Modal visible={showEditModal} animationType="slide" transparent >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Fund Configuration</Text>
                            <TouchableOpacity onPress={() => setShowEditModal(false)}>
                                <CloseIcon color={themeColors.text} size={24} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ padding: 20 }}>
                            <View style={styles.inputContainer}>
                                <Text style={[styles.label, { color: themeColors.textSecondary }]}>Fund Display Name (Mapped)</Text>
                                <TextInput
                                    style={[styles.input, { color: themeColors.text, borderColor: themeColors.border, opacity: 0.7 }]}
                                    value={editName}
                                    editable={false}
                                />
                                <Text style={{ fontSize: 10, color: themeColors.textSecondary, marginTop: 4 }}>Name is locked to selected fund</Text>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={[styles.label, { color: themeColors.textSecondary }]}>Asset Management Company (AMC)</Text>
                                <TouchableOpacity
                                    style={[styles.input, { borderColor: themeColors.border, justifyContent: 'center' }]}
                                    onPress={() => setShowAMCModal(true)}
                                >
                                    <Text style={{ color: editAmcName ? themeColors.text : themeColors.textSecondary, fontSize: 16, fontWeight: editAmcName ? '700' : '400' }}>
                                        {editAmcName || 'Select AMC'}
                                    </Text>
                                </TouchableOpacity>

                                <Text style={[styles.label, { color: themeColors.textSecondary, marginTop: 15 }]}>Choose Fund</Text>
                                <TouchableOpacity
                                    style={[styles.input, { borderColor: themeColors.border, justifyContent: 'center' }]}
                                    onPress={() => {
                                        if (!editAmcName) {
                                            alert('Please select an AMC first');
                                            return;
                                        }
                                        setShowFundModal(true);
                                    }}
                                >
                                    <Text style={{ color: editName ? themeColors.text : themeColors.textSecondary, fontSize: 16, fontWeight: editName ? '700' : '400' }}>
                                        {editName || 'Select Fund...'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={[styles.label, { color: themeColors.textSecondary }]}>Fund Code (Abbreviation)</Text>
                                <TextInput
                                    style={[styles.input, { color: themeColors.text, borderColor: themeColors.border }]}
                                    placeholder="e.g. MIIF"
                                    placeholderTextColor={themeColors.textSecondary}
                                    value={editFundCode}
                                    onChangeText={setEditFundCode}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={[styles.label, { color: themeColors.textSecondary }]}>Fund Type</Text>
                                <View style={styles.riskTabs}>
                                    {(['MUTUAL_FUND', 'VPS', 'ETF'] as const).map(ft => (
                                        <TouchableOpacity
                                            key={ft}
                                            onPress={() => setEditFundType(ft)}
                                            style={[
                                                styles.riskTab,
                                                { borderColor: themeColors.border },
                                                editFundType === ft ? {
                                                    backgroundColor: ft === 'VPS' ? '#8B5CF6' : ft === 'ETF' ? '#3B82F6' : '#10B981',
                                                    borderColor: 'transparent'
                                                } : {}
                                            ]}
                                        >
                                            <Text style={[styles.riskTabText, { color: editFundType === ft ? 'white' : themeColors.textSecondary }]}>
                                                {ft === 'MUTUAL_FUND' ? 'Mutual Fund' : ft === 'VPS' ? 'VPS' : 'ETF'}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={[styles.label, { color: themeColors.textSecondary }]}>Risk Profile</Text>
                                <View style={styles.riskTabs}>
                                    {(['LOW', 'MEDIUM', 'HIGH'] as const).map(level => (
                                        <TouchableOpacity
                                            key={level}
                                            onPress={() => setEditRisk(level)}
                                            style={[
                                                styles.riskTab,
                                                { borderColor: themeColors.border },
                                                editRisk === level ? { backgroundColor: accentColor, borderColor: accentColor } : {}
                                            ]}
                                        >
                                            <Text style={[styles.riskTabText, { color: editRisk === level ? 'white' : themeColors.textSecondary }]}>{level}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={[styles.label, { color: themeColors.textSecondary }]}>Correct Current NAV</Text>
                                <TextInput
                                    style={[styles.input, { color: themeColors.text, borderColor: themeColors.border }]}
                                    value={editNAV}
                                    onChangeText={handleNAVChange}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={[styles.label, { color: themeColors.textSecondary }]}>Locked Profit (Legacy)</Text>
                                <TextInput
                                    style={[styles.input, { color: themeColors.text, borderColor: themeColors.border }]}
                                    value={editLockedProfit}
                                    onChangeText={handleProfitChange}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={[styles.inputContainer, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }]}>
                                <View>
                                    <Text style={[styles.label, { color: themeColors.textSecondary, marginBottom: 0 }]}>Shariah Compliant</Text>
                                    <Text style={{ fontSize: 12, color: themeColors.textSecondary }}>Displays religious icon next to name</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setEditIsShariah(editIsShariah === 1 ? 0 : 1)}
                                    style={{
                                        width: 50,
                                        height: 28,
                                        borderRadius: 14,
                                        backgroundColor: editIsShariah === 1 ? accentColor : themeColors.border,
                                        padding: 4,
                                        justifyContent: 'center'
                                    }}
                                >
                                    <View style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: 10,
                                        backgroundColor: 'white',
                                        transform: [{ translateX: editIsShariah === 1 ? 22 : 0 }]
                                    }} />
                                </TouchableOpacity>
                            </View>

                            <View style={{ marginTop: 20 }}>
                                <TouchableOpacity
                                    style={[styles.historyBtn, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                                    onPress={() => {
                                        setShowEditModal(false);
                                        setShowHistoryModal(true);
                                    }}
                                >
                                    <HistoryIcon color={themeColors.text} size={20} />
                                    <Text style={[styles.historyBtnText, { color: themeColors.text }]}>Manage NAV History</Text>
                                    <ChevronLeft size={16} color={themeColors.textSecondary} style={{ transform: [{ rotate: '180deg' }], marginLeft: 'auto' }} />
                                </TouchableOpacity>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 40 }}>
                                <TouchableOpacity
                                    style={[styles.deleteBtn, { borderColor: '#EF4444' }]}
                                    onPress={handleDelete}
                                >
                                    <Trash2 color="#EF4444" size={20} />
                                    <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Delete</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.saveBtn, { backgroundColor: accentColor }]}
                                    onPress={handleSaveEdit}
                                >
                                    <Save color="white" size={20} />
                                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Update All</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal >

            {/* NAV History Management Modal */}
            < Modal visible={showHistoryModal} animationType="slide" transparent >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: themeColors.text }]}>NAV History</Text>
                            <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                                <CloseIcon color={themeColors.text} size={24} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={{ padding: 20 }}>
                            {history.length === 0 ? (
                                <View style={{ padding: 40, alignItems: 'center' }}>
                                    <Text style={{ color: themeColors.textSecondary }}>No history records found</Text>
                                </View>
                            ) : (
                                history.slice().reverse().map((entry, index) => (
                                    <View key={entry.id || index} style={[styles.historyRow, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 16, fontWeight: '700', color: themeColors.text }}>{entry.nav}</Text>
                                            <Text style={{ fontSize: 12, color: themeColors.textSecondary }}>{format(new Date(entry.date), 'dd MMM yyyy, hh:mm a')}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 12 }}>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setEditingHistoryItem(entry);
                                                    setEditHistoryNAV(entry.nav.toString());
                                                    setEditHistoryDate(new Date(entry.date));
                                                    setShowEditHistoryDialog(true);
                                                }}
                                                style={{ padding: 8, backgroundColor: accentColor + '15', borderRadius: 8 }}
                                            >
                                                <Settings size={18} color={accentColor} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => handleDeleteHistory(entry.id)}
                                                style={{ padding: 8, backgroundColor: '#EF444415', borderRadius: 8 }}
                                            >
                                                <Trash2 size={18} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal >

            {/* Edit Single History Entry Dialog (Nested Modal) */}
            < Modal visible={showEditHistoryDialog} transparent animationType="fade" >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: themeColors.surface, borderRadius: 24, padding: 24 }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: themeColors.text, marginBottom: 16 }}>Edit History Entry</Text>

                        <Text style={[styles.label, { color: themeColors.textSecondary }]}>NAV Value</Text>
                        <TextInput
                            style={[styles.input, { color: themeColors.text, borderColor: themeColors.border, marginBottom: 16 }]}
                            value={editHistoryNAV}
                            onChangeText={setEditHistoryNAV}
                            keyboardType="numeric"
                        />

                        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Record Date</Text>
                        <TouchableOpacity
                            onPress={() => setShowHistoryDatePicker(true)}
                            style={[styles.input, { borderColor: themeColors.border, justifyContent: 'center', marginBottom: 20 }]}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <Calendar size={18} color={accentColor} />
                                <Text style={{ color: themeColors.text, fontSize: 16 }}>{format(editHistoryDate, 'PPp')}</Text>
                            </View>
                        </TouchableOpacity>

                        {showHistoryDatePicker ? (
                            <DateTimePicker
                                value={editHistoryDate}
                                mode="datetime"
                                onChange={(e, date) => {
                                    setShowHistoryDatePicker(false);
                                    if (date) setEditHistoryDate(date);
                                }}
                            />
                        ) : null}

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                            <TouchableOpacity onPress={() => setShowEditHistoryDialog(false)} style={{ paddingVertical: 10, paddingHorizontal: 16 }}>
                                <Text style={{ color: themeColors.textSecondary, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleUpdateHistoryEntry}
                                style={{ backgroundColor: accentColor, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20 }}
                            >
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>Save Changes</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal >

            {/* AMC Selection Modal */}
            < Modal visible={showAMCModal} animationType="slide" transparent={true} >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: themeColors.background, height: '80%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={{ fontSize: 20, fontWeight: 'bold', color: themeColors.text }}>Select AMC</Text>
                            <TouchableOpacity onPress={() => setShowAMCModal(false)}>
                                <CloseIcon color={themeColors.text} size={24} />
                            </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: themeColors.surface, borderRadius: 12, paddingHorizontal: 12, marginBottom: 15, borderWidth: 1, borderColor: themeColors.border }}>
                            <Search size={18} color={themeColors.textSecondary} />
                            <TextInput
                                style={{ flex: 1, height: 44, paddingHorizontal: 10, color: themeColors.text }}
                                placeholder="Search AMC..."
                                placeholderTextColor={themeColors.textSecondary}
                                value={amcSearch}
                                onChangeText={setAmcSearch}
                            />
                            {amcSearch ? (
                                <TouchableOpacity onPress={() => setAmcSearch('')} style={{ padding: 4 }}>
                                    <CloseIcon size={14} color={themeColors.textSecondary} />
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {Object.keys(MUTUAL_FUND_AMCS)
                                .filter(amc => amc.toLowerCase().includes(amcSearch.toLowerCase()))
                                .map(amc => (
                                    <TouchableOpacity
                                        key={amc}
                                        style={{ paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: themeColors.border }}
                                        onPress={() => {
                                            setEditAmcName(amc);
                                            setEditName('');
                                            setEditNAV('');
                                            setShowAMCModal(false);
                                        }}
                                    >
                                        <Text style={{ color: themeColors.text, fontSize: 15 }}>{amc}</Text>
                                    </TouchableOpacity>
                                ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal >

            {/* Fund Selection Modal */}
            < Modal visible={showFundModal} animationType="slide" transparent={true} >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: themeColors.background, height: '80%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <View>
                                <Text style={{ fontSize: 20, fontWeight: 'bold', color: themeColors.text }}>Select Fund</Text>
                                <Text style={{ fontSize: 12, color: themeColors.textSecondary }}>{editAmcName}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowFundModal(false)}>
                                <CloseIcon color={themeColors.text} size={24} />
                            </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: themeColors.surface, borderRadius: 12, paddingHorizontal: 12, marginBottom: 15, borderWidth: 1, borderColor: themeColors.border }}>
                            <Search size={18} color={themeColors.textSecondary} />
                            <TextInput
                                style={{ flex: 1, height: 44, paddingHorizontal: 10, color: themeColors.text }}
                                placeholder="Search Fund..."
                                placeholderTextColor={themeColors.textSecondary}
                                value={fundSearch}
                                onChangeText={setFundSearch}
                            />
                            {fundSearch ? (
                                <TouchableOpacity onPress={() => setFundSearch('')} style={{ padding: 4 }}>
                                    <CloseIcon size={14} color={themeColors.textSecondary} />
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {editAmcName ? MUTUAL_FUND_AMCS[editAmcName]
                                .filter(f => f.toLowerCase().includes(fundSearch.toLowerCase()))
                                .map((fundItem, idx) => (
                                    <TouchableOpacity
                                        key={`${fundItem}-${idx}`}
                                        style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: themeColors.border }}
                                        onPress={async () => {
                                            setEditName(fundItem);
                                            setShowFundModal(false);
                                            setIsLoadingNAV(true);
                                            const matches = await fetchFundMatches(fundItem);

                                            if (matches.length > 1) {
                                                setPotentialNAVMatches(matches);
                                                setShowNAVSelectionModal(true);
                                            } else if (matches.length === 1) {
                                                const nav = matches[0].nav;
                                                setEditNAV(formatWithCommas(nav.toString()));
                                            }
                                            setIsLoadingNAV(false);
                                        }}
                                    >
                                        <Text style={{ color: themeColors.text, fontSize: 15, fontWeight: '500' }}>{fundItem}</Text>
                                    </TouchableOpacity>
                                )) : null
                            }
                        </ScrollView>
                    </View>
                </View>
            </Modal >

            {/* NAV Selection Modal */}
            < Modal visible={showNAVSelectionModal} animationType="slide" transparent={true} >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: themeColors.background, height: '60%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <View>
                                <Text style={{ fontSize: 20, fontWeight: 'bold', color: themeColors.text }}>Specify NAV</Text>
                                <Text style={{ fontSize: 12, color: themeColors.textSecondary }}>Multiple versions found. Please select one:</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowNAVSelectionModal(false)}>
                                <CloseIcon color={themeColors.text} size={24} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {potentialNAVMatches.map((match, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: themeColors.border }}
                                    onPress={() => {
                                        setEditName(match.fund);
                                        setEditNAV(formatWithCommas(match.nav.toString()));
                                        setShowNAVSelectionModal(false);
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View style={{ flex: 1, marginRight: 10 }}>
                                            <Text style={{ color: themeColors.text, fontSize: 14, fontWeight: '600' }}>{match.fund}</Text>
                                            <Text style={{ color: themeColors.textSecondary, fontSize: 11, marginTop: 2 }}>Date: {match.date}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={{ color: accentColor, fontSize: 18, fontWeight: 'bold' }}>{match.nav}</Text>
                                            <Text style={{ color: themeColors.textSecondary, fontSize: 10 }}>NAV</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal >
        </ScreenWrapper >
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.03)' },
    backBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    mainCard: { padding: 24, borderRadius: 28, borderWidth: 1, marginBottom: 10 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
    cardLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
    cardValue: { fontWeight: '800' },
    arrowBox: { width: 54, height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 24, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
    statItem: { flex: 1 },
    statLabel: { fontSize: 12, fontWeight: '500', marginBottom: 6 },
    statValue: { fontWeight: '700' },
    section: {},
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
    sectionTitle: { fontSize: 17, fontWeight: 'bold' },
    emptyChart: { height: 220, justifyContent: 'center', alignItems: 'center', borderRadius: 20, borderStyle: 'dashed', borderWidth: 1 },
    holdingGrid: { flexDirection: 'row', padding: 24, borderRadius: 20, borderWidth: 1 },
    holdingItem: { flex: 1, alignItems: 'center' },
    holdingLabel: { fontSize: 12, fontWeight: '500', marginBottom: 8 },
    holdingValue: { fontSize: 18, fontWeight: '800' },
    dividerVertical: { width: 1 },
    actionRow: { flexDirection: 'row', gap: 10, marginTop: 24 },
    actionButton: { flex: 1, height: 54, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    actionButtonText: { fontSize: 14, fontWeight: 'bold' },
    updateBox: { padding: 16, borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 12 },
    navInput: { flex: 1, height: 50, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, fontSize: 16, fontWeight: '500' },
    updateBtn: { paddingHorizontal: 16, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
    updateBtnText: { color: 'white', fontWeight: '800', fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { height: '90%', borderTopLeftRadius: 36, borderTopRightRadius: 36, overflow: 'hidden' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
    modalTitle: { fontSize: 22, fontWeight: '900' },
    inputContainer: { marginBottom: 24 },
    label: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
    input: { height: 54, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, fontSize: 16, fontWeight: '500' },
    riskTabs: { flexDirection: 'row', gap: 10 },
    riskTab: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    riskTabText: { fontSize: 13, fontWeight: '700' },
    deleteBtn: { flex: 1, height: 58, borderRadius: 16, borderWidth: 1.5, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    saveBtn: { flex: 2, height: 58, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    transactionList: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
    transactionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
    transactionInfo: { flex: 1 },
    transactionCategory: { fontSize: 15, fontWeight: '600' },
    transactionDate: { fontSize: 12, marginTop: 4 },
    transactionAmount: { fontSize: 15, fontWeight: '800' },
    viewAllBtn: { marginTop: 16, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    infoCard: { padding: 18, borderRadius: 20, borderWidth: 1 },
    calendarIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    divider: { height: 1 },
    riskTag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    emptyState: { padding: 30, alignItems: 'center', borderRadius: 20, borderWidth: 1, borderStyle: 'dashed' },
    returnsTable: { borderRadius: 20, borderWidth: 1, padding: 16, overflow: 'hidden' },
    tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
    tableHeader: { fontSize: 13, fontWeight: '700', color: '#9CA3AF' },
    tableDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginBottom: 4 },
    historyBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
    historyBtnText: { fontSize: 15, fontWeight: '600' },
    historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
});

export default FundDetailScreen;
