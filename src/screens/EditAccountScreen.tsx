import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Image } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { X, Check, Landmark, Wallet, User, Trash2, Camera, Image as ImageIcon } from 'lucide-react-native';
import { updateAccount, deleteAccount, Account } from '../db/database';
import * as ImagePicker from 'expo-image-picker';

const EditAccountScreen = ({ navigation, route }: any) => {
    const { currency, theme, accentColor } = useSettingsStore();
    const themeColors = theme === 'dark' ? DARK_THEME : LIGHT_THEME;
    const account: Account = route.params.account;

    const [type, setType] = useState<'BANK' | 'CASH' | 'PERSON' | 'WALLET'>(account.type);
    const [name, setName] = useState(account.name);
    const [balance, setBalance] = useState(account.balance.toString());
    const [peopleType, setPeopleType] = useState<'RECEIVABLE' | 'PAYABLE'>(account.peopleType || 'RECEIVABLE');
    const [iconUri, setIconUri] = useState(account.iconUri);

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

    const handleSave = () => {
        if (!name) {
            alert('Please enter account name');
            return;
        }

        const numBalance = parseFloat(balance) || 0;

        updateAccount(account.id, name, type, numBalance, account.currency, type === 'PERSON' ? peopleType : undefined, iconUri);
        navigation.goBack();
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Account",
            "Are you sure? The account will be hidden, but its transaction history will be preserved.",
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
                {/* Icon Selection */}
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
                    {iconUri && (
                        <TouchableOpacity onPress={() => setIconUri(undefined)} style={{ marginTop: 10 }}>
                            <Text style={{ color: '#EF4444' }}>Remove Custom Icon</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: themeColors.textSecondary }]}>Account Name</Text>
                    <TextInput
                        style={[styles.input, { color: themeColors.text, borderBottomColor: themeColors.border }]}
                        placeholder="Enter name"
                        placeholderTextColor={themeColors.textSecondary}
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: themeColors.textSecondary }]}>Account Nature</Text>
                    <View style={[styles.tabs, { backgroundColor: themeColors.surface }]}>
                        {['CASH', 'BANK', 'WALLET', 'PERSON'].map((t) => (
                            <TouchableOpacity
                                key={t}
                                onPress={() => setType(t as any)}
                                style={[styles.tab, type === t ? { backgroundColor: accentColor } : {}]}
                            >
                                <Text style={[styles.tabText, { color: type === t ? 'white' : themeColors.textSecondary }]}>
                                    {t.charAt(0) + t.slice(1).toLowerCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: themeColors.textSecondary }]}>Current Balance</Text>
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
                    <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>
                        Changing balance manually does not create a transaction record.
                    </Text>
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
                    style={[styles.deleteButton, { borderColor: '#EF4444', backgroundColor: themeColors.surface }]}
                    onPress={handleDelete}
                >
                    <Trash2 color="#EF4444" size={20} />
                    <Text style={[styles.deleteText, { color: '#EF4444' }]}>Delete Account</Text>
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
    deleteText: { fontWeight: 'bold', fontSize: 16 }
});

export default EditAccountScreen;
