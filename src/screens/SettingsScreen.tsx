import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image, Alert, Platform } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Moon, Sun, Monitor, Type, Palette, Database, Info, LogOut, Check, User, Image as ImageIcon, ChevronRight, FileText, Languages } from 'lucide-react-native';
import { getAccounts, getTransactions, clearAllData } from '../db/database';
import { importExcelData } from '../utils/excelImport';
import * as ImagePicker from 'expo-image-picker';

const AVATARS = [
    'https://img.icons8.com/color/96/bear.png',
    'https://img.icons8.com/color/96/cat.png',
    'https://img.icons8.com/color/96/corgi.png',
    'https://img.icons8.com/color/96/rabbit.png',
    'https://img.icons8.com/color/96/lion.png',
    'https://img.icons8.com/color/96/panda.png',
    'https://img.icons8.com/color/96/sloth.png',
    'https://img.icons8.com/color/96/koala.png',
];

const COLORS = [
    '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#0EA5E9'
];

const CURRENCIES = ['PKR', 'USD', 'EUR', 'GBP', 'INR', 'AED', 'SAR'];

const FONTS = [
    { name: 'System Default', value: 'System' },
    { name: 'Sans Serif', value: 'sans-serif' },
    { name: 'Serif Style', value: 'serif' },
    { name: 'Monospace Code', value: 'monospace' },
    { name: 'Modern Light', value: 'sans-serif-light' },
    { name: 'Elegant Thin', value: 'sans-serif-thin' },
    { name: 'Professional Medium', value: 'sans-serif-medium' },
    { name: 'Bold Impact', value: 'sans-serif-black' },
    { name: 'Classic Lucida', value: 'lucida grande' },
    { name: 'Minimalist Verdana', value: 'verdana' },
    { name: 'Tradition Georgia', value: 'georgia' },
];

const SettingsScreen = ({ navigation }: any) => {
    const {
        currency, theme, accentColor, userName, profileImage, fontFamily,
        setCurrency, setTheme, setAccentColor, setUserName, setProfileImage, setFontFamily
    } = useSettingsStore();
    const themeColors = theme === 'dark' ? DARK_THEME : LIGHT_THEME;

    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editName, setEditName] = useState(userName);
    const [editImage, setEditImage] = useState(profileImage);

    const pickProfileImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setEditImage(result.assets[0].uri);
        }
    };

    const handleSaveProfile = () => {
        setUserName(editName);
        setProfileImage(editImage);
        setIsEditingProfile(false);
    };

    const handleResetData = () => {
        Alert.alert(
            "Reset Data",
            "Are you sure? This will delete all your data permanently.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        clearAllData();
                        Alert.alert("Success", "All data has been cleared.");
                        navigation.navigate('Dashboard');
                    }
                }
            ]
        );
    };

    const handleImportExcel = async () => {
        Alert.alert(
            "Import Excel",
            "This will add all transactions from your Excel file. Do you want to proceed?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Import",
                    onPress: async () => {
                        const result = await importExcelData();
                        Alert.alert(result.success ? "Success" : "Error", result.message);
                    }
                }
            ]
        );
    };

    const renderSettingItem = (icon: any, title: string, value: string, onPress: () => void, color?: string) => (
        <TouchableOpacity style={styles.settingItem} onPress={onPress}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.iconBox, { backgroundColor: color || themeColors.surface }]}>
                    {icon}
                </View>
                <Text style={[styles.settingTitle, { color: themeColors.text, fontFamily: fontFamily === 'System' ? undefined : fontFamily }]}>{title}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.settingValue, { color: themeColors.textSecondary, fontFamily: fontFamily === 'System' ? undefined : fontFamily }]}>{value}</Text>
                <ChevronRight color={themeColors.textSecondary} size={18} />
            </View>
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: themeColors.text, fontFamily: fontFamily === 'System' ? undefined : fontFamily }]}>Settings</Text>
            </View>

            {/* Profile Section */}
            <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                {isEditingProfile ? (
                    <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                            <Image
                                source={{ uri: editImage || 'https://via.placeholder.com/100' }}
                                style={{ width: 64, height: 64, borderRadius: 32, marginRight: 16 }}
                            />
                            <View style={{ flex: 1 }}>
                                <TouchableOpacity
                                    style={[styles.btn, { backgroundColor: themeColors.surface, borderWidth: 1, borderColor: themeColors.border, minHeight: 40 }]}
                                    onPress={pickProfileImage}
                                >
                                    <Text style={{ color: themeColors.text, fontSize: 12, fontWeight: '600' }}>Gallery Upload</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <TextInput
                            style={[styles.input, { color: themeColors.text, borderColor: themeColors.border, marginBottom: 15 }]}
                            value={editName}
                            onChangeText={setEditName}
                            placeholder="Username"
                        />

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                            {AVATARS.map(url => (
                                <TouchableOpacity key={url} onPress={() => setEditImage(url)} style={{ marginRight: 8 }}>
                                    <Image source={{ uri: url }} style={[styles.avatarOption, { borderWidth: editImage === url ? 3 : 0, borderColor: accentColor }]} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity style={[styles.btn, { backgroundColor: themeColors.background }]} onPress={() => setIsEditingProfile(false)}>
                                <Text style={{ color: themeColors.text }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.btn, { backgroundColor: accentColor }]} onPress={handleSaveProfile}>
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                        onPress={() => {
                            setEditName(userName);
                            setEditImage(profileImage);
                            setIsEditingProfile(true);
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Image
                                source={{ uri: profileImage || 'https://via.placeholder.com/100' }}
                                style={{ width: 50, height: 50, borderRadius: 25, marginRight: 12 }}
                            />
                            <View>
                                <Text style={[styles.profileName, { color: themeColors.text, fontFamily: fontFamily === 'System' ? undefined : fontFamily }]}>{userName}</Text>
                                <Text style={{ color: themeColors.textSecondary, fontSize: 13 }}>Personalize Profile</Text>
                            </View>
                        </View>
                        <ChevronRight color={themeColors.textSecondary} size={20} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Appearance */}
            <Text style={[styles.sectionHeader, { color: themeColors.textSecondary }]}>Appearance</Text>
            <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border, padding: 0 }]}>
                {renderSettingItem(
                    theme === 'dark' ? <Moon size={18} color={accentColor} /> : theme === 'light' ? <Sun size={18} color={accentColor} /> : <Monitor size={18} color={accentColor} />,
                    "Theme Mode",
                    theme.charAt(0).toUpperCase() + theme.slice(1),
                    () => setTheme(theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system')
                )}
                <View style={styles.divider} />

                <View style={{ padding: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                        <View style={[styles.iconBox, { backgroundColor: themeColors.background }]}>
                            <Palette size={18} color={accentColor} />
                        </View>
                        <Text style={[styles.settingTitle, { color: themeColors.text, fontFamily: fontFamily === 'System' ? undefined : fontFamily }]}>Brand Accent</Text>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                        {COLORS.map(c => (
                            <TouchableOpacity
                                key={c}
                                style={[styles.colorCircle, { backgroundColor: c }]}
                                onPress={() => setAccentColor(c)}
                            >
                                {accentColor === c && <Check color="white" size={14} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Font Selector */}
                <View style={{ padding: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                        <View style={[styles.iconBox, { backgroundColor: themeColors.background }]}>
                            <Type size={18} color={accentColor} />
                        </View>
                        <Text style={[styles.settingTitle, { color: themeColors.text, fontFamily: fontFamily === 'System' ? undefined : fontFamily }]}>Typography</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {FONTS.map(f => (
                            <TouchableOpacity
                                key={f.value}
                                style={[
                                    styles.fontChip,
                                    {
                                        backgroundColor: fontFamily === f.value ? accentColor : themeColors.background,
                                        borderColor: themeColors.border,
                                        borderWidth: 1
                                    }
                                ]}
                                onPress={() => setFontFamily(f.value)}
                            >
                                <Text style={{
                                    color: fontFamily === f.value ? 'white' : themeColors.text,
                                    fontFamily: f.value === 'System' ? undefined : f.value,
                                    fontWeight: '600',
                                    fontSize: 13
                                }}>{f.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>

            {/* Preferences */}
            <Text style={[styles.sectionHeader, { color: themeColors.textSecondary }]}>Regional</Text>
            <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border, padding: 0 }]}>
                <View style={{ padding: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                        <View style={[styles.iconBox, { backgroundColor: themeColors.background }]}>
                            <Languages size={18} color={accentColor} />
                        </View>
                        <Text style={[styles.settingTitle, { color: themeColors.text, fontFamily: fontFamily === 'System' ? undefined : fontFamily }]}>Default Currency</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {CURRENCIES.map(c => (
                            <TouchableOpacity
                                key={c}
                                style={[styles.currencyChip, { backgroundColor: currency === c ? accentColor : themeColors.background }]}
                                onPress={() => setCurrency(c)}
                            >
                                <Text style={{ color: currency === c ? 'white' : themeColors.text, fontWeight: '700' }}>{c}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>

            {/* Data */}
            <Text style={[styles.sectionHeader, { color: themeColors.textSecondary }]}>Workspace & Backup</Text>
            <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border, padding: 0 }]}>
                {renderSettingItem(
                    <FileText size={18} color={accentColor} />,
                    "Import Data (Excel)",
                    "",
                    handleImportExcel
                )}
                <View style={styles.divider} />
                {renderSettingItem(
                    <Database size={18} color="#EF4444" />,
                    "Erase All Content",
                    "",
                    handleResetData
                )}
            </View>

            <View style={{ height: 30 }} />
            <Text style={{ textAlign: 'center', color: themeColors.textSecondary, fontSize: 12 }}>Build v1.2.4</Text>
            <Text style={{ textAlign: 'center', color: themeColors.textSecondary, fontSize: 12, marginBottom: 40 }}>Powered by Advanced AI</Text>

        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { marginBottom: 16 },
    headerTitle: { fontSize: 24, fontWeight: 'bold' },
    card: {
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    sectionHeader: { marginLeft: 4, marginBottom: 6, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', opacity: 0.6 },

    // Profile
    profileName: { fontSize: 16, fontWeight: 'bold' },
    input: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 14 },
    avatarOption: { width: 44, height: 44, borderRadius: 22 },
    btn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

    // Settings Item
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
    },
    iconBox: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    settingTitle: { fontSize: 14, fontWeight: '600' },
    settingValue: { fontSize: 13, marginRight: 6 },
    divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.03)' },

    // Color/Currency/Font
    colorCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    currencyChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, marginRight: 8 },
    fontChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginRight: 8, minWidth: 80, alignItems: 'center' },
});

export default SettingsScreen;
