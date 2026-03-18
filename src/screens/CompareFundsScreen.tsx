import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Dimensions, Alert, Image, NativeSyntheticEvent, NativeScrollEvent, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTheme } from '../hooks/useTheme';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { ArrowLeft, Search, ChevronUp, ChevronDown, ShieldCheck, ChevronRight, X, Filter } from 'lucide-react-native';
import { syncFundReturns, fetchLatestNAVs } from '../services/navSync';
import ShariahIcon from '../components/ShariahIcon';
import { getAMCIconSource, AMC_ICON_MAP } from '../utils/amcIcons';
import { FUNDS_DATA, FundDetails } from '../constants/fundsData';

const { width } = Dimensions.get('window');

interface FundReturn {
    fund: string;
    category: string;
    nav: number;
    returns: {
        '1d'?: number;
        '15d'?: number;
        '30d'?: number;
        '90d'?: number;
        '180d'?: number;
        '270d'?: number;
        '365d'?: number;
        '3y'?: number;
        [key: string]: number | undefined;
    };
    amc?: string;
    isShariah?: boolean;
    risk?: 'LOW' | 'MEDIUM' | 'HIGH';
    fundType?: 'MUTUAL_FUND' | 'VPS' | 'ETF';
}

const Dropdown = ({ label, options, selectedValue, onSelect, themeColors, accentColor }: any) => {
    const [visible, setVisible] = useState(false);

    return (
        <View style={{ flex: 1 }}>
            <TouchableOpacity
                style={[styles.dropdownTrigger, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                onPress={() => setVisible(true)}
            >
                <Text style={{ fontSize: 11, fontWeight: '700', color: themeColors.textSecondary, marginBottom: 2 }}>{label}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: themeColors.text }} numberOfLines={1}>
                        {selectedValue === 'ALL' ? 'All' : (selectedValue.length > 12 ? selectedValue.substring(0, 10) + '...' : selectedValue)}
                    </Text>
                    <ChevronDown size={14} color={themeColors.textSecondary} />
                </View>
            </TouchableOpacity>

            <Modal visible={visible} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setVisible(false)} activeOpacity={1}>
                    <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Select {label}</Text>
                            <TouchableOpacity onPress={() => setVisible(false)}>
                                <X size={24} color={themeColors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 400 }}>
                            {options.map((opt: string) => (
                                <TouchableOpacity
                                    key={opt}
                                    style={[styles.optionItem, { borderBottomColor: themeColors.border }]}
                                    onPress={() => {
                                        onSelect(opt);
                                        setVisible(false);
                                    }}
                                >
                                    <Text style={[styles.optionText, { color: opt === selectedValue ? accentColor : themeColors.text }]}>{opt}</Text>
                                    {opt === selectedValue && <ShieldCheck size={20} color={accentColor} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const CompareFundsScreen = () => {
    const navigation = useNavigation();
    const { accentColor } = useSettingsStore();
    const { themeColors } = useTheme();

    const [allFunds, setAllFunds] = useState<FundReturn[]>([]);
    const [filteredFunds, setFilteredFunds] = useState<FundReturn[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Filters
    const [selectedAMC, setSelectedAMC] = useState('ALL');
    const [selectedCompliance, setSelectedCompliance] = useState('ALL'); // Conventional, Shariah
    const [selectedRisk, setSelectedRisk] = useState('ALL'); // LOW, MEDIUM, HIGH

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                // Fetch both Return data and NAV data to merge them
                const [returnsData, navsData] = await Promise.all([
                    syncFundReturns(),
                    fetchLatestNAVs()
                ]);

                if (returnsData && Array.isArray(returnsData)) {
                    // Track occurrences to handle duplicate fund names properly
                    const navOccurrences = new Map<string, number>();

                    const enriched = returnsData.map((f: any) => {
                        const fundName = f.fund;
                        const fundNameLower = fundName.toLowerCase();

                        // Handle duplicate occurrences to fetch correct NAV category sequentially
                        const occurrences = navOccurrences.get(fundNameLower) || 0;
                        navOccurrences.set(fundNameLower, occurrences + 1);

                        // Normalize API name: remove punctuation, spaces, and common noise
                        const normalizedApiName = fundNameLower.replace(/[^a-z0-9]/g, '');

                        // Find corresponding NAV and Category from NAV API sequentially
                        const matchingNavs = navsData.filter(n => n.fund.toLowerCase() === fundNameLower);
                        const navMatch = matchingNavs[occurrences] || matchingNavs[0];

                        // Try to find in our static FUNDS_DATA first for high accuracy
                        let staticMatch: FundDetails | undefined;
                        let matchedAMC = 'Other';

                        for (const [amc, funds] of Object.entries(FUNDS_DATA)) {
                            // First try to find all matching funds by name
                            const nameMatches = (funds as FundDetails[]).filter(fd => {
                                const fdNameLower = fd.name.toLowerCase();
                                const normalizedStaticName = fdNameLower.replace(/[^a-z0-9]/g, '');

                                if (normalizedStaticName === normalizedApiName) return true;

                                const isMatch = normalizedApiName.includes(normalizedStaticName) || normalizedStaticName.includes(normalizedApiName);
                                if (isMatch) {
                                    if (fd.type) return true; // We will disambiguate by category below

                                    const variants = ['debt', 'equity', 'money market', 'cash'];
                                    for (const v of variants) {
                                        const apiHasV = fundNameLower.includes(v);
                                        const staticHasV = fdNameLower.includes(v);
                                        if (apiHasV !== staticHasV) return false;
                                    }
                                    return true;
                                }
                                return false;
                            });

                            if (nameMatches.length > 0) {
                                // If multiple matches, disambiguate by category/type from API
                                if (nameMatches.length > 1 && navMatch && navMatch.category) {
                                    const bestMatch = nameMatches.find(match =>
                                        match.type && navMatch.category.toLowerCase().includes(match.type.toLowerCase())
                                    );
                                    if (bestMatch) {
                                        staticMatch = bestMatch;
                                    } else {
                                        staticMatch = nameMatches[0];
                                    }
                                } else {
                                    staticMatch = nameMatches[0];
                                }
                                matchedAMC = amc;
                                break;
                            }
                        }

                        // Heuristic Fallback & Ownership Fixes
                        let amc = matchedAMC;
                        if (amc === 'Other') {
                            const name = fundNameLower;
                            if (name.includes('al-ameen') || name.includes('al ameen')) {
                                amc = 'UBL Fund Managers Limited';
                            } else if (name.includes('alhamra') || name.includes('al-hamra')) {
                                amc = 'MCB Investment Management Limited';
                            } else if (name.includes('nafa ')) {
                                amc = 'NBP Fund Management Limited';
                            } else if (name.includes('meezan') || name.includes('al meezan')) {
                                amc = 'Al Meezan Investment Management Limited';
                            } else if (name.startsWith('ubl')) {
                                amc = 'UBL Fund Managers Limited';
                            } else if (name.startsWith('mcb')) {
                                amc = 'MCB Investment Management Limited';
                            } else if (name.startsWith('hbl')) {
                                amc = 'HBL Asset Management Limited';
                            } else if (name.startsWith('nbp')) {
                                amc = 'NBP Fund Management Limited';
                            } else if (name.startsWith('abl')) {
                                amc = 'ABL Asset Management Company Limited';
                            } else if (name.startsWith('alfalah')) {
                                amc = 'Alfalah Asset Management Limited';
                            } else if (name.startsWith('faysal')) {
                                amc = 'Faysal Asset Management Limited';
                            } else if (name.startsWith('js')) {
                                amc = 'JS Investments Limited';
                            } else if (name.startsWith('askari')) {
                                amc = 'Pak Oman Asset Management Company Limited';
                            } else if (name.startsWith('lakson')) {
                                amc = 'Lakson Investments Limited';
                            } else if (name.startsWith('atlas')) {
                                amc = 'Atlas Asset Management Limited';
                            } else {
                                // Fallback heuristic for other AMCs via brand name
                                for (const key in AMC_ICON_MAP) {
                                    const brandName = key.split(' ')[0].replace(/Limited|Management|Asset|Fund/g, '').trim();
                                    if (brandName.length > 2 && name.includes(brandName.toLowerCase())) {
                                        amc = key;
                                        break;
                                    }
                                }
                            }
                        }

                        // Use static data if available, otherwise heuristics
                        let risk = staticMatch ? staticMatch.risk : 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH';
                        if (!staticMatch) {
                            if (fundNameLower.includes('cash') || fundNameLower.includes('money market') || fundNameLower.includes('income')) risk = 'LOW';
                            if (fundNameLower.includes('equity') || fundNameLower.includes('stock') || fundNameLower.includes('index')) risk = 'HIGH';
                        }

                        let fundType = staticMatch ? staticMatch.category : 'MUTUAL_FUND' as 'MUTUAL_FUND' | 'VPS' | 'ETF';
                        if (!staticMatch) {
                            // Heuristics for Pension Fund (VPS)
                            if (fundNameLower.includes('vps') || fundNameLower.includes('pension') || fundNameLower.includes('retirement')) {
                                fundType = 'VPS';
                            } else if (fundNameLower.includes('etf')) {
                                fundType = 'ETF';
                            }
                        }

                        let isShariah = staticMatch ? staticMatch.isShariah : (fundNameLower.includes('islamic') || fundNameLower.includes('shariah') || fundNameLower.includes('al-ameen') || fundNameLower.includes('al ameen') || fundNameLower.includes('alhamra') || fundNameLower.includes('meezan'));

                        // Extract descriptive sub-type label (e.g., Debt, Money Market)
                        let subTypeLabel = 'Mutual Fund';
                        if (staticMatch && staticMatch.type) {
                            subTypeLabel = staticMatch.type;
                        } else if (navMatch && navMatch.category) {
                            subTypeLabel = navMatch.category.replace('VPS-', '').replace('Shariah Compliant ', '').replace('Pension-', '');
                        } else {
                            // Improved Heuristic for label if not found
                            if (fundNameLower.includes('money market')) subTypeLabel = 'Money Market';
                            else if (fundNameLower.includes('debt')) subTypeLabel = 'Debt';
                            else if (fundNameLower.includes('equity')) subTypeLabel = 'Equity';
                            else if (fundNameLower.includes('cash')) subTypeLabel = 'Cash';
                            else if (fundNameLower.includes('sovereign')) subTypeLabel = 'Sovereign';
                            else if (fundNameLower.includes('dividend')) subTypeLabel = 'Dividend';
                            else subTypeLabel = navMatch ? navMatch.category : 'Mutual Fund';
                        }

                        // Final check: if it's a Pension Fund, ensure subTypeLabel isn't just "Mutual Fund"
                        if (fundType === 'VPS' && (subTypeLabel === 'Mutual Fund' || subTypeLabel === 'Unknown')) {
                            subTypeLabel = 'Retirement';
                        }

                        return {
                            ...f,
                            nav: navMatch ? navMatch.nav : 0,
                            category: subTypeLabel,
                            amc,
                            isShariah,
                            risk,
                            fundType
                        } as FundReturn;
                    });

                    // Sort by name initially
                    enriched.sort((a, b) => a.fund.localeCompare(b.fund));

                    setAllFunds(enriched);
                    setFilteredFunds(enriched);
                }
            } catch (error) {
                console.error('Failed to load fund returns:', error);
                Alert.alert('Error', 'Failed to fetch latest performance data.');
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const amcOptions = useMemo(() => {
        const amcs = new Set<string>();
        allFunds.forEach(f => { if (f.amc) amcs.add(f.amc); });
        return ['ALL', ...Array.from(amcs).sort()];
    }, [allFunds]);

    useEffect(() => {
        let result = allFunds.filter(f => {
            const matchesSearch = f.fund.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesAMC = selectedAMC === 'ALL' || f.amc === selectedAMC;
            const matchesCompliance = selectedCompliance === 'ALL' ||
                (selectedCompliance === 'Shariah' && f.isShariah) ||
                (selectedCompliance === 'Conventional' && !f.isShariah);
            const matchesRisk = selectedRisk === 'ALL' || f.risk === selectedRisk;

            return matchesSearch && matchesAMC && matchesCompliance && matchesRisk;
        });
        setFilteredFunds(result);
    }, [searchQuery, selectedAMC, selectedCompliance, selectedRisk, allFunds]);

    const renderReturn = (label: string, val: number | undefined) => {
        if (val === undefined || val === null) return null;
        const color = val >= 0 ? '#10B981' : '#EF4444';
        return (
            <View style={styles.metricBox}>
                <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>{label}</Text>
                <Text style={[styles.metricValue, { color }]}>{val.toFixed(2)}%</Text>
            </View>
        );
    };

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft color={themeColors.text} size={28} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: themeColors.text }]}>Compare Funds</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Filters */}
            <View style={styles.filtersSection}>
                <Dropdown
                    label="AMC"
                    options={amcOptions}
                    selectedValue={selectedAMC}
                    onSelect={setSelectedAMC}
                    themeColors={themeColors}
                    accentColor={accentColor}
                />
                <View style={{ width: 10 }} />
                <Dropdown
                    label="Compliance"
                    options={['ALL', 'Conventional', 'Shariah']}
                    selectedValue={selectedCompliance}
                    onSelect={setSelectedCompliance}
                    themeColors={themeColors}
                    accentColor={accentColor}
                />
                <View style={{ width: 10 }} />
                <Dropdown
                    label="Risk"
                    options={['ALL', 'LOW', 'MEDIUM', 'HIGH']}
                    selectedValue={selectedRisk}
                    onSelect={setSelectedRisk}
                    themeColors={themeColors}
                    accentColor={accentColor}
                />
            </View>

            {/* Search */}
            <View style={[styles.searchBar, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                <Search size={18} color={themeColors.textSecondary} />
                <TextInput
                    placeholder="Search for fund name..."
                    placeholderTextColor={themeColors.textSecondary}
                    style={[styles.searchInput, { color: themeColors.text }]}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {isLoading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color={accentColor} />
                    <Text style={{ color: themeColors.textSecondary, marginTop: 10 }}>Fetching latest performance metrics...</Text>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: themeColors.textSecondary, marginBottom: 15, marginLeft: 4 }}>
                        SHOWING {filteredFunds.length} FUNDS
                    </Text>
                    {filteredFunds.map((fund, idx) => (
                        <View key={idx} style={[styles.fundCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                            {/* Card Header */}
                            <View style={styles.cardHeader}>
                                <View style={[styles.amcLogoContainer, { backgroundColor: themeColors.background }]}>
                                    <Image
                                        source={getAMCIconSource(fund.amc)}
                                        style={styles.amcLogo}
                                        resizeMode="contain"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <Text style={[styles.fundNameText, { color: themeColors.text }]}>{fund.fund}</Text>
                                        {fund.isShariah && <ShariahIcon size={14} color="#10B981" />}
                                    </View>

                                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                                        <View style={[styles.tag, { backgroundColor: '#3B82F620' }]}>
                                            <Text style={[styles.tagText, { color: '#3B82F6' }]}>
                                                {fund.fundType === 'MUTUAL_FUND' ? 'Mutual Fund' : (fund.fundType === 'VPS' ? 'Pension Fund' : 'ETF')}
                                            </Text>
                                        </View>
                                        <View style={[styles.tag, { backgroundColor: fund.risk === 'LOW' ? '#10B98120' : (fund.risk === 'HIGH' ? '#EF444420' : '#F59E0B20') }]}>
                                            <Text style={[styles.tagText, { color: fund.risk === 'LOW' ? '#10B981' : (fund.risk === 'HIGH' ? '#EF4444' : '#F59E0B') }]}>
                                                {fund.risk} RISK
                                            </Text>
                                        </View>
                                        <View style={[styles.tag, { backgroundColor: themeColors.border }]}>
                                            <Text style={[styles.tagText, { color: themeColors.textSecondary, fontSize: 8 }]}>{fund.category}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

                            {/* Performance Grid */}
                            <Text style={[styles.sectionLabel, { color: themeColors.textSecondary }]}>PERFORMANCE DATA (NAV: {fund.nav})</Text>
                            <View style={styles.performanceGrid}>
                                {renderReturn('1D', fund.returns['1d'])}
                                {renderReturn('15D', fund.returns['15d'])}
                                {renderReturn('30D', fund.returns['30d'])}
                                {renderReturn('90D', fund.returns['90d'])}
                                {renderReturn('180D', fund.returns['180d'])}
                                {renderReturn('270D', fund.returns['270d'])}
                                {renderReturn('1Y', fund.returns['365d'])}
                                {renderReturn('3Y CAGR', fund.returns['3y'])}
                            </View>
                        </View>
                    ))}
                </ScrollView>
            )}
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    backBtn: { padding: 4 },
    title: { fontSize: 24, fontWeight: '900' },
    filtersSection: { flexDirection: 'row', marginBottom: 15 },
    dropdownTrigger: {
        flex: 1,
        padding: 10,
        borderRadius: 14,
        borderWidth: 1,
        justifyContent: 'center'
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 52,
        borderRadius: 16,
        borderWidth: 1,
        gap: 10,
        marginBottom: 20
    },
    searchInput: { flex: 1, fontSize: 16, fontWeight: '600' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    fundCard: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
    },
    cardHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    amcLogoContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)'
    },
    amcLogo: { width: '80%', height: '80%' },
    fundNameText: { fontSize: 15, fontWeight: '800', lineHeight: 20 },
    tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    tagText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    divider: { height: 1, marginVertical: 16 },
    sectionLabel: { fontSize: 10, fontWeight: '800', marginBottom: 12, letterSpacing: 0.5 },
    performanceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    metricBox: { width: '31%', marginBottom: 4 },
    metricLabel: { fontSize: 9, fontWeight: '700', marginBottom: 2 },
    metricValue: { fontSize: 13, fontWeight: '800' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { borderRadius: 24, padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800' },
    optionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
    optionText: { fontSize: 16, fontWeight: '700' }
});

export default CompareFundsScreen;
