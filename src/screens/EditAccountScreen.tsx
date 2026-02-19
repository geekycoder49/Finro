import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Image, Dimensions, ActivityIndicator, Modal, Platform } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';
import { useTheme } from '../hooks/useTheme';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { X, Check, Landmark, Wallet, User, Trash2, Camera, Search, ChevronRight, ArrowLeft, TrendingUp, Calendar } from 'lucide-react-native';
import { updateAccount, deleteAccount, Account } from '../db/database';
import * as ImagePicker from 'expo-image-picker';
import { getBankIcon } from '../utils/accountIcons';
import { FUNDS_DATA, FundDetails } from '../constants/fundsData';
import { getAMCIconSource } from '../utils/amcIcons';
import { fetchFundMatches, NAVData } from '../services/navSync';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import ShariahIcon from '../components/ShariahIcon';

const screenWidth = Dimensions.get('window').width;

const PAK_BANKS = [
    'HBL', 'UBL', 'MCB', 'Allied Bank', 'Meezan Bank', 'Bank Alfalah',
    'SCB', 'Askari Bank', 'Other Bank'
];

const ONLINE_WALLETS = [
    'Easypaisa', 'JazzCash', 'SadaPay', 'NayaPay', 'Other Wallet'
];

const EditAccountScreen = ({ navigation, route }: any) => {
    const { currency, theme, accentColor } = useSettingsStore();
    const { themeColors } = useTheme();
    const account: Account = route.params.account;

    const [type, setType] = useState<'BANK' | 'CASH' | 'PERSON' | 'WALLET' | 'MUTUAL_FUND'>(account.type);
    const [accountName, setAccountName] = useState(account.name);
    const [balance, setBalance] = useState(account.balance.toLocaleString());
    const [peopleType, setPeopleType] = useState<'RECEIVABLE' | 'PAYABLE'>(account.peopleType || 'RECEIVABLE');
    const [iconUri, setIconUri] = useState(account.iconUri);

    // Mutual Fund specific state
    const [amcName, setAmcName] = useState(account.amcName || '');
    const [fundCode, setFundCode] = useState(account.fundCode || '');
    const [unitsOwned, setUnitsOwned] = useState(account.unitsOwned?.toString() || '');
    const [currentNAV, setCurrentNAV] = useState(account.currentNAV?.toString() || '');
    const [riskLevel, setRiskLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH'>(account.riskLevel as any || 'LOW');
    const [isShariah, setIsShariah] = useState(account.isShariahCompliant || 0);
    const [fundType, setFundType] = useState<'MUTUAL_FUND' | 'VPS' | 'ETF'>(account.fundType || 'MUTUAL_FUND');
    const [investmentDate, setInvestmentDate] = useState(account.investmentDate ? new Date(account.investmentDate) : new Date());

    // UI flow state for Mutual Funds
    const [fundFlowStep, setFundFlowStep] = useState<'AMC' | 'FUND' | 'DETAILS'>(type === 'MUTUAL_FUND' ? 'DETAILS' : 'DETAILS');
    const [amcSearch, setAmcSearch] = useState('');
    const [fundSearch, setFundSearch] = useState('');
    const [shariahOnly, setShariahOnly] = useState(false);
    const [selectedRiskTab, setSelectedRiskTab] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');
    const [isLoadingNAV, setIsLoadingNAV] = useState(false);
    const [potentialNAVMatches, setPotentialNAVMatches] = useState<NAVData[]>([]);
    const [showNAVSelectionModal, setShowNAVSelectionModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const isStandardBank = (type === 'BANK' || type === 'WALLET') && [...PAK_BANKS, ...ONLINE_WALLETS].includes(accountName);

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
        if (isStandardBank) return;
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

    const handleSave = () => {
        if (!accountName) {
            alert('Please enter account name');
            return;
        }

        const princ = parseFloat(balance.replace(/,/g, '')) || 0;
        const nav = parseFloat(currentNAV.replace(/,/g, '')) || 0;
        const units = parseFloat(unitsOwned.replace(/,/g, '')) || 0;

        const numBalance = type === 'MUTUAL_FUND' ? (units * nav || princ) : princ;
        const finalUnits = type === 'MUTUAL_FUND' ? (units || (nav > 0 ? princ / nav : 0)) : 0;

        updateAccount(
            account.id,
            accountName,
            type,
            numBalance,
            account.currency,
            type === 'PERSON' ? peopleType : undefined,
            (type === 'BANK' || type === 'WALLET') && isStandardBank ? undefined : iconUri,
            type === 'MUTUAL_FUND' ? riskLevel : undefined,
            finalUnits,
            nav,
            type === 'MUTUAL_FUND' ? princ : 0,
            type === 'MUTUAL_FUND' ? investmentDate.toISOString().split('T')[0] : undefined,
            account.lockedProfit,
            type === 'MUTUAL_FUND' ? isShariah : 0,
            type === 'MUTUAL_FUND' ? fundType : undefined,
            type === 'MUTUAL_FUND' ? amcName : undefined,
            type === 'MUTUAL_FUND' ? fundCode : undefined
        );
        navigation.goBack();
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Account",
            "Are you sure? This will hide the account from your dashboard.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete", style: "destructive", onPress: () => {
                        deleteAccount(account.id);
                        navigation.goBack();
                    }
                }
            ]
        );
    };

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
                        setAccountName(autoSelectedMatch.fund); // Use real market name
                        setCurrentNAV(nav.toString());
                        const u = parseFloat(unitsOwned.replace(/,/g, '')) || 0;
                        const b = parseFloat(balance.replace(/,/g, '')) || 0;
                        if (u > 0) {
                            setBalance(formatWithCommas((u * nav).toString()));
                        } else if (b > 0) {
                            setUnitsOwned((b / nav).toFixed(4));
                        }
                    } else if (matches.length > 1) {
                        setPotentialNAVMatches(matches);
                        setShowNAVSelectionModal(true);
                    } else if (matches.length === 1) {
                        const nav = matches[0].nav;
                        setAccountName(matches[0].fund); // Use real market name
                        setCurrentNAV(nav.toString());
                        const u = parseFloat(unitsOwned.replace(/,/g, '')) || 0;
                        const b = parseFloat(balance.replace(/,/g, '')) || 0;
                        if (u > 0) {
                            setBalance(formatWithCommas((u * nav).toString()));
                        } else if (b > 0) {
                            setUnitsOwned((b / nav).toFixed(4));
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
                        <TouchableOpacity onPress={() => setFundFlowStep('DETAILS')}>
                            <ArrowLeft color={themeColors.text} size={28} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Select AMC</Text>
                        <View style={{ width: 28 }} />
                    </View>

                    <View style={[styles.searchBar, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                        <Search size={20} color={themeColors.textSecondary} />
                        <TextInput
                            style={[styles.searchInput, { color: themeColors.text }]}
                            placeholder="Search asset managers..."
                            placeholderTextColor={themeColors.textSecondary}
                            value={amcSearch}
                            onChangeText={setAmcSearch}
                        />
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {Object.keys(FUNDS_DATA).filter(amc => amc.toLowerCase().includes(amcSearch.toLowerCase())).map(amc => {
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
                                        {icon ? <Image source={icon} style={styles.amcIcon} /> : <Landmark size={24} color={themeColors.textSecondary} />}
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
                        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Select Fund</Text>
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

                    <ScrollView showsVerticalScrollIndicator={false}>
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

    // Default Edit Details Screen
    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <X color={themeColors.text} size={28} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: themeColors.text }]}>Edit Account</Text>
                <TouchableOpacity onPress={handleSave}>
                    <Check color={accentColor} size={28} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 30 }}>
                    <View style={{ alignItems: 'center' }}>
                        <TouchableOpacity
                            style={[styles.iconLarge, { backgroundColor: themeColors.surface, borderColor: accentColor }]}
                            onPress={pickImage}
                            disabled={isStandardBank}
                        >
                            {isStandardBank ? (
                                getBankIcon(accountName, type, undefined, accentColor, themeColors, 60)
                            ) : (
                                type === 'MUTUAL_FUND' ? (
                                    <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                                        {amcName ? <Image source={getAMCIconSource(amcName)} style={styles.selectedImage} /> : <TrendingUp color={accentColor} size={40} />}
                                    </View>
                                ) : (
                                    iconUri ? (
                                        <Image source={{ uri: iconUri }} style={styles.selectedImage} />
                                    ) : (
                                        <View style={{ alignItems: 'center' }}>
                                            <Camera color={accentColor} size={32} />
                                            <Text style={{ color: accentColor, fontSize: 10, marginTop: 4 }}>Add Icon</Text>
                                        </View>
                                    )
                                )
                            )}
                        </TouchableOpacity>
                        {!isStandardBank && iconUri ? (
                            <TouchableOpacity onPress={() => setIconUri(undefined)} style={{ marginTop: 6 }}>
                                <Text style={{ color: '#EF4444', fontSize: 10 }}>Remove</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { color: themeColors.textSecondary, marginBottom: 4 }]}>
                            {type === 'MUTUAL_FUND' ? 'Selected Fund' : 'Account Name'}
                        </Text>
                        <TextInput
                            style={[styles.input, { color: themeColors.text, borderBottomColor: themeColors.border, fontSize: 16, fontWeight: '700' }]}
                            placeholder="Account name"
                            placeholderTextColor={themeColors.textSecondary}
                            value={accountName}
                            onChangeText={setAccountName}
                        />
                    </View>
                </View>

                {type === 'MUTUAL_FUND' ? (
                    <View style={{ marginBottom: 24 }}>
                        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Asset Management Company</Text>
                        <TouchableOpacity
                            style={[styles.dateCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                            onPress={() => setFundFlowStep('AMC')}
                        >
                            <Text style={{ color: themeColors.text, fontSize: 16, fontWeight: '600' }}>{amcName || 'Select AMC'}</Text>
                            <ChevronRight size={20} color={themeColors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                ) : null}

                <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: themeColors.textSecondary }]}>{type === 'MUTUAL_FUND' ? 'Principal Investment' : 'Current Balance'}</Text>
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
                                        if (u > 0 && n > 0) setBalance(formatWithCommas((u * n).toString()));
                                        else if (b > 0 && n > 0) setUnitsOwned((b / n).toFixed(4));
                                    })}
                                />
                            </View>
                        </View>

                        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Investment Date</Text>
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
                                    <Text style={{ color: themeColors.textSecondary, fontSize: 12 }}>Tap to change</Text>
                                </View>
                            </View>
                        </TouchableOpacity>

                        {showDatePicker ? (
                            <DateTimePicker
                                value={investmentDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event, selectedDate) => {
                                    setShowDatePicker(false);
                                    if (selectedDate) setInvestmentDate(selectedDate);
                                }}
                            />
                        ) : null}

                        <Text style={{ color: '#10B981', fontWeight: 'bold', textAlign: 'right', marginBottom: 20 }}>
                            Total Value: {currency} {((parseFloat(unitsOwned.replace(/,/g, '')) * parseFloat(currentNAV.replace(/,/g, ''))) || parseFloat(balance.replace(/,/g, '')) || 0).toLocaleString()}
                        </Text>
                    </>
                ) : null}

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

                <TouchableOpacity
                    style={[styles.deleteButton, { borderColor: '#EF4444', backgroundColor: themeColors.surface }]}
                    onPress={handleDelete}
                >
                    <Trash2 color="#EF4444" size={20} />
                    <Text style={[styles.deleteText, { color: '#EF4444' }]}>Delete Account</Text>
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
                                <Text style={{ fontSize: 12, color: themeColors.textSecondary }}>Choose the correct fund variant:</Text>
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
                                        if (u > 0) setBalance(formatWithCommas((u * match.nav).toString()));
                                        else if (b > 0) setUnitsOwned((b / match.nav).toFixed(4));
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
        gap: 8,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    tabText: { fontSize: 14, fontWeight: '600' },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginTop: 20,
        gap: 10
    },
    deleteText: { fontWeight: 'bold', fontSize: 16 },
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
    }
});

export default EditAccountScreen;
