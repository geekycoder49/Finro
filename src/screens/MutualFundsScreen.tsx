import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Alert, Modal, TextInput, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';
import { useTheme } from '../hooks/useTheme';
import { getAccounts, Account, updateNAV } from '../db/database';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { TrendingUp, TrendingDown, Shield, ShieldAlert, ShieldCheck, Plus, ChevronRight, Save, X, ChevronDown, Moon, Settings, BarChart2, RefreshCw, CloudDownload } from 'lucide-react-native';
import { getNAVHistory, getSetting } from '../db/database';
import Svg, { Path } from 'react-native-svg';
import { getAMCIconSource } from '../utils/amcIcons';
import { getInitials } from '../utils/helpers';
import { syncAllFunds } from '../services/navSync';
import ShariahIcon from '../components/ShariahIcon';



const { width } = Dimensions.get('window');

const MutualFundsScreen = ({ navigation }: any) => {
    const { currency, theme, accentColor } = useSettingsStore();
    const { themeColors } = useTheme();

    const [funds, setFunds] = useState<Account[]>([]);
    const [totalInvestment, setTotalInvestment] = useState(0);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [selectedFundId, setSelectedFundId] = useState<number | null>(null);
    const [updateValue, setUpdateValue] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadFunds();
        }, [])
    );

    const loadFunds = () => {
        const allAccounts = getAccounts();
        const mf = allAccounts.filter(a => a.type === 'MUTUAL_FUND');
        setFunds(mf);
        setTotalInvestment(mf.reduce((sum, f) => sum + f.balance, 0));
    };

    const handleAutoSync = async () => {
        setIsSyncing(true);
        try {
            const result = await syncAllFunds();
            loadFunds();
            let msg = `Sync Complete!\n\nUpdated: ${result.updated}\nSkipped: ${result.skipped}`;
            if (result.errors.length > 0) {
                msg += `\nErrors: ${result.errors.length}`;
            }
            Alert.alert('Cloud Sync', msg);
            if (result.updated > 0) {
                setShowUpdateModal(false);
            }
        } catch (error) {
            Alert.alert('Sync Failed', 'Could not connect to the cloud service.');
        } finally {
            setIsSyncing(false);
        }
    };

    const getRiskIcon = (risk?: string) => {
        switch (risk) {
            case 'LOW': return <ShieldCheck size={20} color="#10B981" />;
            case 'MEDIUM': return <Shield size={20} color="#F59E0B" />;
            case 'HIGH': return <ShieldAlert size={20} color="#EF4444" />;
            default: return <Shield size={20} color={themeColors.textSecondary} />;
        }
    };

    const getRiskLabel = (risk?: string) => {
        switch (risk) {
            case 'LOW': return 'Low Risk';
            case 'MEDIUM': return 'Medium Risk';
            case 'HIGH': return 'High Risk';
            default: return 'Not Set';
        }
    };

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <Text style={[styles.title, { color: themeColors.text }]}>Mutual Funds</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: accentColor }]}
                        onPress={() => navigation.navigate('AddAccount', { initialType: 'MUTUAL_FUND' })}
                    >
                        <Plus color="white" size={20} />
                        <Text style={styles.addBtnText}>New Fund</Text>
                    </TouchableOpacity>
                </View>
            </View>


            {(() => {
                const totalPrincipal = funds.reduce((sum, f) => sum + (f.principalAmount || 0), 0);
                const totalProfit = totalInvestment - totalPrincipal;
                const isProfit = totalProfit >= 0;

                const lowRisk = funds.filter(f => f.riskLevel === 'LOW').reduce((sum, f) => sum + f.balance, 0);
                const medRisk = funds.filter(f => f.riskLevel === 'MEDIUM').reduce((sum, f) => sum + f.balance, 0);
                const highRisk = funds.filter(f => f.riskLevel === 'HIGH').reduce((sum, f) => sum + f.balance, 0);

                const lowPercent = totalInvestment > 0 ? (lowRisk / totalInvestment) * 100 : 0;
                const medPercent = totalInvestment > 0 ? (medRisk / totalInvestment) * 100 : 0;
                const highPercent = totalInvestment > 0 ? (highRisk / totalInvestment) * 100 : 0;

                // Calculate Daily P/L for all funds
                const totalDailyPL = funds.reduce((sum, f) => {
                    const history = getNAVHistory(f.id);
                    const dailyChange = history.length > 1 ? (f.currentNAV || 0) - history[history.length - 2].nav : 0;
                    return sum + (dailyChange * (f.unitsOwned || 0));
                }, 0);
                const isDailyProfit = totalDailyPL >= 0;

                return (
                    <View style={{ gap: 20 }}>
                        <View style={[styles.totalCard, { backgroundColor: isProfit ? '#10B981' : '#EF4444' }]}>
                            <View style={styles.centerArrow}>
                                {isProfit ? <TrendingUp color="rgba(255,255,255,0.15)" size={140} /> : <TrendingDown color="rgba(255,255,255,0.15)" size={140} />}
                            </View>

                            <View style={styles.totalHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.totalLabel}>Portfolio Value</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                                        <Text style={styles.totalValue}>{currency} {totalInvestment.toLocaleString()}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 'bold' }}>
                                            {isDailyProfit ? '↑' : '↓'} {currency} {Math.abs(totalDailyPL).toLocaleString()}
                                        </Text>
                                        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginLeft: 4 }}>Today's Change</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.totalFooter}>
                                <View style={styles.footerItem}>
                                    <Text style={styles.footerLabel}>Invested</Text>
                                    <Text style={styles.footerValue}>{currency} {totalPrincipal.toLocaleString()}</Text>
                                </View>
                                <View style={styles.footerItem}>
                                    <Text style={styles.footerLabel}>P/L</Text>
                                    <Text style={styles.footerValue}>{isProfit ? '+' : ''}{totalProfit.toLocaleString()}</Text>
                                </View>
                                <View style={styles.footerItem}>
                                    <Text style={styles.footerLabel}>ROI</Text>
                                    <Text style={styles.footerValue}>{totalPrincipal > 0 ? ((totalProfit / totalPrincipal) * 100).toFixed(1) : 0}%</Text>
                                </View>
                                <View style={styles.footerItem}>
                                    <Text style={styles.footerLabel}>CGT (15%)</Text>
                                    <Text style={styles.footerValue}>{currency} {(isProfit ? totalProfit * 0.15 : 0).toLocaleString()}</Text>
                                </View>
                            </View>

                            {/* Risk Allocation Bars */}
                            <View style={styles.allocationSection}>
                                <Text style={styles.allocationTitle}>Risk Allocation</Text>
                                <View style={styles.allocationBar}>
                                    {lowPercent > 0 ? <View style={{ width: `${lowPercent}%`, height: '100%', backgroundColor: '#fff', opacity: 0.9, borderRadius: 2 }} /> : null}
                                    {medPercent > 0 ? <View style={{ width: `${medPercent}%`, height: '100%', backgroundColor: '#fff', opacity: 0.6, borderRadius: 2 }} /> : null}
                                    {highPercent > 0 ? <View style={{ width: `${highPercent}%`, height: '100%', backgroundColor: '#fff', opacity: 0.3, borderRadius: 2 }} /> : null}
                                </View>
                                <View style={styles.allocationLabels}>
                                    <Text style={styles.allocLabel}>Low {lowPercent.toFixed(0)}%</Text>
                                    <Text style={styles.allocLabel}>Med {medPercent.toFixed(0)}%</Text>
                                    <Text style={styles.allocLabel}>High {highPercent.toFixed(0)}%</Text>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.compareBar, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                            onPress={() => navigation.navigate('CompareFunds')}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={[styles.compareIconBox, { backgroundColor: accentColor + '20' }]}>
                                    <BarChart2 color={accentColor} size={20} />
                                </View>
                                <View>
                                    <Text style={[styles.compareTitle, { color: themeColors.text }]}>Compare Funds</Text>
                                    <Text style={[styles.compareSubtitle, { color: themeColors.textSecondary }]}>Analyze performance across 300+ funds</Text>
                                </View>
                            </View>
                            <ChevronRight color={themeColors.textSecondary} size={20} />
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                style={[styles.globalUpdateBtn, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                                onPress={() => setShowUpdateModal(true)}
                            >
                                <TrendingUp color={accentColor} size={20} />
                                <Text style={[styles.globalUpdateText, { color: themeColors.text }]}>Update NAVs</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.globalUpdateBtn, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                                onPress={() => navigation.navigate('MutualFundReport')}
                            >
                                <BarChart2 color="#8B5CF6" size={20} />
                                <Text style={[styles.globalUpdateText, { color: themeColors.text }]}>View Report</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            })()}

            <Text style={[styles.sectionTitle, { color: themeColors.text, marginTop: 30 }]}>My Portfolio</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {funds.length > 0 ? (
                    funds.map(fund => (
                        <TouchableOpacity
                            key={fund.id}
                            style={[styles.fundCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                            onPress={() => navigation.navigate('FundDetail', { fundId: fund.id })}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                {(() => {
                                    const iconSource = getAMCIconSource(fund.amcName);
                                    return iconSource ? (
                                        <Image
                                            source={iconSource}
                                            style={{ width: 44, height: 44, borderRadius: 10, marginRight: 12 }}
                                        />
                                    ) : (
                                        <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: themeColors.background, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                                            <TrendingUp size={24} color={accentColor} />
                                        </View>
                                    );
                                })()}
                                <View style={styles.fundInfo}>
                                    <View style={[styles.riskBadge, { backgroundColor: fund.riskLevel === 'LOW' ? '#10B98115' : fund.riskLevel === 'MEDIUM' ? '#F59E0B15' : '#EF444415' }]}>
                                        <Text style={{ color: fund.riskLevel === 'LOW' ? '#10B981' : fund.riskLevel === 'MEDIUM' ? '#F59E0B' : '#EF4444', fontSize: 8, fontWeight: '900' }}>
                                            {fund.riskLevel}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={[styles.fundName, { color: themeColors.text }]} numberOfLines={1}>
                                            {fund.fundCode || getInitials(fund.name)}
                                        </Text>
                                        {(() => {
                                            let typeLabel = fund.fundType === 'VPS' ? 'VPS' : 'MF';
                                            let typeColor = fund.fundType === 'VPS' ? '#8B5CF6' : '#10B981';

                                            if (fund.fundType === 'ETF' || fund.name.toUpperCase().includes('ETF') || fund.name.toUpperCase().includes('EXCHANGE TRADED FUND')) {
                                                typeLabel = 'ETF';
                                                typeColor = '#3B82F6';
                                            }

                                            return (
                                                <View style={{ backgroundColor: typeColor + '20', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                                    <Text style={{ fontSize: 8, color: typeColor, fontWeight: 'bold' }}>{typeLabel}</Text>
                                                </View>
                                            );
                                        })()}
                                        {fund.isShariahCompliant === 1 ? (
                                            <ShariahIcon size={14} color="#10B981" />
                                        ) : null}
                                    </View>
                                    <Text style={[styles.fundSubText, { color: themeColors.textSecondary }]}>
                                        Invested: {currency} {fund.principalAmount?.toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.fundAmount}>
                                {(() => {
                                    const history = getNAVHistory(fund.id);
                                    const dailyChange = history.length > 1 ? (fund.currentNAV || 0) - history[history.length - 2].nav : 0;
                                    const dailyProfit = dailyChange * (fund.unitsOwned || 0);
                                    const isDailyPL = dailyProfit >= 0;

                                    return (
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={[styles.amountText, { color: themeColors.text }]}>{currency} {fund.balance.toLocaleString()}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <Text style={{ fontSize: 11, fontWeight: '700', color: isDailyPL ? '#10B981' : '#EF4444' }}>
                                                    {isDailyPL ? '+' : '-'} {Math.abs(dailyProfit).toLocaleString()}
                                                </Text>
                                                <Text style={{ fontSize: 9, color: themeColors.textSecondary }}>Today</Text>
                                            </View>
                                        </View>
                                    );
                                })()}
                                <ChevronRight size={18} color={themeColors.textSecondary} />
                            </View>
                        </TouchableOpacity>
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Shield size={60} color={themeColors.border} />
                        <Text style={{ color: themeColors.textSecondary, marginTop: 20 }}>No mutual funds added yet.</Text>
                    </View>
                )}
            </ScrollView>
            {/* Global NAV Update Modal */}
            <Modal visible={showUpdateModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Update Fund NAV</Text>
                            <TouchableOpacity onPress={() => setShowUpdateModal(false)}>
                                <X color={themeColors.text} size={24} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.syncNowBtn, { backgroundColor: accentColor + '15', borderColor: accentColor }]}
                            onPress={handleAutoSync}
                            disabled={isSyncing}
                        >
                            {isSyncing ? (
                                <RefreshCw size={20} color={accentColor} style={{ marginRight: 8 }} />
                            ) : (
                                <CloudDownload size={20} color={accentColor} style={{ marginRight: 8 }} />
                            )}
                            <Text style={[styles.syncNowText, { color: accentColor }]}>
                                {isSyncing ? 'Syncing...' : 'Sync Now'}
                            </Text>
                        </TouchableOpacity>

                        <Text style={[styles.dividerText, { color: themeColors.textSecondary }]}>— OR MANUAL UPDATE —</Text>

                        <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Select Fund</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fundSelector}>
                            {funds.map(f => (
                                <TouchableOpacity
                                    key={f.id}
                                    style={[styles.fundOption, { borderColor: selectedFundId === f.id ? accentColor : themeColors.border, backgroundColor: selectedFundId === f.id ? accentColor + '10' : 'transparent' }]}
                                    onPress={() => {
                                        setSelectedFundId(f.id);
                                        setUpdateValue(f.currentNAV?.toString() || '');
                                    }}
                                >
                                    <Text style={[styles.fundOptionText, { color: selectedFundId === f.id ? accentColor : themeColors.text }]}>{f.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {selectedFundId ? (
                            <View style={{ marginTop: 20 }}>
                                <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Current NAV</Text>
                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={[styles.modalInput, { color: themeColors.text, borderColor: themeColors.border }]}
                                        keyboardType="numeric"
                                        value={updateValue}
                                        onChangeText={setUpdateValue}
                                        placeholder="0.0000"
                                        placeholderTextColor={themeColors.textSecondary}
                                        autoFocus
                                    />
                                    <TouchableOpacity
                                        style={[styles.modalSaveBtn, { backgroundColor: accentColor }]}
                                        onPress={() => {
                                            updateNAV(selectedFundId, parseFloat(updateValue));
                                            setShowUpdateModal(false);
                                            loadFunds();
                                            Alert.alert('Updated', 'NAV has been updated successfully.');
                                        }}
                                    >
                                        <Save color="white" size={20} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : null}
                    </View>
                </View>
            </Modal>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 24, fontWeight: '900' },
    addBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 6 },
    settingsIconBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    addBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },
    totalCard: { padding: 24, borderRadius: 24, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
    totalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    totalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', marginBottom: 4 },
    totalValue: { color: 'white', fontSize: 32, fontWeight: '900' },
    centerArrow: { position: 'absolute', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    allocationSection: { marginTop: 24 },
    allocationTitle: { color: 'white', fontSize: 10, fontWeight: '800', opacity: 0.8, marginBottom: 8, textTransform: 'uppercase' },
    allocationBar: { height: 6, flexDirection: 'row', gap: 2, marginBottom: 6 },
    allocationLabels: { flexDirection: 'row', justifyContent: 'space-between' },
    allocLabel: { color: 'white', fontSize: 9, fontWeight: '700', opacity: 0.9 },
    totalFooter: { flexDirection: 'row', marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', justifyContent: 'space-between' },
    footerItem: {},
    footerLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '600', marginBottom: 2 },
    footerValue: { color: 'white', fontSize: 11, fontWeight: '800' },
    globalUpdateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 16, borderWidth: 1, gap: 8 },
    globalUpdateText: { fontSize: 14, fontWeight: '700' },
    sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
    fundCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
    fundInfo: { flex: 1, gap: 4 },
    fundSubText: { fontSize: 11, fontWeight: '500' },
    riskBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    fundName: { fontSize: 16, fontWeight: '800' },
    fundAmount: { alignItems: 'center', flexDirection: 'row', gap: 10 },
    amountText: { fontSize: 16, fontWeight: '900' },
    emptyState: { alignItems: 'center', marginTop: 100, opacity: 0.5 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { padding: 24, borderTopLeftRadius: 32, borderTopRightRadius: 32, minHeight: 400 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: '800' },
    inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 12 },
    fundSelector: { flexDirection: 'row', marginBottom: 20 },
    fundOption: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginRight: 10, height: 44 },
    fundOptionText: { fontSize: 13, fontWeight: '700' },
    inputRow: { flexDirection: 'row', gap: 12 },
    modalInput: { flex: 1, height: 56, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, fontSize: 18, fontWeight: 'bold' },
    modalSaveBtn: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    syncNowBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 20,
    },
    syncNowText: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    dividerText: {
        textAlign: 'center',
        fontSize: 10,
        fontWeight: '700',
        marginBottom: 15,
        opacity: 0.6
    },
    compareBar: {
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    compareIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center'
    },
    compareTitle: {
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 2
    },
    compareSubtitle: {
        fontSize: 11,
        fontWeight: '500'
    }
});

export default MutualFundsScreen;
