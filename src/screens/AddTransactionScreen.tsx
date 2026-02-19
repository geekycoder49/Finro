import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ScrollView, Image, Platform } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../hooks/useTheme';
import { X, Check, Wallet, Landmark, User, Plus, Calendar as CalendarIcon, FileText, Image as ImageIcon, ArrowUpRight, ArrowDownLeft, TrendingUp, ArrowLeftRight } from 'lucide-react-native';
import { getAccounts, addTransaction, Account, updateAccount } from '../db/database';
import { getCategoryIcon } from '../utils/categoryIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { getBankIcon } from '../utils/accountIcons';
import { getNAVForDate } from '../services/navHistoryService';

const EXPENSE_CATEGORIES = [
    'Travel', 'Food & Drink', 'Grocery', 'Medical', 'Other Expenses',
    'Rent Paid', 'Bills & Utilities', 'Mobile', 'Education', 'Personal',
    'Donations / Charity', 'Family', 'Office',
    'Electronics', 'Transport', 'Health & Fitness', 'Gifts',
    'Shopping'
];

const INCOME_CATEGORIES = [
    'Salary', 'Bonus', 'Freelance', 'Allowance', 'Other Income', 'Commission', 'Gifts'
];

const TABS = ['Expense', 'Income', 'Transfer', 'People', 'Investment'];
const INVESTMENT_SUBTABS = ['Invest', 'Redeem', 'Convert'];

const AddTransactionScreen = ({ navigation, route }: any) => {
    const { currency, theme, accentColor } = useSettingsStore();
    const { themeColors } = useTheme();

    const [activeTab, setActiveTab] = useState('Expense');
    const [subTab, setSubTab] = useState('Lend'); // For People: Pay, Receive, Lend, Borrow
    const [investTab, setInvestTab] = useState('Invest'); // For Investment: Invest, Redeem, Convert
    const [amount, setAmount] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedFromAccount, setSelectedFromAccount] = useState<number | null>(null);
    const [selectedToAccount, setSelectedToAccount] = useState<number | null>(null);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [description, setDescription] = useState('');
    const [receiptUri, setReceiptUri] = useState<string | null>(null);
    const [isCGTEnabled, setIsCGTEnabled] = useState(false);
    const [calculatedCGT, setCalculatedCGT] = useState(0);
    const [historicalNAV, setHistoricalNAV] = useState<number | null>(null);
    const [isLoadingHistNAV, setIsLoadingHistNAV] = useState(false);

    useEffect(() => {
        const accs = getAccounts();
        setAccounts(accs);

        const params = route.params || {};
        if (params.mode === 'ATM') {
            setActiveTab('Transfer');
            const bankAcc = accs.find(a => a.type === 'BANK');
            const cashAcc = accs.find(a => a.type === 'CASH');
            if (bankAcc) setSelectedFromAccount(bankAcc.id);
            if (cashAcc) setSelectedToAccount(cashAcc.id);
        } else {
            if (params.initialTab) setActiveTab(params.initialTab);
            if (params.initialInvestTab) setInvestTab(params.initialInvestTab);
            if (params.preselectedFromAccount) setSelectedFromAccount(params.preselectedFromAccount);
            if (params.preselectedToAccount) setSelectedToAccount(params.preselectedToAccount);

            if (accs.length > 0 && selectedFromAccount === null && !params.preselectedFromAccount) {
                setSelectedFromAccount(accs[0].id);
            }
        }
    }, [route.params]);

    const isATMMode = route.params?.mode === 'ATM';

    const formatWithCommas = (value: string) => {
        const cleanValue = value.replace(/[^0-9]/g, '');
        if (!cleanValue) return '';
        return parseInt(cleanValue).toLocaleString('en-US');
    };

    const handleAmountChange = (text: string) => {
        const formatted = formatWithCommas(text);
        setAmount(formatted);
        updateCGT(formatted);
    };

    const updateCGT = (amtStr: string) => {
        if (!isCGTEnabled) {
            setCalculatedCGT(0);
            return;
        }

        const amt = parseFloat(amtStr.replace(/,/g, '')) || 0;
        const fromAcc = accounts.find(a => a.id === selectedFromAccount);

        if (amt > 0 && fromAcc && fromAcc.type === 'MUTUAL_FUND') {
            const redemptionNAV = historicalNAV || fromAcc.currentNAV || 0;
            const unitsOwned = fromAcc.unitsOwned || 0;
            const principal = fromAcc.principalAmount || 0;

            if (redemptionNAV > 0 && unitsOwned > 0) {
                // Calculate units being redeemed at the effective NAV date
                const unitsRedeemed = amt / redemptionNAV;

                // Calculate Average Cost per unit (Principal / Total Units)
                const avgCost = principal / unitsOwned;

                // Profit = (Redemption Price - Avg Cost) * Units Redeemed
                const profit = (redemptionNAV - avgCost) * unitsRedeemed;

                if (profit > 0) {
                    setCalculatedCGT(Math.round(profit * 0.15));
                } else {
                    setCalculatedCGT(0);
                }
            } else {
                setCalculatedCGT(0);
            }
        } else {
            setCalculatedCGT(0);
        }
    };

    useEffect(() => {
        const fromAcc = accounts.find(a => a.id === selectedFromAccount);
        if (fromAcc && fromAcc.fundType === 'VPS') {
            setIsCGTEnabled(false);
        } else if (isCGTEnabled) {
            // Only auto-update if we haven't implemented a formal "manual mode" state yet
            // optimizing to only update when key values change
            updateCGT(amount);
        }
    }, [isCGTEnabled, selectedFromAccount, amount, historicalNAV]);

    // Fetch Historical NAV when date or account changes
    useEffect(() => {
        const fetchHistNAV = async () => {
            const isInvestment = activeTab === 'Investment';
            const targetAccountId = isInvestment
                ? (investTab === 'Invest' ? selectedToAccount : selectedFromAccount)
                : selectedFromAccount;

            const acc = accounts.find(a => a.id === targetAccountId);
            if (acc && acc.type === 'MUTUAL_FUND') {
                setIsLoadingHistNAV(true);
                const hist = await getNAVForDate(acc.name, date.toISOString());
                if (hist) {
                    setHistoricalNAV(hist.nav);
                } else {
                    setHistoricalNAV(acc.currentNAV || null);
                }
                setIsLoadingHistNAV(false);
            } else {
                setHistoricalNAV(null);
            }
        };

        fetchHistNAV();
    }, [date, selectedFromAccount, selectedToAccount, activeTab, investTab, accounts]);

    const handleSave = () => {
        const isPeople = activeTab === 'People';
        const isTransfer = activeTab === 'Transfer';
        const isInvestment = activeTab === 'Investment';

        if (!amount || (!selectedCategory && !isPeople && !isTransfer && !isInvestment) || !selectedFromAccount) {
            alert('Please fill all required fields');
            return;
        }

        const cleanAmount = amount.replace(/,/g, '');
        const numAmount = parseFloat(cleanAmount);
        if (isNaN(numAmount)) return;

        let transactionType = activeTab.toUpperCase();
        let finalCategory = selectedCategory || activeTab;
        let finalFromAccount = selectedFromAccount;
        let finalToAccount = selectedToAccount;

        if (activeTab === 'People') {
            finalCategory = subTab;
            if (subTab === 'Pay' || subTab === 'Lend') {
                if (!selectedFromAccount || !selectedToAccount) {
                    alert('Please select both your account and the person.');
                    return;
                }
            } else if (subTab === 'Receive' || subTab === 'Borrow') {
                if (!selectedFromAccount || !selectedToAccount) {
                    alert('Please select both the person and your account.');
                    return;
                }
                finalFromAccount = selectedFromAccount;
                finalToAccount = selectedToAccount;
            }
        } else if (activeTab === 'Transfer') {
            if (!selectedFromAccount || !selectedToAccount) {
                alert('Please select both source and destination accounts.');
                return;
            }
            const fromAcc = accounts.find(a => a.id === selectedFromAccount);
            const toAcc = accounts.find(a => a.id === selectedToAccount);
            if (fromAcc?.type === 'PERSON' || toAcc?.type === 'PERSON') {
                finalCategory = subTab;
            } else {
                finalCategory = 'Transfer';
            }
        } else if (activeTab === 'Investment') {
            if (!selectedFromAccount || !selectedToAccount) {
                alert('Please fill both from and to accounts.');
                return;
            }

            const fromAcc = accounts.find(a => a.id === selectedFromAccount);
            const toAcc = accounts.find(a => a.id === selectedToAccount);

            if (investTab === 'Convert') {
                if (fromAcc?.fundType !== toAcc?.fundType) {
                    alert(`Cannot convert ${fromAcc?.fundType === 'VPS' ? 'VPS' : 'Mutual Fund'} to ${toAcc?.fundType === 'VPS' ? 'VPS' : 'Mutual Fund'}. Transfers are only allowed between same fund types.`);
                    return;
                }
            }

            if (investTab === 'Invest') {
                transactionType = 'TRANSFER';
                finalCategory = 'Mutual Fund Investment';
            } else if (investTab === 'Redeem') {
                transactionType = 'TRANSFER';
                finalCategory = 'Mutual Fund Redemption';
            } else {
                transactionType = 'TRANSFER';
                finalCategory = 'Mutual Fund Conversion';
            }
        }

        const isMFRedemption = activeTab === 'Investment' && (investTab === 'Redeem' || investTab === 'Convert') && isCGTEnabled && calculatedCGT > 0;
        const mainAmount = isMFRedemption ? numAmount - calculatedCGT : numAmount;

        addTransaction(
            mainAmount,
            transactionType,
            finalCategory,
            finalFromAccount,
            finalToAccount || undefined,
            description,
            date.toISOString(),
            receiptUri || undefined,
            isMFRedemption ? 0 : calculatedCGT, // Store 0 if we split, or the amount if legacy (though we don't use it much now)
            0,
            historicalNAV || undefined
        );

        if (isMFRedemption) {
            // Record separate CGT Transaction — pass the same NAV so units are correctly deducted
            addTransaction(
                calculatedCGT,
                'EXPENSE',
                'CGT Tax',
                finalFromAccount,
                undefined,
                `CGT Tax withheld from ${finalCategory} of ${amount}`,
                date.toISOString(),
                undefined,
                0,
                1, // isSystem = 1
                historicalNAV || undefined  // ← use redemption NAV so correct units are cut
            );
        }

        navigation.goBack();
    };

    const pickReceipt = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            setReceiptUri(result.assets[0].uri);
        }
    };

    const renderAccountGridItem = (acc: Account, isSelected: boolean, onSelect: () => void) => (
        <TouchableOpacity
            key={acc.id}
            onPress={onSelect}
            style={[
                styles.accountGridItem,
                { backgroundColor: isSelected ? accentColor : themeColors.surface, borderColor: themeColors.border },
                isSelected ? { borderColor: 'transparent' } : {}
            ]}
        >
            <View style={[styles.accIconBox, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : themeColors.background }]}>
                {getBankIcon(acc.name, acc.type, acc.iconUri, isSelected ? 'white' : accentColor, themeColors, 14)}
            </View>
            <Text style={[styles.accountGridName, { color: isSelected ? 'white' : themeColors.text }]}>{acc.name}</Text>
        </TouchableOpacity>
    );

    const isPersonFlow = activeTab === 'People' || (activeTab === 'Transfer' && (accounts.find(a => a.id === selectedFromAccount)?.type === 'PERSON' || accounts.find(a => a.id === selectedToAccount)?.type === 'PERSON'));

    return (
        <ScreenWrapper>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <X color={themeColors.text} size={28} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: themeColors.text }]}>Add Transaction</Text>
                    <View style={{ width: 28 }} />
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabsContainer}
                    style={[styles.tabs, { backgroundColor: themeColors.surface }]}
                >
                    {TABS.map(tab => {
                        const mfCount = accounts.filter(a => a.type === 'MUTUAL_FUND').length;
                        const isInvestmentDisabled = tab === 'Investment' && mfCount === 0;

                        return (
                            <TouchableOpacity
                                key={tab}
                                onPress={() => {
                                    if (!isInvestmentDisabled) {
                                        setActiveTab(tab);
                                        setSelectedCategory('');
                                    }
                                }}
                                style={[
                                    styles.tab,
                                    activeTab === tab ? { backgroundColor: accentColor } : {},
                                    isInvestmentDisabled ? { opacity: 0.5 } : {}
                                ]}
                                disabled={isInvestmentDisabled}
                            >
                                <Text style={[styles.tabText, { color: activeTab === tab ? 'white' : themeColors.textSecondary }]}>{tab}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: themeColors.textSecondary }]}>Amount</Text>
                    <View style={styles.amountInputRow}>
                        <Text style={[styles.currencyPrefix, { color: themeColors.text }]}>{currency}</Text>
                        <TextInput
                            style={[styles.amountInput, { color: themeColors.text }]}
                            placeholder="0"
                            placeholderTextColor={themeColors.textSecondary}
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={handleAmountChange}
                        />
                    </View>
                </View>

                {(activeTab === 'Expense' || activeTab === 'Income') ? (
                    <View style={styles.section}>
                        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Category</Text>
                        <View style={styles.categoriesGrid}>
                            {(activeTab === 'Expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                                <TouchableOpacity
                                    key={cat}
                                    onPress={() => setSelectedCategory(cat)}
                                    style={[
                                        styles.accountGridItem,
                                        { backgroundColor: selectedCategory === cat ? accentColor : themeColors.surface, borderColor: themeColors.border },
                                        selectedCategory === cat ? { borderColor: 'transparent' } : {}
                                    ]}
                                >
                                    <View style={[styles.accIconBox, { backgroundColor: selectedCategory === cat ? 'rgba(255,255,255,0.2)' : themeColors.background }]}>
                                        {getCategoryIcon(cat, 14, selectedCategory === cat ? 'white' : accentColor)}
                                    </View>
                                    <Text style={[styles.accountGridName, { color: selectedCategory === cat ? 'white' : themeColors.text }]}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ) : null}

                {activeTab === 'Investment' ? (
                    <View style={styles.section}>
                        <View style={[styles.categoriesGrid, { marginBottom: 20 }]}>
                            {INVESTMENT_SUBTABS.map(tab => {
                                const mfCount = accounts.filter(a => a.type === 'MUTUAL_FUND').length;
                                const isConvertDisabled = tab === 'Convert' && mfCount < 2;

                                return (
                                    <TouchableOpacity
                                        key={tab}
                                        onPress={() => !isConvertDisabled && setInvestTab(tab)}
                                        style={[
                                            styles.accountGridItem,
                                            { backgroundColor: investTab === tab ? accentColor : themeColors.surface, borderColor: themeColors.border },
                                            investTab === tab ? { borderColor: 'transparent' } : {},
                                            isConvertDisabled ? { opacity: 0.5 } : {}
                                        ]}
                                        disabled={isConvertDisabled}
                                    >
                                        <View style={[styles.accIconBox, { backgroundColor: investTab === tab ? 'rgba(255,255,255,0.2)' : themeColors.background }]}>
                                            {tab === 'Invest' ? <ArrowUpRight size={14} color={investTab === tab ? 'white' : accentColor} /> :
                                                tab === 'Redeem' ? <ArrowDownLeft size={14} color={investTab === tab ? 'white' : accentColor} /> :
                                                    <ArrowLeftRight size={14} color={investTab === tab ? 'white' : accentColor} />}
                                        </View>
                                        <Text style={[styles.accountGridName, { color: investTab === tab ? 'white' : themeColors.text }]}>{tab}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Invest View: Select Fund first, then Pay From */}
                        {investTab === 'Invest' ? (
                            <>
                                <Text style={[styles.label, { color: themeColors.textSecondary }]}>Invest Into Fund</Text>
                                <View style={styles.categoriesGrid}>
                                    {accounts.filter(a => a.type === 'MUTUAL_FUND').map(acc => renderAccountGridItem(acc, selectedToAccount === acc.id, () => setSelectedToAccount(acc.id)))}
                                </View>
                                <Text style={[styles.label, { color: themeColors.textSecondary, marginTop: 16 }]}>Pay From</Text>
                                <View style={styles.categoriesGrid}>
                                    {accounts.filter(a => a.type !== 'MUTUAL_FUND').map(acc => renderAccountGridItem(acc, selectedFromAccount === acc.id, () => setSelectedFromAccount(acc.id)))}
                                </View>
                            </>
                        ) : null}

                        {/* Redeem View: FROM Mutual Fund TO Bank */}
                        {investTab === 'Redeem' ? (
                            <>
                                <Text style={[styles.label, { color: themeColors.textSecondary }]}>Redeem From Fund</Text>
                                <View style={styles.categoriesGrid}>
                                    {accounts.filter(a => a.type === 'MUTUAL_FUND').map(acc => renderAccountGridItem(acc, selectedFromAccount === acc.id, () => setSelectedFromAccount(acc.id)))}
                                </View>
                                <Text style={[styles.label, { color: themeColors.textSecondary, marginTop: 16 }]}>Into Account</Text>
                                <View style={styles.categoriesGrid}>
                                    {accounts.filter(a => a.type !== 'MUTUAL_FUND').map(acc => renderAccountGridItem(acc, selectedToAccount === acc.id, () => setSelectedToAccount(acc.id)))}
                                </View>
                            </>
                        ) : null}

                        {/* Convert View: FROM Mutual Fund TO Mutual Fund */}
                        {investTab === 'Convert' ? (
                            <>
                                <Text style={[styles.label, { color: themeColors.textSecondary }]}>From Fund</Text>
                                <View style={styles.categoriesGrid}>
                                    {accounts.filter(a => a.type === 'MUTUAL_FUND').map(acc => renderAccountGridItem(acc, selectedFromAccount === acc.id, () => {
                                        setSelectedFromAccount(acc.id);
                                        if (selectedToAccount === acc.id) setSelectedToAccount(null);
                                    }))}
                                </View>
                                <Text style={[styles.label, { color: themeColors.textSecondary, marginTop: 16 }]}>To Fund</Text>
                                <View style={styles.categoriesGrid}>
                                    {accounts.filter(a => a.type === 'MUTUAL_FUND' && a.id !== selectedFromAccount && a.fundType === accounts.find(f => f.id === selectedFromAccount)?.fundType).map(acc => renderAccountGridItem(acc, selectedToAccount === acc.id, () => setSelectedToAccount(acc.id)))}
                                </View>
                            </>
                        ) : null}

                        {/* CGT Toggle for Mutual Fund Redemptions - Hidden for VPS */}
                        {(investTab === 'Redeem' || investTab === 'Convert') &&
                            accounts.find(a => a.id === selectedFromAccount)?.type === 'MUTUAL_FUND' &&
                            accounts.find(a => a.id === selectedFromAccount)?.fundType !== 'VPS' ? (
                            <View style={[styles.cgtSection, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View>
                                        <Text style={{ color: themeColors.text, fontWeight: 'bold' }}>Deduct CGT Tax (15%)</Text>
                                        <Text style={{ color: themeColors.textSecondary, fontSize: 11 }}>Calculated on profit portion of redemption</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setIsCGTEnabled(!isCGTEnabled)}
                                        style={[styles.toggleBase, { backgroundColor: isCGTEnabled ? '#F59E0B' : themeColors.border }]}
                                    >
                                        <View style={[styles.toggleThumb, { transform: [{ translateX: isCGTEnabled ? 20 : 0 }] }]} />
                                    </TouchableOpacity>
                                </View>

                                {isCGTEnabled ? (
                                    <View style={[styles.cgtSummary, { borderTopColor: themeColors.border }]}>
                                        <View style={styles.cgtRow}>
                                            <Text style={{ color: themeColors.textSecondary, fontSize: 13 }}>Gross Redemption:</Text>
                                            <Text style={{ color: themeColors.text, fontWeight: '700' }}>{currency} {amount || '0'}</Text>
                                        </View>

                                        <View style={{ marginTop: 10 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600' }}>Withheld CGT:</Text>
                                                <TouchableOpacity onPress={() => {
                                                    // Toggle Manual Mode Logic would go here if we tracked it separately
                                                    // For now, allow direct edit which implies manual override
                                                }}>
                                                    <Text style={{ fontSize: 10, color: accentColor }}>Edit Manually</Text>
                                                </TouchableOpacity>
                                            </View>
                                            <TextInput
                                                style={{
                                                    backgroundColor: themeColors.background,
                                                    borderRadius: 8,
                                                    paddingHorizontal: 10,
                                                    paddingVertical: 6,
                                                    color: '#EF4444',
                                                    fontWeight: '700',
                                                    borderWidth: 1,
                                                    borderColor: themeColors.border
                                                }}
                                                value={calculatedCGT.toString()}
                                                onChangeText={(text) => {
                                                    const val = parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
                                                    setCalculatedCGT(val);
                                                }}
                                                keyboardType="numeric"
                                                placeholder="0"
                                                placeholderTextColor={themeColors.textSecondary}
                                            />
                                        </View>

                                        <View style={[styles.cgtRow, { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }]}>
                                            <Text style={{ color: themeColors.text, fontWeight: 'bold' }}>Net to Receive:</Text>
                                            <Text style={{ color: '#10B981', fontWeight: '900', fontSize: 16 }}>{currency} {(parseFloat(amount.replace(/,/g, '')) - calculatedCGT).toLocaleString()}</Text>
                                        </View>
                                    </View>
                                ) : null}
                            </View>
                        ) : null}
                    </View>
                ) : null}
                {/* Account Selection Logic */}
                {(!isPersonFlow && activeTab !== 'Investment') ? (
                    <>
                        <View style={styles.section}>
                            <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                                {activeTab === 'Income' ? 'Receive Into' : 'Pay From'}
                            </Text>
                            <View style={styles.categoriesGrid}>
                                {accounts
                                    .filter(a => {
                                        if (isATMMode && activeTab === 'Transfer') return a.type === 'BANK';
                                        return a.type !== 'PERSON';
                                    })
                                    .map(acc => renderAccountGridItem(acc, selectedFromAccount === acc.id, () => setSelectedFromAccount(acc.id)))}
                                {!isATMMode ? (
                                    <TouchableOpacity
                                        style={[styles.accountGridItem, styles.addAccountBtn, { borderColor: accentColor }]}
                                        onPress={() => navigation.navigate('AddAccount')}
                                    >
                                        <Plus size={14} color={accentColor} />
                                        <Text style={{ color: accentColor, fontSize: 13, fontWeight: '600' }}>Add</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        </View>

                        {activeTab === 'Transfer' ? (
                            <View style={styles.section}>
                                <Text style={[styles.label, { color: themeColors.textSecondary }]}>Pay To</Text>
                                <View style={styles.categoriesGrid}>
                                    {accounts
                                        .filter(acc => {
                                            if (isATMMode && activeTab === 'Transfer') return acc.type === 'CASH';
                                            return acc.id !== selectedFromAccount && acc.type !== 'PERSON';
                                        })
                                        .map(acc => renderAccountGridItem(acc, selectedToAccount === acc.id, () => setSelectedToAccount(acc.id)))}
                                    {!isATMMode ? (
                                        <TouchableOpacity
                                            style={[styles.accountGridItem, styles.addAccountBtn, { borderColor: accentColor }]}
                                            onPress={() => navigation.navigate('AddAccount')}
                                        >
                                            <Plus size={14} color={accentColor} />
                                            <Text style={{ color: accentColor, fontSize: 13, fontWeight: '600' }}>Add</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            </View>
                        ) : null}
                    </>
                ) : isPersonFlow ? (
                    <View style={styles.section}>
                        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Nature of Transaction</Text>
                        <View style={styles.categoriesGrid}>
                            {['Lend', 'Borrow', 'Pay', 'Receive'].map(nature => (
                                <TouchableOpacity
                                    key={nature}
                                    onPress={() => setSubTab(nature)}
                                    style={[
                                        styles.accountGridItem,
                                        { backgroundColor: subTab === nature ? accentColor : themeColors.surface, borderColor: themeColors.border },
                                        subTab === nature ? { borderColor: 'transparent' } : {}
                                    ]}
                                >
                                    <View style={[styles.accIconBox, { backgroundColor: subTab === nature ? 'rgba(255,255,255,0.2)' : themeColors.background }]}>
                                        {['Lend', 'Pay'].includes(nature) ?
                                            <ArrowUpRight size={14} color={subTab === nature ? 'white' : accentColor} /> :
                                            <ArrowDownLeft size={14} color={subTab === nature ? 'white' : accentColor} />
                                        }
                                    </View>
                                    <Text style={[styles.accountGridName, { color: subTab === nature ? 'white' : themeColors.text }]}>{nature}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.label, { color: themeColors.textSecondary, marginTop: 16 }]}>
                            {['Lend', 'Pay'].includes(subTab) ? 'Pay From (Your Account)' : 'Receive Into (Your Account)'}
                        </Text>
                        <View style={styles.categoriesGrid}>
                            {accounts
                                .filter(a => a.type !== 'PERSON' && a.type !== 'MUTUAL_FUND')
                                .map(acc => renderAccountGridItem(
                                    acc,
                                    ['Lend', 'Pay'].includes(subTab) ? selectedFromAccount === acc.id : selectedToAccount === acc.id,
                                    () => ['Lend', 'Pay'].includes(subTab) ? setSelectedFromAccount(acc.id) : setSelectedToAccount(acc.id)
                                ))}
                            <TouchableOpacity
                                style={[styles.accountGridItem, styles.addAccountBtn, { borderColor: accentColor }]}
                                onPress={() => navigation.navigate('AddAccount')}
                            >
                                <Plus size={14} color={accentColor} />
                                <Text style={{ color: accentColor, fontSize: 13, fontWeight: '600' }}>Add</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.label, { color: themeColors.textSecondary, marginTop: 16 }]}>Person</Text>
                        <View style={styles.categoriesGrid}>
                            {accounts
                                .filter(a => a.type === 'PERSON')
                                .map(acc => renderAccountGridItem(
                                    acc,
                                    ['Lend', 'Pay'].includes(subTab) ? selectedToAccount === acc.id : selectedFromAccount === acc.id,
                                    () => ['Lend', 'Pay'].includes(subTab) ? setSelectedToAccount(acc.id) : setSelectedFromAccount(acc.id)
                                ))}
                            <TouchableOpacity
                                style={[styles.accountGridItem, styles.addAccountBtn, { borderColor: accentColor }]}
                                onPress={() => navigation.navigate('AddAccount')}
                            >
                                <Plus size={16} color={accentColor} />
                                <Text style={{ color: accentColor, fontSize: 12, fontWeight: '600' }}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : null}

                <View style={styles.section}>
                    <Text style={[styles.label, { color: themeColors.textSecondary }]}>Transaction Details</Text>
                    <TouchableOpacity
                        style={[styles.detailItem, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <CalendarIcon size={20} color={accentColor} />
                            <Text style={{ color: themeColors.text }}>{format(date, 'PPPP')}</Text>
                        </View>
                    </TouchableOpacity>

                    {showDatePicker ? (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(false);
                                if (selectedDate) setDate(selectedDate);
                            }}
                        />
                    ) : null}

                    <View style={[styles.detailItem, { backgroundColor: themeColors.surface, borderColor: themeColors.border, marginTop: 12 }]}>
                        <FileText size={20} color={accentColor} style={{ marginRight: 12 }} />
                        <TextInput
                            style={{ flex: 1, color: themeColors.text }}
                            placeholder="Add Description (Optional)"
                            placeholderTextColor={themeColors.textSecondary}
                            value={description}
                            onChangeText={setDescription}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.detailItem, { backgroundColor: themeColors.surface, borderColor: themeColors.border, marginTop: 12 }]}
                        onPress={pickReceipt}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <ImageIcon size={20} color={accentColor} />
                                <Text style={{ color: themeColors.text }}>{receiptUri ? 'Receipt Attached' : 'Add Receipt (Optional)'}</Text>
                            </View>
                            {receiptUri ? (
                                <TouchableOpacity onPress={() => setReceiptUri(null)}>
                                    <X size={16} color="#EF4444" />
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    </TouchableOpacity>

                    {receiptUri ? (
                        <Image source={{ uri: receiptUri }} style={styles.receiptPreview} />
                    ) : null}

                    {historicalNAV ? (
                        <View style={[styles.histNavInfo, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <TrendingUp size={16} color={accentColor} />
                                    <View>
                                        <Text style={{ color: themeColors.text, fontSize: 13, fontWeight: '700' }}>Historical NAV</Text>
                                        <Text style={{ color: themeColors.textSecondary, fontSize: 11 }}>For {format(date, 'MMM d, yyyy')}</Text>
                                    </View>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ color: accentColor, fontSize: 18, fontWeight: '800' }}>{historicalNAV}</Text>
                                    {amount && parseFloat(amount.replace(/,/g, '')) > 0 ? (
                                        <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '600' }}>
                                            ≈ {(parseFloat(amount.replace(/,/g, '')) / historicalNAV).toFixed(4)} Units
                                        </Text>
                                    ) : null}
                                </View>
                            </View>

                            {/* Profit/Loss Comparison */}
                            {(() => {
                                const targetId = activeTab === 'Investment' ? (investTab === 'Invest' ? selectedToAccount : selectedFromAccount) : selectedFromAccount;
                                const acc = accounts.find(a => a.id === targetId);
                                const mktNAV = acc?.currentNAV || 0;
                                const amtVal = parseFloat(amount.replace(/,/g, '')) || 0;

                                if (acc?.type === 'MUTUAL_FUND' && mktNAV > 0 && amtVal > 0) {
                                    const units = amtVal / historicalNAV;
                                    const currentVal = units * mktNAV;
                                    const diff = currentVal - amtVal;
                                    const isProfit = diff >= 0;
                                    const pct = ((mktNAV - historicalNAV) / historicalNAV) * 100;

                                    return (
                                        <>
                                            <View style={{ height: 1, backgroundColor: themeColors.border, marginVertical: 10 }} />
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <View>
                                                    <Text style={{ color: themeColors.textSecondary, fontSize: 11 }}>
                                                        {investTab === 'Invest' ? 'Unrealized Profit' : 'Market Difference'}
                                                    </Text>
                                                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                                                        <Text style={{ color: isProfit ? '#10B981' : '#EF4444', fontWeight: '800', fontSize: 16 }}>
                                                            {currency} {Math.abs(diff).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                        </Text>
                                                        <Text style={{ color: isProfit ? '#10B981' : '#EF4444', fontSize: 12, fontWeight: '600' }}>
                                                            ({isProfit ? '+' : ''}{pct.toFixed(2)}%)
                                                        </Text>
                                                    </View>
                                                </View>
                                                <View style={{ alignItems: 'flex-end' }}>
                                                    <Text style={{ color: themeColors.textSecondary, fontSize: 11 }}>Market Price</Text>
                                                    <Text style={{ color: themeColors.text, fontWeight: '700' }}>{mktNAV}</Text>
                                                </View>
                                            </View>
                                        </>
                                    );
                                }
                                return null;
                            })()}
                        </View>
                    ) : null}
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: accentColor }]}
                    onPress={handleSave}
                >
                    <Text style={styles.saveButtonText}>Add Transaction</Text>
                </TouchableOpacity>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        marginBottom: 20,
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    tabs: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
    },
    tab: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    tabsContainer: {
        paddingRight: 10,
    },
    tabText: { fontSize: 13, fontWeight: '600' },
    inputContainer: {
        marginBottom: 24,
    },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
    amountInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        paddingBottom: 8,
    },
    currencyPrefix: { fontSize: 24, marginRight: 10, fontWeight: '500' },
    amountInput: {
        fontSize: 40,
        fontWeight: 'bold',
        flex: 1,
    },
    section: {
        marginBottom: 24,
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    accountGridItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        gap: 8,
    },
    accIconBox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    accountGridName: { fontSize: 12, fontWeight: '600' },
    addAccountBtn: {
        justifyContent: 'center',
        borderStyle: 'dashed',
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    receiptPreview: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        marginTop: 12,
        resizeMode: 'cover',
    },
    saveButton: {
        marginTop: 10,
        marginBottom: 40,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    cgtSection: {
        marginTop: 20,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    toggleBase: {
        width: 48,
        height: 26,
        borderRadius: 13,
        padding: 3,
    },
    toggleThumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'white',
    },
    cgtSummary: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    cgtRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    histNavInfo: {
        marginTop: 12,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    }
});

export default AddTransactionScreen;
