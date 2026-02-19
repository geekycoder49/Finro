import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image, Alert, Platform, Modal, Dimensions } from 'react-native';
import ColorPicker from 'react-native-wheel-color-picker';
import { Plus } from 'lucide-react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Moon, Sun, Monitor, Palette, Check, User, ChevronRight, FileText, Languages, Zap, Download, Database } from 'lucide-react-native';
import { clearAllData } from '../db/database';
import { importExcelData, exportExcelData } from '../utils/excelImport';
import { createBackup, restoreBackup } from '../utils/backup';
import * as ImagePicker from 'expo-image-picker';
import { useToast } from '../components/ToastProvider';
import { useTheme } from '../hooks/useTheme';

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

const ANIMATIONS = [
    'Fade', 'Slide Right', 'Slide Left', 'Slide Up', 'Slide Down',
    'Zoom In', 'Zoom Out', 'Rotate', 'Flip', 'Bounce'
];

const SettingsScreen = ({ navigation }: any) => {
    const {
        currency, theme, accentColor, userName, profileImage, animationType,
        setCurrency, setTheme, setAccentColor, setUserName, setProfileImage, setAnimationType
    } = useSettingsStore();
    const { themeColors, isDarkMode } = useTheme();
    const { showToast } = useToast();

    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editName, setEditName] = useState(userName);
    const [editImage, setEditImage] = useState(profileImage);

    // Unified Selection Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'THEME' | 'ANIMATION' | 'COLOR'>('THEME');
    const [showColorPicker, setShowColorPicker] = useState(false);



    const handleOpenAnimation = () => {
        setModalType('ANIMATION');
        setModalVisible(true);
    };

    const renderSelectionModal = () => (
        <Modal visible={modalVisible} transparent={true} animationType="fade">
            <TouchableOpacity
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}
                activeOpacity={1}
                onPress={() => setModalVisible(false)}
            >
                <View style={{
                    backgroundColor: themeColors.surface,
                    borderRadius: 24,
                    padding: 20,
                    maxHeight: '70%',
                    width: '100%',
                    maxWidth: 400,
                    alignSelf: 'center',
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.25,
                    shadowRadius: 15,
                    elevation: 10
                }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: themeColors.text }}>
                            Transition Effect
                        </Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 4 }}>
                            <Check size={20} color="transparent" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                            {ANIMATIONS.map(anim => (
                                <TouchableOpacity
                                    key={anim}
                                    style={{
                                        width: '48%',
                                        paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12,
                                        backgroundColor: animationType === anim ? accentColor : themeColors.background,
                                        borderWidth: 1, borderColor: animationType === anim ? 'transparent' : themeColors.border,
                                        alignItems: 'center'
                                    }}
                                    onPress={() => { setAnimationType(anim); setModalVisible(false); }}
                                >
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: animationType === anim ? 'white' : themeColors.text, textAlign: 'center' }}>
                                        {anim}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <TouchableOpacity
                        style={{ marginTop: 20, padding: 14, backgroundColor: themeColors.background, borderRadius: 12, alignItems: 'center' }}
                        onPress={() => setModalVisible(false)}
                    >
                        <Text style={{ color: themeColors.textSecondary, fontWeight: '600', fontSize: 14 }}>Close</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );

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
                        showToast("All data has been cleared.", "success");
                        navigation.navigate('Dashboard');
                    }
                }
            ]
        );
    };

    const handleImportExcel = async () => {
        Alert.alert(
            "Import Excel",
            "This will merge/rebuild data from your Excel file. Do you want to proceed?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Import",
                    onPress: async () => {
                        const result = await importExcelData();
                        if (result.success) {
                            showToast(result.message, "success");
                        } else {
                            showToast(result.message, "error");
                        }
                    }
                }
            ]
        );
    };

    const handleExportExcel = async () => {
        const result = await exportExcelData();
        if (result.success) {
            showToast(result.message, "success");
        } else {
            showToast(result.message, "error");
        }
    };

    const handleCreateBackup = async () => {
        const success = await createBackup();
        if (success) {
            showToast("Backup created and saved to Finro folder!", "success");
        } else {
            showToast("Failed to create backup", "error");
        }
    };

    const handleRestoreBackup = async () => {
        const success = await restoreBackup();
        if (success) {
            showToast("Backup restored successfully!", "success");
        }
    };

    const renderSettingItem = (icon: any, title: string, value: string, onPress: () => void, color?: string) => (
        <TouchableOpacity style={styles.settingItem} onPress={onPress}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.iconBox, { backgroundColor: color || themeColors.surface }]}>
                    {icon}
                </View>
                <Text style={[styles.settingTitle, { color: themeColors.text }]}>{title}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.settingValue, { color: themeColors.textSecondary }]}>{value}</Text>
                <ChevronRight color={themeColors.textSecondary} size={18} />
            </View>
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: themeColors.text }]}>Settings</Text>
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
                                    <Text style={[styles.profileName, { color: themeColors.text }]}>{userName}</Text>
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
                    <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={[styles.iconBox, { backgroundColor: themeColors.background }]}>
                                    {theme === 'dark' ? <Moon size={18} color={accentColor} /> : theme === 'light' ? <Sun size={18} color={accentColor} /> : <Monitor size={18} color={accentColor} />}
                                </View>
                                <Text style={[styles.settingTitle, { color: themeColors.text }]}>Theme Mode</Text>
                            </View>
                            <View style={{ flexDirection: 'row', backgroundColor: themeColors.background, borderRadius: 12, padding: 4 }}>
                                {[
                                    { value: 'light', icon: <Sun size={14} color={theme === 'light' ? 'white' : themeColors.textSecondary} /> },
                                    { value: 'dark', icon: <Moon size={14} color={theme === 'dark' ? 'white' : themeColors.textSecondary} /> },
                                    { value: 'system', icon: <Monitor size={14} color={theme === 'system' ? 'white' : themeColors.textSecondary} /> }
                                ].map((opt) => (
                                    <TouchableOpacity
                                        key={opt.value}
                                        onPress={() => setTheme(opt.value as any)}
                                        style={{
                                            paddingHorizontal: 12,
                                            paddingVertical: 6,
                                            borderRadius: 8,
                                            backgroundColor: theme === opt.value ? accentColor : 'transparent',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 6
                                        }}
                                    >
                                        {opt.icon}
                                        {theme === opt.value ? <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>{opt.value.charAt(0).toUpperCase() + opt.value.slice(1)}</Text> : null}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                    <View style={styles.divider} />

                    {/* Animation Selector Dropdown */}
                    {renderSettingItem(
                        <Zap size={18} color={accentColor} />,
                        "Page Transitions",
                        animationType,
                        handleOpenAnimation
                    )}

                    <View style={styles.divider} />

                    <View style={{ padding: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                            <View style={[styles.iconBox, { backgroundColor: themeColors.background }]}>
                                <Palette size={18} color={accentColor} />
                            </View>
                            <Text style={[styles.settingTitle, { color: themeColors.text }]}>App Color</Text>
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                            {COLORS.map(c => (
                                <TouchableOpacity
                                    key={c}
                                    style={[styles.colorCircle, { backgroundColor: c }]}
                                    onPress={() => setAccentColor(c)}
                                >
                                    {accentColor === c ? <Check color="white" size={14} /> : null}
                                </TouchableOpacity>
                            ))}
                            {/* Custom Color Selector Wheel Trigger */}
                            <TouchableOpacity
                                style={[styles.colorCircle, { backgroundColor: themeColors.background, borderStyle: 'dashed', borderWidth: 1, borderColor: accentColor }]}
                                onPress={() => setShowColorPicker(true)}
                            >
                                <Plus color={accentColor} size={18} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Color Picker Modal */}
                <Modal visible={showColorPicker} transparent animationType="slide">
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }}>
                        <View style={{ backgroundColor: themeColors.surface, borderRadius: 32, padding: 24, alignItems: 'center', height: 480 }}>
                            <Text style={{ fontSize: 20, fontWeight: '900', color: themeColors.text, marginBottom: 20 }}>Custom Accent Color</Text>

                            <View style={{ flex: 1, width: '100%', paddingHorizontal: 10 }}>
                                <ColorPicker
                                    color={accentColor}
                                    onColorChangeComplete={(color) => setAccentColor(color)}
                                    thumbSize={30}
                                    sliderSize={30}
                                    noSnap={true}
                                    row={false}
                                />
                            </View>

                            <TouchableOpacity
                                style={{
                                    backgroundColor: accentColor,
                                    width: '100%',
                                    height: 54,
                                    borderRadius: 16,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginTop: 20
                                }}
                                onPress={() => setShowColorPicker(false)}
                            >
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Set Color</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Regional */}
                <Text style={[styles.sectionHeader, { color: themeColors.textSecondary }]}>Currency</Text>
                <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border, padding: 0 }]}>
                    <View style={{ padding: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                            <View style={[styles.iconBox, { backgroundColor: themeColors.background }]}>
                                <Languages size={18} color={accentColor} />
                            </View>
                            <Text style={[styles.settingTitle, { color: themeColors.text }]}>Default Currency</Text>
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



                {/* Backup & Restore */}
                <Text style={[styles.sectionHeader, { color: themeColors.textSecondary }]}>Backup & Restore</Text>
                <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border, padding: 0 }]}>
                    {renderSettingItem(
                        <Download size={18} color={accentColor} />,
                        "Export Data (Excel)",
                        "",
                        handleExportExcel
                    )}
                    {renderSettingItem(
                        <FileText size={18} color={accentColor} />,
                        "Import Data (Excel)",
                        "",
                        handleImportExcel
                    )}
                    <View style={styles.divider} />
                    {renderSettingItem(
                        <Zap size={18} color={accentColor} />,
                        "Create Backup (JSON)",
                        "",
                        handleCreateBackup
                    )}
                    {renderSettingItem(
                        <Database size={18} color={accentColor} />,
                        "Restore Backup (JSON)",
                        "",
                        handleRestoreBackup
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
                <Text style={{ textAlign: 'center', color: themeColors.textSecondary, fontSize: 12 }}>Developed by Talha Bajwa</Text>
                <Text style={{ textAlign: 'center', color: themeColors.textSecondary, fontSize: 12 }}>© All Rights Reserved</Text>
            </ScrollView>

            {renderSelectionModal()}
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

    // Color/Currency/Chip
    colorCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    currencyChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, marginRight: 8 },
    optionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginRight: 8, minWidth: 80, alignItems: 'center' },
});

export default SettingsScreen;
