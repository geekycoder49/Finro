import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Image, Platform } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';
import { useTheme } from '../hooks/useTheme';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { X, Check, Wallet, Landmark, User, Plus, Trash2, Calendar as CalendarIcon, FileText, Image as ImageIcon, ArrowUpRight, ArrowDownLeft, TrendingUp } from 'lucide-react-native';
import { getAccounts, updateTransaction, deleteTransaction, Account } from '../db/database';
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

const EditTransactionScreen = ({ navigation, route }: any) => {
    const { currency, theme, accentColor } = useSettingsStore();
    const { themeColors } = useTheme();
    const transaction = route?.params?.transaction;

    const [activeTab, setActiveTab] = useState('Expense');
    const [subTab, setSubTab] = useState('Lend'); // For People: Pay, Receive, Lend, Borrow
    const [amount, setAmount] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedFromAccount, setSelectedFromAccount] = useState<number | null>(null);
    const [selectedToAccount, setSelectedToAccount] = useState<number | null>(null);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [description, setDescription] = useState('');
    const [receiptUri, setReceiptUri] = useState<string | null>(null);
    const [historicalNAV, setHistoricalNAV] = useState<number | null>(null);
    const [isLoadingHistNAV, setIsLoadingHistNAV] = useState(false);

    const formatWithCommas = (value: string) => {
        const cleanValue = value.replace(/[^0-9]/g, '');
        if (!cleanValue) return '';
        return parseInt(cleanValue).toLocaleString('en-US');
    };

    const handleAmountChange = (text: string) => {
        const formatted = formatWithCommas(text);
        setAmount(formatted);
    };

    useEffect(() => {
        const accs = getAccounts();
        setAccounts(accs);

        if (transaction) {
            if (transaction.isSystem === 1) {
                Alert.alert("System Transaction", "This is a system-generated transaction (e.g., CGT Tax) and cannot be modified manually.");
                navigation.goBack();
                return;
            }

            const typeMap: { [key: string]: string } = {
                'EXPENSE': 'Expense',
                'INCOME': 'Income',
                'TRANSFER': 'Transfer',
                'PEOPLE': 'People'
            };

            let tab = typeMap[transaction.type] || 'Expense';
            if (transaction.category === 'Investment') tab = 'Investment';

            setActiveTab(tab);

            if (transaction.type === 'PEOPLE' || ['Lend', 'Borrow', 'Pay', 'Receive'].includes(transaction.category)) {
                setSubTab(transaction.category);
            }
            setAmount(formatWithCommas(transaction.amount.toString()));
            setSelectedCategory(transaction.category);
            setSelectedFromAccount(transaction.fromAccountId);
            setSelectedToAccount(transaction.toAccountId || null);
            setDescription(transaction.description || '');
            setDate(new Date(transaction.date));
            setReceiptUri(transaction.receiptUri || null);
            if (transaction.transactionNAV) {
                setHistoricalNAV(transaction.transactionNAV);
            }
        }
    }, [transaction]);

    // Fetch Historical NAV when date or account changes
    useEffect(() => {
        const fetchHistNAV = async () => {
            const isInvestment = activeTab === 'Investment';
            const targetAccountId = isInvestment ? selectedToAccount : selectedFromAccount;

            const acc = accounts.find(a => a.id === targetAccountId);
            if (acc && acc.type === 'MUTUAL_FUND') {
                setIsLoadingHistNAV(true);
                const hist = await getNAVForDate(acc.name, date.toISOString());
                if (hist) {
                    setHistoricalNAV(hist.nav);
                } else if (transaction && transaction.fromAccountId === targetAccountId && transaction.transactionNAV) {
                    setHistoricalNAV(transaction.transactionNAV);
                } else {
                    setHistoricalNAV(acc.currentNAV || null);
                }
                setIsLoadingHistNAV(false);
            } else {
                setHistoricalNAV(null);
            }
        };

        if (accounts.length > 0) fetchHistNAV();
    }, [date, selectedFromAccount, selectedToAccount, activeTab, accounts]);

    const handleUpdate = () => {
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

        const fromAcc = accounts.find(a => a.id === selectedFromAccount);
        const toAcc = accounts.find(a => a.id === selectedToAccount);
        const isPersonInvolved = fromAcc?.type === 'PERSON' || toAcc?.type === 'PERSON';

        let finalType = activeTab.toUpperCase();
        let finalCategory = (activeTab === 'People' || (activeTab === 'Transfer' && isPersonInvolved)) ? subTab : (selectedCategory || activeTab);

        if (isInvestment) {
            finalType = 'TRANSFER';
            finalCategory = 'Investment';
        }

        updateTransaction(
            transaction.id,
            numAmount,
            finalType,
            finalCategory,
            selectedFromAccount,
            selectedToAccount || undefined,
            description,
            date.toISOString(),
            receiptUri || undefined,
            undefined, // cgtAmount placeholder
            historicalNAV || undefined
        );

        navigation.goBack();
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Transaction",
            "Are you sure you want to delete this transaction?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        deleteTransaction(transaction.id);
                        navigation.goBack();
                    }
                }
            ]
        );
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
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <X color={themeColors.text} size={28} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: themeColors.text }]}>Edit Transaction</Text>
                    <TouchableOpacity onPress={handleUpdate}>
                        <Check color={accentColor} size={28} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabsContainer}
                    style={[styles.tabs, { backgroundColor: themeColors.surface }]}
                >
                    {TABS.map(tab => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => {
                                setActiveTab(tab);
                                setSelectedCategory('');
                            }}
                            style={[styles.tab, activeTab === tab ? { backgroundColor: accentColor } : {}]}
                        >
                            <Text style={[styles.tabText, { color: activeTab === tab ? 'white' : themeColors.textSecondary }]}>{tab}</Text>
                        </TouchableOpacity>
                    ))}
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

                {/* Account Selection Logic */}
                {(!isPersonFlow && activeTab !== 'Investment') ? (
                    <>
                        <View style={styles.section}>
                            <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                                {activeTab === 'Income' ? 'Receive Into' : 'Pay From'}
                            </Text>
                            <View style={styles.categoriesGrid}>
                                {accounts
                                    .filter((a: Account) => a.type !== 'PERSON')
                                    .map((acc: Account) => renderAccountGridItem(acc, selectedFromAccount === acc.id, () => setSelectedFromAccount(acc.id)))}
                            </View>
                        </View>

                        {activeTab === 'Transfer' ? (
                            <View style={styles.section}>
                                <Text style={[styles.label, { color: themeColors.textSecondary }]}>Pay To</Text>
                                <View style={styles.categoriesGrid}>
                                    {accounts
                                        .filter((acc: Account) => acc.id !== selectedFromAccount && acc.type !== 'PERSON')
                                        .map((acc: Account) => renderAccountGridItem(acc, selectedToAccount === acc.id, () => setSelectedToAccount(acc.id)))}
                                </View>
                            </View>
                        ) : null}
                    </>
                ) : activeTab === 'Investment' ? (
                    <View style={styles.section}>
                        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Mutual Fund</Text>
                        <View style={styles.categoriesGrid}>
                            {accounts
                                .filter(a => a.type === 'MUTUAL_FUND')
                                .map(acc => renderAccountGridItem(acc, selectedToAccount === acc.id, () => setSelectedToAccount(acc.id)))}
                        </View>

                        <Text style={[styles.label, { color: themeColors.textSecondary, marginTop: 16 }]}>Pay From</Text>
                        <View style={styles.categoriesGrid}>
                            {accounts
                                .filter(a => a.type !== 'PERSON' && a.type !== 'MUTUAL_FUND')
                                .map(acc => renderAccountGridItem(acc, selectedFromAccount === acc.id, () => setSelectedFromAccount(acc.id)))}
                        </View>
                    </View>
                ) : (
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
                                .filter((a: Account) => a.type !== 'PERSON' && a.type !== 'MUTUAL_FUND')
                                .map((acc: Account) => renderAccountGridItem(
                                    acc,
                                    ['Lend', 'Pay'].includes(subTab) ? selectedFromAccount === acc.id : selectedToAccount === acc.id,
                                    () => ['Lend', 'Pay'].includes(subTab) ? setSelectedFromAccount(acc.id) : setSelectedToAccount(acc.id)
                                ))}
                        </View>

                        <Text style={[styles.label, { color: themeColors.textSecondary, marginTop: 16 }]}>Person</Text>
                        <View style={styles.categoriesGrid}>
                            {accounts
                                .filter((a: Account) => a.type === 'PERSON')
                                .map((acc: Account) => renderAccountGridItem(
                                    acc,
                                    ['Lend', 'Pay'].includes(subTab) ? selectedToAccount === acc.id : selectedFromAccount === acc.id,
                                    () => ['Lend', 'Pay'].includes(subTab) ? setSelectedToAccount(acc.id) : setSelectedFromAccount(acc.id)
                                ))}
                        </View>
                    </View>
                )}

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
                                        <Text style={{ color: themeColors.text, fontSize: 13, fontWeight: '700' }}>NAV for Transaction</Text>
                                        <Text style={{ color: themeColors.textSecondary, fontSize: 11 }}>Date: {format(date, 'MMM d, yyyy')}</Text>
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
                        </View>
                    ) : null}
                </View>

                <View style={{ flexDirection: 'row', gap: 15, marginTop: 10, marginBottom: 40 }}>
                    <TouchableOpacity
                        style={[styles.deleteButton, { backgroundColor: themeColors.surface, borderColor: '#EF4444' }]}
                        onPress={handleDelete}
                    >
                        <Trash2 color="#EF4444" size={24} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: accentColor }]}
                        onPress={handleUpdate}
                    >
                        <Text style={styles.saveButtonText}>Update Transaction</Text>
                    </TouchableOpacity>
                </View>
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
    tab: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    tabsContainer: {
        paddingRight: 10,
    },
    accIconBox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabText: { fontSize: 13, fontWeight: '600' },
    tabs: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
    },
    accountGridName: { fontSize: 12, fontWeight: '600' },
    staticTypeLabel: {
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
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
        flex: 1,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    deleteButton: {
        width: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
    },
    histNavInfo: {
        marginTop: 12,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default EditTransactionScreen;
