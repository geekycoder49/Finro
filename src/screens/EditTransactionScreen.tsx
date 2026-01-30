import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Image, Platform } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { X, Check, Wallet, Landmark, User, Plus, Trash2, Calendar as CalendarIcon, FileText, Image as ImageIcon, ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';
import { getAccounts, updateTransaction, deleteTransaction, Account } from '../db/database';
import { getCategoryIcon } from '../utils/categoryIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';

const EXPENSE_CATEGORIES = [
    'Family', 'Travel', 'Rent', 'Food & Drink', 'Personal', 'Other Expenses',
    'Bills', 'Education', 'Grocery', 'Fitness', 'Mobile', 'Donations'
];

const INCOME_CATEGORIES = [
    'Salary', 'Bonus', 'Freelance', 'Other Income', 'Commission'
];

const TABS = ['Expense', 'Income', 'Transfer', 'People'];

const EditTransactionScreen = ({ navigation, route }: any) => {
    const { currency, theme, accentColor } = useSettingsStore();
    const themeColors = theme === 'dark' ? DARK_THEME : LIGHT_THEME;
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

    useEffect(() => {
        const accs = getAccounts();
        setAccounts(accs);

        if (transaction) {
            const typeMap: { [key: string]: string } = {
                'EXPENSE': 'Expense',
                'INCOME': 'Income',
                'TRANSFER': 'Transfer',
                'PEOPLE': 'People'
            };
            setActiveTab(typeMap[transaction.type] || 'Expense');

            if (transaction.type === 'PEOPLE' || ['Lend', 'Borrow', 'Pay', 'Receive'].includes(transaction.category)) {
                setSubTab(transaction.category);
            }
            setAmount(transaction.amount.toString());
            setSelectedCategory(transaction.category);
            setSelectedFromAccount(transaction.fromAccountId);
            setSelectedToAccount(transaction.toAccountId || null);
            setDescription(transaction.description || '');
            setDate(new Date(transaction.date));
            setReceiptUri(transaction.receiptUri || null);
        }
    }, [transaction]);

    const handleUpdate = () => {
        const isPeople = activeTab === 'People';
        const isTransfer = activeTab === 'Transfer';

        if (!amount || (!selectedCategory && !isPeople && !isTransfer) || !selectedFromAccount) {
            alert('Please fill all required fields');
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) return;

        const fromAcc = accounts.find(a => a.id === selectedFromAccount);
        const toAcc = accounts.find(a => a.id === selectedToAccount);
        const isPersonInvolved = fromAcc?.type === 'PERSON' || toAcc?.type === 'PERSON';

        updateTransaction(
            transaction.id,
            numAmount,
            activeTab.toUpperCase(),
            (activeTab === 'People' || (activeTab === 'Transfer' && isPersonInvolved)) ? subTab : (selectedCategory || 'Transfer'),
            selectedFromAccount,
            selectedToAccount || undefined,
            description,
            date.toISOString(),
            receiptUri || undefined
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
                {acc.type === 'BANK' ? <Landmark size={14} color={isSelected ? 'white' : themeColors.text} /> :
                    acc.type === 'CASH' ? <Wallet size={14} color={isSelected ? 'white' : themeColors.text} /> :
                        <User size={14} color={isSelected ? 'white' : themeColors.text} />}
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

                <View style={{ marginBottom: 20 }}>
                    <Text style={[styles.label, { color: themeColors.textSecondary }]}>Transaction Type</Text>
                    <View style={[styles.staticTypeLabel, { backgroundColor: accentColor + '20', borderColor: accentColor }]}>
                        <Text style={{ color: accentColor, fontWeight: '700', fontSize: 16 }}>{activeTab}</Text>
                    </View>
                </View>

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
                            onChangeText={setAmount}
                        />
                    </View>
                </View>

                {(activeTab === 'Expense' || activeTab === 'Income') && (
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
                )}

                {/* Conditional Account Lists based on Nature/Tab */}
                {!isPersonFlow ? (
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

                        {activeTab === 'Transfer' && (
                            <View style={styles.section}>
                                <Text style={[styles.label, { color: themeColors.textSecondary }]}>Pay To</Text>
                                <View style={styles.categoriesGrid}>
                                    {accounts
                                        .filter((acc: Account) => acc.id !== selectedFromAccount && acc.type !== 'PERSON')
                                        .map((acc: Account) => renderAccountGridItem(acc, selectedToAccount === acc.id, () => setSelectedToAccount(acc.id)))}
                                </View>
                            </View>
                        )}
                    </>
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
                                .filter((a: Account) => a.type !== 'PERSON')
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

                    {showDatePicker && (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(false);
                                if (selectedDate) setDate(selectedDate);
                            }}
                        />
                    )}

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
                            {receiptUri && (
                                <TouchableOpacity onPress={() => setReceiptUri(null)}>
                                    <X size={16} color="#EF4444" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </TouchableOpacity>

                    {receiptUri && (
                        <Image source={{ uri: receiptUri }} style={styles.receiptPreview} />
                    )}
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
        height: 36,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        borderRadius: 18,
        borderWidth: 1,
        gap: 6,
    },
    accIconBox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
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
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default EditTransactionScreen;
