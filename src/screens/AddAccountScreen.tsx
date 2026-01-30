import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { X, Check, Landmark, Wallet, User, Camera } from 'lucide-react-native';
import { addAccount } from '../db/database';
import * as ImagePicker from 'expo-image-picker';

const PAK_BANKS = [
    'HBL', 'UBL', 'MCB', 'Allied Bank', 'Meezan Bank', 'Bank Alfalah',
    'Standard Chartered', 'Askari Bank', 'Easypaisa', 'JazzCash', 'SadaPay', 'NayaPay', 'Custom Bank'
];

const AddAccountScreen = ({ navigation }: any) => {
    const { currency, theme, accentColor } = useSettingsStore();
    const themeColors = theme === 'dark' ? DARK_THEME : LIGHT_THEME;

    const [step, setStep] = useState(1); // 1: Choose Type, 2: Details
    const [type, setType] = useState<'BANK' | 'CASH' | 'PERSON' | 'WALLET'>('BANK');
    const [bankName, setBankName] = useState('');
    const [accountName, setAccountName] = useState('');
    const [balance, setBalance] = useState('');
    const [peopleType, setPeopleType] = useState<'RECEIVABLE' | 'PAYABLE'>('RECEIVABLE');
    const [iconUri, setIconUri] = useState<string | undefined>(undefined);

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

    const handleNext = (selectedType: 'BANK' | 'CASH' | 'PERSON' | 'WALLET', name?: string) => {
        setType(selectedType);
        if (name) setBankName(name);
        setStep(2);
    };

    const handleSave = () => {
        if (!accountName && !bankName) {
            alert('Please enter account name');
            return;
        }

        const finalName = type === 'BANK' ? (bankName === 'Custom Bank' ? accountName : bankName) : accountName;
        const numBalance = parseFloat(balance) || 0;

        addAccount(finalName, type, numBalance, currency, type === 'PERSON' ? peopleType : undefined, iconUri);
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
                                <Landmark size={20} color={accentColor} />
                                <Text style={[styles.bankText, { color: themeColors.text }]} numberOfLines={1}>{bank}</Text>
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
                            onPress={() => handleNext('WALLET')}
                        >
                            <Wallet size={32} color={accentColor} />
                            <Text style={[styles.typeText, { color: themeColors.text }]}>Wallet</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.typeCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                            onPress={() => handleNext('PERSON')}
                        >
                            <User size={32} color={accentColor} />
                            <Text style={[styles.typeText, { color: themeColors.text }]}>Person</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setStep(1)}>
                    <X color={themeColors.text} size={28} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: themeColors.text }]}>Account Details</Text>
                <TouchableOpacity onPress={handleSave}>
                    <Check color={accentColor} size={28} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.iconSelectionSection}>
                    <TouchableOpacity style={[styles.iconLarge, { backgroundColor: themeColors.surface, borderColor: accentColor }]} onPress={pickImage}>
                        {iconUri ? (
                            <Image source={{ uri: iconUri }} style={styles.selectedImage} />
                        ) : (
                            <View style={{ alignItems: 'center' }}>
                                <Camera color={accentColor} size={32} />
                                <Text style={{ color: accentColor, fontSize: 12, marginTop: 4 }}>Add Icon</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: themeColors.textSecondary }]}>Account Name</Text>
                    <TextInput
                        style={[styles.input, { color: themeColors.text, borderBottomColor: themeColors.border }]}
                        placeholder={bankName && bankName !== 'Custom Bank' ? bankName : "Enter name"}
                        placeholderTextColor={themeColors.textSecondary}
                        value={accountName}
                        onChangeText={setAccountName}
                        autoFocus={false}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: themeColors.textSecondary }]}>Opening Balance</Text>
                    <View style={styles.amountInputRow}>
                        <Text style={[styles.currencyPrefix, { color: themeColors.text }]}>{currency}</Text>
                        <TextInput
                            style={[styles.amountInput, { color: themeColors.text }]}
                            placeholder="0"
                            placeholderTextColor={themeColors.textSecondary}
                            keyboardType="numeric"
                            value={balance}
                            onChangeText={setBalance}
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

                <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: accentColor }]}
                    onPress={handleSave}
                >
                    <Text style={styles.saveBtnText}>Confirm / Add Account</Text>
                </TouchableOpacity>
                <View style={{ height: 40 }} />
            </ScrollView>
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
    row: { flexDirection: 'row', gap: 15 },
    typeCard: {
        flex: 1,
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        gap: 10,
    },
    typeText: { fontSize: 16, fontWeight: '600' },
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
});

export default AddAccountScreen;
