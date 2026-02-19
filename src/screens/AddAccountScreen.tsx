import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image, Platform, Modal, Dimensions, ActivityIndicator } from 'react-native';

const screenWidth = Dimensions.get('window').width;
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../hooks/useTheme';
import { X, Check, Landmark, Wallet, User, Camera, TrendingUp, Calendar, Search, ChevronRight, ArrowLeft } from 'lucide-react-native';
import { addAccount, addTransaction } from '../db/database';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { FUNDS_DATA, FundDetails } from '../constants/fundsData';
import { getBankIcon } from '../utils/accountIcons';
import { getAMCIconSource } from '../utils/amcIcons';
import { fetchFundMatches, NAVData } from '../services/navSync';
import { getNAVForDate } from '../services/navHistoryService';
import { MobileWalletIcon } from '../components/MobileWalletIcon';
import ShariahIcon from '../components/ShariahIcon';

const PAK_BANKS = [
    'HBL', 'UBL', 'MCB', 'Allied Bank', 'Meezan Bank', 'Bank Alfalah',
    'SCB', 'Askari Bank', 'Other Bank'
];

const ONLINE_WALLETS = [
    'Easypaisa', 'JazzCash', 'SadaPay', 'NayaPay', 'Other Wallet'
];

const AddAccountScreen = ({ navigation, route }: any) => {
    const { currency, theme, accentColor } = useSettingsStore();
    const { themeColors } = useTheme();

    const initialType = route.params?.initialType;

    const [step, setStep] = useState(initialType ? 2 : 1);
    const [type, setType] = useState<'BANK' | 'CASH' | 'PERSON' | 'WALLET' | 'MUTUAL_FUND'>(initialType || 'BANK');
    const [bankName, setBankName] = useState('');
    const [accountName, setAccountName] = useState('');
    const [balance, setBalance] = useState('');
    const [peopleType, setPeopleType] = useState<'RECEIVABLE' | 'PAYABLE'>('RECEIVABLE');
    const [riskLevel, setRiskLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');
    const [iconUri, setIconUri] = useState<string | undefined>(undefined);
    const [unitsOwned, setUnitsOwned] = useState('');
    const [currentNAV, setCurrentNAV] = useState('');
    const [investmentDate, setInvestmentDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [lockedProfit, setLockedProfit] = useState('0');
    const [isShariah, setIsShariah] = useState(0);
    const [fundType, setFundType] = useState<'MUTUAL_FUND' | 'VPS' | 'ETF'>('MUTUAL_FUND');
    const [amcName, setAmcName] = useState('');
    const [amcSearch, setAmcSearch] = useState('');
    const [fundSearch, setFundSearch] = useState('');
    const [fundCode, setFundCode] = useState('');
    const [isLoadingNAV, setIsLoadingNAV] = useState(false);
    const [potentialNAVMatches, setPotentialNAVMatches] = useState<NAVData[]>([]);
    const [showNAVSelectionModal, setShowNAVSelectionModal] = useState(false);
    const [fundFlowStep, setFundFlowStep] = useState<'AMC' | 'FUND' | 'DETAILS'>('AMC');
    const [shariahOnly, setShariahOnly] = useState(false);
    const [selectedRiskTab, setSelectedRiskTab] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');
    const [historicalNAVFound, setHistoricalNAVFound] = useState(false);
    const [marketNAV, setMarketNAV] = useState('');

    const formatWithCommas = (val: string) => {
        const clean = val.replace(/,/g, '');
        if (!clean) return '';
        const parts = clean.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    };

    const handleAmountChange = (val: string, setter: (v: string) => void) => {
        const clean = val.replace(/,/g, '');
        if (clean === '' || /^\d*\.?\d*$/.test(clean)) {
            setter(formatWithCommas(clean));
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setIconUri(result.assets[0].uri);
        }
    };

    const handleNext = (selectedType: 'BANK' | 'CASH' | 'PERSON' | 'WALLET' | 'MUTUAL_FUND', name?: string) => {
        setType(selectedType);
        if (name) setBankName(name);
        setStep(2);
        if (selectedType === 'MUTUAL_FUND') {
            setFundFlowStep('AMC');
        }
    };

    const handleSave = () => {
        if (!accountName && !bankName) {
            alert('Please enter account name');
            return;
        }

        const finalName = (type === 'BANK' || type === 'WALLET')
            ? (bankName && bankName !== 'Other Bank' && bankName !== 'Other Wallet' ? bankName : accountName)
            : accountName;

        const princ = parseFloat(balance.replace(/,/g, '')) || 0;
        const profit = parseFloat(lockedProfit.replace(/,/g, '')) || 0;
        const nav = parseFloat(currentNAV.replace(/,/g, '')) || 0;
        const units = parseFloat(unitsOwned.replace(/,/g, '')) || 0;

        const numBalance = type === 'MUTUAL_FUND' ? (units * (parseFloat(marketNAV) || nav)) : princ;
        const finalPrincipal = type === 'MUTUAL_FUND' ? princ : 0;
        const finalLockedProfit = type === 'MUTUAL_FUND' ? profit : 0;
        const finalUnits = type === 'MUTUAL_FUND' ? (units || (nav > 0 ? (princ + profit) / nav : 0)) : 0;

        const accountId = addAccount(
            finalName,
            type,
            type === 'MUTUAL_FUND' ? 0 : numBalance,
            currency,
            type === 'PERSON' ? peopleType : undefined,
            iconUri,
            type === 'MUTUAL_FUND' ? riskLevel : undefined,
            type === 'MUTUAL_FUND' ? 0 : finalUnits,
            parseFloat(marketNAV) || nav,
            finalPrincipal,
            type === 'MUTUAL_FUND' ? investmentDate.toISOString().split('T')[0] : undefined,
            finalLockedProfit,
            type === 'MUTUAL_FUND' ? isShariah : 0,
            type === 'MUTUAL_FUND' ? fundType : undefined,
            type === 'MUTUAL_FUND' ? amcName : undefined,
            type === 'MUTUAL_FUND' ? fundCode : undefined
        );

        // Record Initial Investment Transaction for Mutual Funds
        if (type === 'MUTUAL_FUND' && princ > 0) {
            addTransaction(
                princ,
                'INCOME',
                'Initial Investment',
                accountId,
                undefined,
                `Setup initial investment in ${finalName}`,
                investmentDate.toISOString(),
                undefined,
                0,
                0,
                nav // Buy Price (Historical NAV)
            );
        }

        navigation.goBack();
    };

    if (step === 1) {
        return (
            <ScreenWrapper>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <X color={themeColors.text} size={28} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: themeColors.text }]}>Choose Account Type</Text>
                    <View style={{ width: 28 }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={[styles.sectionTitle, { color: themeColors.text, marginTop: 20 }]}>Banks</Text>
                    <View style={styles.grid}>
                        {PAK_BANKS.map(bank => (
                            <TouchableOpacity
                                key={bank}
                                style={[styles.bankChip, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                                onPress={() => handleNext('BANK', bank)}
                            >
                                <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
                                    {getBankIcon(bank, 'BANK', undefined, accentColor, themeColors, 24)}
                                </View>
                                <Text style={[styles.bankText, { color: themeColors.text }]} numberOfLines={1}>{bank}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={[styles.sectionTitle, { color: themeColors.text, marginTop: 30 }]}>Online Wallets</Text>
                    <View style={styles.grid}>
                        {ONLINE_WALLETS.map(wallet => (
                            <TouchableOpacity
                                key={wallet}
                                style={[styles.bankChip, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                                onPress={() => handleNext('WALLET', wallet)}
                            >
                                <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
                                    {getBankIcon(wallet, 'WALLET', undefined, accentColor, themeColors, 24)}
                                </View>
                                <Text style={[styles.bankText, { color: themeColors.text }]} numberOfLines={1}>{wallet}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={[styles.sectionTitle, { color: themeColors.text, marginTop: 30 }]}>Others</Text>
                    <View style={styles.row}>
                        <TouchableOpacity
                            style={[styles.typeCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                            onPress={() => handleNext('CASH')}
                        >
                            <Wallet size={32} color={accentColor} />
                            <Text style={[styles.typeText, { color: themeColors.text }]}>Cash</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.typeCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                            onPress={() => handleNext('PERSON')}
                        >
                            <User size={32} color={accentColor} />
                            <Text style={[styles.typeText, { color: themeColors.text }]}>Person</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.typeCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                            onPress={() => handleNext('MUTUAL_FUND')}
                        >
                            <TrendingUp size={32} color="#10B981" />
                            <Text style={[styles.typeText, { color: themeColors.text }]}>Investment</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{ height: 20 }} />
                </ScrollView>
            </ScreenWrapper>
        );
    }

    const renderFundItem = (item: FundDetails, index: number) => {
        const riskColor = item.risk === 'LOW' ? '#10B981' : item.risk === 'MEDIUM' ? '#F59E0B' : '#EF4444';

        return (
            <TouchableOpacity
                key={`${item.name}-${index}`}
                style={[styles.fundItem, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                onPress={async () => {
                    setAccountName(item.name);
                    setRiskLevel(item.risk);
                    setIsShariah(item.isShariah ? 1 : 0);
                    setFundType(item.category);
                    setFundFlowStep('DETAILS');

                    setIsLoadingNAV(true);
                    const matches = await fetchFundMatches(item.name);

                    let autoSelectedMatch = null;
                    if (matches.length > 1 && item.type) {
                        // Priority search in the official 'category' field
                        autoSelectedMatch = matches.find(m =>
                            m.category && m.category.toLowerCase().includes(item.type!.toLowerCase())
                        );

                        // Fallback to name if category match fails (legacy support)
                        if (!autoSelectedMatch) {
                            autoSelectedMatch = matches.find(m =>
                                m.fund.toLowerCase().includes(item.type!.toLowerCase())
                            );
                        }
                    }

                    if (autoSelectedMatch) {
                        const nav = autoSelectedMatch.nav;
                        setMarketNAV(nav.toString());
                        setAccountName(autoSelectedMatch.fund); // Use real market name

                        // Check if we need historical NAV for the already selected date
                        if (investmentDate.toDateString() !== new Date().toDateString()) {
                            const hist = await getNAVForDate(autoSelectedMatch.fund, investmentDate.toISOString());
                            if (hist) {
                                setCurrentNAV(hist.nav.toString());
                                setHistoricalNAVFound(true);
                                const b = parseFloat(balance.replace(/,/g, '')) || 0;
                                if (b > 0) setUnitsOwned((b / hist.nav).toFixed(4));
                            } else {
                                setCurrentNAV(nav.toString());
                            }
                        } else {
                            setCurrentNAV(nav.toString());
                            const b = parseFloat(balance.replace(/,/g, '')) || 0;
                            if (b > 0) setUnitsOwned((b / nav).toFixed(4));
                        }
                    } else if (matches.length > 1) {
                        setPotentialNAVMatches(matches);
                        setShowNAVSelectionModal(true);
                    } else if (matches.length === 1) {
                        const nav = matches[0].nav;
                        setMarketNAV(nav.toString());
                        setAccountName(matches[0].fund); // Use real market name

                        // Check if we need historical NAV for the already selected date
                        if (investmentDate.toDateString() !== new Date().toDateString()) {
                            const hist = await getNAVForDate(matches[0].fund, investmentDate.toISOString());
                            if (hist) {
                                setCurrentNAV(hist.nav.toString());
                                setHistoricalNAVFound(true);
                                const b = parseFloat(balance.replace(/,/g, '')) || 0;
                                if (b > 0) setUnitsOwned((b / hist.nav).toFixed(4));
                            } else {
                                setCurrentNAV(nav.toString());
                            }
                        } else {
                            setCurrentNAV(nav.toString());
                            const u = parseFloat(unitsOwned.replace(/,/g, '')) || 0;
                            const b = parseFloat(balance.replace(/,/g, '')) || 0;
                            if (u > 0) {
                                setBalance(formatWithCommas((u * nav).toString()));
                            } else if (b > 0) {
                                setUnitsOwned((b / nav).toFixed(4));
                            }
                        }
                    } else {
                        setCurrentNAV('0');
                    }
                    setIsLoadingNAV(false);
                }}
            >
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.fundName, { color: themeColors.text }]} numberOfLines={2}>{item.name}</Text>
                        {item.isShariah ? (
                            <ShariahIcon size={18} color="#10B981" />
                        ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <View style={[styles.riskTag, { backgroundColor: riskColor + '20' }]}>
                            <Text style={[styles.riskTagText, { color: riskColor }]}>{item.risk}</Text>
                        </View>
                        <Text style={{ fontSize: 11, color: themeColors.textSecondary }}>{item.category === 'VPS' ? 'Pension Fund' : (item.category === 'ETF' ? 'ETF' : 'Mutual Fund')}</Text>
                    </View>
                </View>
                <ChevronRight size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
        );
    };

    if (type === 'MUTUAL_FUND') {
        const amcIcon = getAMCIconSource(amcName);
        const filteredFunds = amcName ? (FUNDS_DATA[amcName] || []).filter(f => {
            const matchesRisk = f.risk === selectedRiskTab;
            const matchesShariah = !shariahOnly || f.isShariah;
            const matchesSearch = f.name.toLowerCase().includes(fundSearch.toLowerCase());
            return matchesRisk && matchesShariah && matchesSearch;
        }) : [];

        if (fundFlowStep === 'AMC') {
            return (
                <ScreenWrapper>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => initialType ? navigation.goBack() : setStep(1)}>
                            <ArrowLeft color={themeColors.text} size={28} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Select AMC</Text>
                        <View style={{ width: 28 }} />
                    </View>

                    <View style={[styles.searchBar, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                        <Search size={20} color={themeColors.textSecondary} />
                        <TextInput
                            style={[styles.searchInput, { color: themeColors.text }]}
                            placeholder="Search Asset Management Companies..."
                            placeholderTextColor={themeColors.textSecondary}
                            value={amcSearch}
                            onChangeText={setAmcSearch}
                        />
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                        {Object.keys(FUNDS_DATA)
                            .filter(amc => amc.toLowerCase().includes(amcSearch.toLowerCase()))
                            .map(amc => {
                                const icon = getAMCIconSource(amc);
                                return (
                                    <TouchableOpacity
                                        key={amc}
                                        style={[styles.amcItem, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                                        onPress={() => {
                                            setAmcName(amc);
                                            setFundFlowStep('FUND');
                                        }}
                                    >
                                        <View style={styles.amcIconContainer}>
                                            {icon ? (
                                                <Image source={icon} style={{ width: 34, height: 34 }} resizeMode="contain" />
                                            ) : (
                                                <Landmark size={24} color={themeColors.textSecondary} />
                                            )}
                                        </View>
                                        <Text style={[styles.amcNameText, { color: themeColors.text }]}>{amc}</Text>
                                        <ChevronRight size={20} color={themeColors.textSecondary} />
                                    </TouchableOpacity>
                                );
                            })}
                    </ScrollView>
                </ScreenWrapper>
            );
        }

        if (fundFlowStep === 'FUND') {
            return (
                <ScreenWrapper>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => setFundFlowStep('AMC')}>
                            <ArrowLeft color={themeColors.text} size={28} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>Select Fund</Text>
                        <View style={{ width: 28 }} />
                    </View>

                    <View style={styles.amcHeaderInfo}>
                        <View style={styles.amcHeaderIconBox}>
                            {amcIcon ? <Image source={amcIcon} style={styles.amcHeaderIcon} /> : <Landmark size={20} color={themeColors.textSecondary} />}
                        </View>
                        <Text style={[styles.amcHeaderText, { color: themeColors.text }]}>{amcName}</Text>
                    </View>

                    <View style={[styles.fundSearchBox, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                        <Search size={18} color={themeColors.textSecondary} />
                        <TextInput
                            style={[styles.fundSearchInput, { color: themeColors.text }]}
                            placeholder="Search in this AMC..."
                            placeholderTextColor={themeColors.textSecondary}
                            value={fundSearch}
                            onChangeText={setFundSearch}
                        />
                    </View>

                    <View style={styles.filterSection}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, justifyContent: 'center', minWidth: '100%' }}>
                            {['LOW', 'MEDIUM', 'HIGH'].map((level) => {
                                const count = (FUNDS_DATA[amcName] || []).filter(f => f.risk === level && (!shariahOnly || f.isShariah)).length;
                                const isSelected = selectedRiskTab === level;
                                const color = level === 'LOW' ? '#10B981' : level === 'MEDIUM' ? '#F59E0B' : '#EF4444';

                                return (
                                    <TouchableOpacity
                                        key={level}
                                        onPress={() => setSelectedRiskTab(level as any)}
                                        style={[
                                            styles.riskTab,
                                            { backgroundColor: isSelected ? color : themeColors.surface, borderColor: isSelected ? color : themeColors.border }
                                        ]}
                                    >
                                        <Text style={[styles.riskTabText, { color: isSelected ? 'white' : themeColors.textSecondary }]}>
                                            {level} ({count})
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <TouchableOpacity
                            onPress={() => setShariahOnly(!shariahOnly)}
                            style={[styles.shariahToggle, { backgroundColor: shariahOnly ? '#10B981' : themeColors.surface, borderColor: shariahOnly ? '#10B981' : themeColors.border }]}
                        >
                            <ShariahIcon size={20} color={shariahOnly ? 'white' : themeColors.textSecondary} />
                            <Text style={[styles.shariahToggleText, { color: shariahOnly ? 'white' : themeColors.textSecondary }]}>Shariah Only</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                        {filteredFunds.length > 0 ? (
                            filteredFunds.map((f, idx) => renderFundItem(f, idx))
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Search size={48} color={themeColors.border} />
                                <Text style={{ color: themeColors.textSecondary, marginTop: 12 }}>No funds match your filters</Text>
                            </View>
                        )}
                    </ScrollView>
                </ScreenWrapper>
            );
        }
    }

    // Default Flow for non-Mutual Funds OR the Details Step for Mutual Funds
    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => {
                    if (type === 'MUTUAL_FUND') {
                        setFundFlowStep('FUND');
                    } else if (initialType) {
                        navigation.goBack();
                    } else {
                        setStep(1);
                    }
                }}>
                    <ArrowLeft color={themeColors.text} size={28} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: themeColors.text }]}>Account Details</Text>
                <TouchableOpacity onPress={handleSave}>
                    <Check color={accentColor} size={28} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 30 }}>
                    {((type === 'BANK' || type === 'WALLET') && bankName && bankName !== 'Other Bank' && bankName !== 'Other Wallet') ? (
                        <View style={[styles.iconLarge, { backgroundColor: themeColors.surface, borderColor: accentColor }]}>
                            {getBankIcon(bankName, type, undefined, accentColor, themeColors, 60)}
                        </View>
                    ) : (
                        type === 'MUTUAL_FUND' ? (
                            <View style={[styles.iconLarge, { backgroundColor: themeColors.surface, borderColor: accentColor }]}>
                                {amcName ? <Image source={getAMCIconSource(amcName)} style={styles.selectedImage} /> : <TrendingUp color={accentColor} size={40} />}
                            </View>
                        ) : (
                            <View style={{ alignItems: 'center' }}>
                                <TouchableOpacity style={[styles.iconLarge, { backgroundColor: themeColors.surface, borderColor: accentColor }]} onPress={pickImage}>
                                    {iconUri ? (
                                        <Image source={{ uri: iconUri }} style={styles.selectedImage} />
                                    ) : (
                                        <View style={{ alignItems: 'center' }}>
                                            <Camera color={accentColor} size={32} />
                                            <Text style={{ color: accentColor, fontSize: 10, marginTop: 4 }}>Add Icon</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                                {iconUri ? (
                                    <TouchableOpacity onPress={() => setIconUri(undefined)} style={{ marginTop: 6 }}>
                                        <Text style={{ color: '#EF4444', fontSize: 10 }}>Remove</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        )
                    )}

                    <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { color: themeColors.textSecondary, marginBottom: 4 }]}>
                            {type === 'BANK' ? 'Bank Name' : (type === 'WALLET' ? 'Online Wallet Name' : (type === 'MUTUAL_FUND' ? 'Selected Fund' : 'Account Name'))}
                        </Text>
                        {(type === 'MUTUAL_FUND' || (bankName && bankName !== 'Other Bank' && bankName !== 'Other Wallet')) ? (
                            <View style={{ borderBottomWidth: 1, borderBottomColor: themeColors.border, paddingBottom: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={{ fontSize: 16, color: themeColors.text, fontWeight: '700' }}>
                                        {type === 'MUTUAL_FUND' ? (accountName || 'No Fund Selected') : bankName}
                                    </Text>
                                    {type === 'MUTUAL_FUND' && fundType === 'ETF' && (
                                        <View style={{ backgroundColor: '#3B82F620', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                                            <Text style={{ fontSize: 10, color: '#3B82F6', fontWeight: 'bold' }}>ETF</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        ) : (
                            <TextInput
                                style={[styles.input, { color: themeColors.text, borderBottomColor: themeColors.border, fontSize: 18, fontWeight: '700' }]}
                                placeholder={type === 'BANK' ? "Enter Bank Name" : (type === 'WALLET' ? "Enter Online Wallet Name" : "Enter Account Name")}
                                placeholderTextColor={themeColors.textSecondary}
                                value={accountName}
                                onChangeText={setAccountName}
                                autoFocus={step === 2 && !bankName}
                            />
                        )}
                    </View>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: themeColors.textSecondary }]}>{type === 'MUTUAL_FUND' ? 'Total Invested Amount' : 'Opening Balance'}</Text>
                    <View style={styles.amountInputRow}>
                        <Text style={[styles.currencyPrefix, { color: themeColors.text }]}>{currency}</Text>
                        <TextInput
                            style={[styles.amountInput, { color: themeColors.text }]}
                            placeholder="0"
                            placeholderTextColor={themeColors.textSecondary}
                            keyboardType="numeric"
                            value={balance}
                            onChangeText={(text) => handleAmountChange(text, (val) => {
                                setBalance(val);
                                if (type === 'MUTUAL_FUND') {
                                    const b = parseFloat(val.replace(/,/g, '')) || 0;
                                    const n = parseFloat(currentNAV.replace(/,/g, '')) || 0;
                                    if (b > 0 && n > 0) setUnitsOwned((b / n).toFixed(4));
                                }
                            })}
                        />
                    </View>
                </View>

                {type === 'PERSON' ? (
                    <View style={styles.inputContainer}>
                        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Person Type</Text>
                        <View style={[styles.tabs, { backgroundColor: themeColors.surface }]}>
                            <TouchableOpacity
                                onPress={() => setPeopleType('RECEIVABLE')}
                                style={[styles.tab, peopleType === 'RECEIVABLE' ? { backgroundColor: accentColor } : {}]}
                            >
                                <Text style={[styles.tabText, { color: peopleType === 'RECEIVABLE' ? 'white' : themeColors.textSecondary }]}>Receivable</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setPeopleType('PAYABLE')}
                                style={[styles.tab, peopleType === 'PAYABLE' ? { backgroundColor: accentColor } : {}]}
                            >
                                <Text style={[styles.tabText, { color: peopleType === 'PAYABLE' ? 'white' : themeColors.textSecondary }]}>Payable</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : null}

                {type === 'MUTUAL_FUND' ? (
                    <>
                        <View style={{ flexDirection: 'row', gap: 15 }}>
                            <View style={[styles.inputContainer, { flex: 1 }]}>
                                <Text style={[styles.label, { color: themeColors.textSecondary }]}>Units Owned</Text>
                                <TextInput
                                    style={[styles.input, { color: themeColors.text, borderBottomColor: themeColors.border }]}
                                    placeholder="0.00"
                                    placeholderTextColor={themeColors.textSecondary}
                                    keyboardType="numeric"
                                    value={unitsOwned}
                                    onChangeText={(text) => handleAmountChange(text, (val) => {
                                        setUnitsOwned(val);
                                        const u = parseFloat(val.replace(/,/g, '')) || 0;
                                        const n = parseFloat(currentNAV.replace(/,/g, '')) || 0;
                                        if (u > 0 && n > 0) setBalance(formatWithCommas((u * n).toString()));
                                    })}
                                />
                            </View>
                            <View style={[styles.inputContainer, { flex: 1 }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={[styles.label, { color: themeColors.textSecondary }]}>Current NAV</Text>
                                    {isLoadingNAV ? <ActivityIndicator size="small" color={accentColor} /> : null}
                                </View>
                                <TextInput
                                    style={[styles.input, { color: themeColors.text, borderBottomColor: themeColors.border }]}
                                    placeholder="0.00"
                                    placeholderTextColor={themeColors.textSecondary}
                                    keyboardType="numeric"
                                    value={currentNAV}
                                    onChangeText={(text) => handleAmountChange(text, (val) => {
                                        setCurrentNAV(val);
                                        const n = parseFloat(val.replace(/,/g, '')) || 0;
                                        const u = parseFloat(unitsOwned.replace(/,/g, '')) || 0;
                                        const b = parseFloat(balance.replace(/,/g, '')) || 0;

                                        if (u > 0 && n > 0) {
                                            setBalance(formatWithCommas((u * n).toString()));
                                        } else if (b > 0 && n > 0) {
                                            setUnitsOwned((b / n).toFixed(4));
                                        }
                                    })}
                                />
                            </View>
                        </View>

                        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Initial Investment Date</Text>
                        <TouchableOpacity
                            style={[styles.dateCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={[styles.calendarIconBox, { backgroundColor: accentColor + '20' }]}>
                                    <Calendar size={18} color={accentColor} />
                                </View>
                                <View>
                                    <Text style={{ color: themeColors.text, fontSize: 16, fontWeight: '700' }}>{format(investmentDate, 'PPP')}</Text>
                                    <Text style={{ color: themeColors.textSecondary, fontSize: 12 }}>Click to change</Text>
                                </View>
                            </View>
                        </TouchableOpacity>

                        {showDatePicker === true ? (
                            <DateTimePicker
                                value={investmentDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={async (event, selectedDate) => {
                                    setShowDatePicker(false);
                                    if (selectedDate) {
                                        setInvestmentDate(selectedDate);
                                        // Re-fetch NAV for the new date
                                        if (type === 'MUTUAL_FUND' && accountName) {
                                            setIsLoadingNAV(true);
                                            const hist = await getNAVForDate(accountName, selectedDate.toISOString());
                                            if (hist) {
                                                setCurrentNAV(hist.nav.toString());
                                                setHistoricalNAVFound(true);
                                                const b = parseFloat(balance.replace(/,/g, '')) || 0;
                                                if (b > 0) setUnitsOwned((b / hist.nav).toFixed(4));
                                            } else {
                                                setHistoricalNAVFound(false);
                                            }
                                            setIsLoadingNAV(false);
                                        }
                                    }
                                }}
                            />
                        ) : null}

                        {historicalNAVFound === true ? (
                            <View style={[styles.infoCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border, marginBottom: 20 }]}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <View>
                                        <Text style={{ color: themeColors.textSecondary, fontSize: 11 }}>Buy Price ({format(investmentDate, 'MM/yy')})</Text>
                                        <Text style={{ color: themeColors.text, fontWeight: '700' }}>{currentNAV}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={{ color: themeColors.textSecondary, fontSize: 11 }}>Market Price (Today)</Text>
                                        <Text style={{ color: themeColors.text, fontWeight: '700' }}>{marketNAV || '?'}</Text>
                                    </View>
                                </View>
                                <View style={{ height: 1, backgroundColor: themeColors.border, marginBottom: 10 }} />
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View>
                                        <Text style={{ color: themeColors.textSecondary, fontSize: 11 }}>Unrealized Profit</Text>
                                        <Text style={{ color: (parseFloat(marketNAV) >= parseFloat(currentNAV)) ? '#10B981' : '#EF4444', fontWeight: '800', fontSize: 16 }}>
                                            {currency} {((parseFloat(marketNAV) - parseFloat(currentNAV)) * (parseFloat(unitsOwned.replace(/,/g, '')) || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </Text>
                                    </View>
                                    <View style={{ backgroundColor: (parseFloat(marketNAV) >= parseFloat(currentNAV)) ? '#10B98120' : '#EF444420', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                        <Text style={{ color: (parseFloat(marketNAV) >= parseFloat(currentNAV)) ? '#10B981' : '#EF4444', fontWeight: 'bold', fontSize: 12 }}>
                                            {(((parseFloat(marketNAV) - parseFloat(currentNAV)) / parseFloat(currentNAV)) * 100).toFixed(2)}%
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ) : null}

                        <Text style={{ color: '#10B981', fontWeight: 'bold', textAlign: 'right', marginBottom: 10 }}>
                            Current Value: {currency} {((parseFloat(unitsOwned.replace(/,/g, '')) * (parseFloat(marketNAV) || parseFloat(currentNAV.replace(/,/g, '')))) || parseFloat(balance.replace(/,/g, '')) || 0).toLocaleString()}
                        </Text>
                    </>
                ) : null}

                <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: accentColor }]}
                    onPress={handleSave}
                >
                    <Text style={styles.saveBtnText}>Add Account</Text>
                </TouchableOpacity>
                <View style={{ height: 40 }} />
            </ScrollView>

            {/* NAV Selection Modal */}
            <Modal visible={showNAVSelectionModal} animationType="slide" transparent={true}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: themeColors.background, height: '60%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <View>
                                <Text style={{ fontSize: 20, fontWeight: 'bold', color: themeColors.text }}>Specify NAV</Text>
                                <Text style={{ fontSize: 12, color: themeColors.textSecondary }}>Multiple versions found. Please select one:</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowNAVSelectionModal(false)}>
                                <X color={themeColors.text} size={24} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {potentialNAVMatches.map((match, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: themeColors.border }}
                                    onPress={() => {
                                        setAccountName(match.fund);
                                        setCurrentNAV(match.nav.toString());
                                        const u = parseFloat(unitsOwned.replace(/,/g, '')) || 0;
                                        const b = parseFloat(balance.replace(/,/g, '')) || 0;
                                        if (u > 0) {
                                            setBalance(formatWithCommas((u * match.nav).toString()));
                                        } else if (b > 0) {
                                            setUnitsOwned((b / match.nav).toFixed(4));
                                        }
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
            </Modal>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    bankChip: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    bankText: { fontSize: 13, marginLeft: 8, fontWeight: '500', flex: 1 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    typeCard: {
        width: (screenWidth - 50) / 2, // 2 items per row
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        flexDirection: 'row', // horizontal layout for single line
        gap: 12,
    },
    typeText: { fontSize: 14, fontWeight: '700' },
    iconSelectionSection: { alignItems: 'center', marginBottom: 30 },
    iconLarge: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        overflow: 'hidden'
    },
    selectedImage: { width: '100%', height: '100%' },
    inputContainer: { marginBottom: 24 },
    label: { fontSize: 14, marginBottom: 8 },
    input: {
        fontSize: 18,
        borderBottomWidth: 1,
        paddingVertical: 8,
    },
    amountInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderColor: '#ccc',
        paddingBottom: 8,
    },
    currencyPrefix: { fontSize: 24, marginRight: 10, fontWeight: '500' },
    amountInput: {
        fontSize: 32,
        fontWeight: 'bold',
        flex: 1,
    },
    tabs: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    tabText: { fontSize: 14, fontWeight: '600' },
    saveBtn: {
        marginTop: 20,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    dateCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 20,
    },
    calendarIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 50,
        borderRadius: 15,
        borderWidth: 1,
        marginBottom: 20,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
    },
    amcItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
    },
    amcIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
    },
    amcIcon: {
        width: '100%',
        height: '100%',
    },
    amcNameText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
    },
    amcHeaderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },
    amcHeaderIconBox: {
        width: 36,
        height: 36,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    amcHeaderIcon: {
        width: '100%',
        height: '100%',
    },
    amcHeaderText: {
        fontSize: 16,
        fontWeight: '700',
        flex: 1,
    },
    fundSearchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    fundSearchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
    },
    filterSection: {
        marginBottom: 20,
        gap: 12,
    },
    riskTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    riskTabText: {
        fontSize: 12,
        fontWeight: '700',
    },
    shariahToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    shariahToggleText: {
        fontSize: 14,
        fontWeight: '700',
    },
    fundItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 10,
    },
    fundName: {
        fontSize: 15,
        fontWeight: '700',
        flex: 1,
    },
    riskTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    riskTagText: {
        fontSize: 10,
        fontWeight: '900',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    infoCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 20,
    }
});

export default AddAccountScreen;
