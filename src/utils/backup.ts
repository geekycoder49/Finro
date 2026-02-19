import { Alert, Share, Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { getFinroFolderUri } from './storage';
import {
    getAccounts, getTransactions, clearAllData, wipeDatabase,
    getAllSettings, restoreSetting,
    getAllNAVHistory, addNAVHistoryEntry,
    restoreAccount, restoreTransaction
} from '../db/database';

export const createBackup = async () => {
    try {
        const accounts = getAccounts();
        const transactions = getTransactions(100000); // Get all transactions (limit raised safe enough)
        const settings = getAllSettings();
        const navHistory = getAllNAVHistory();

        const backupData = {
            version: '1.1',
            timestamp: new Date().toISOString(),
            accounts,
            transactions,
            settings,
            navHistory
        };

        const jsonString = JSON.stringify(backupData, null, 2);
        const fileName = `Finro_Backup_${new Date().toISOString().split('T')[0]}.json`;

        if (Platform.OS === 'web') {
            // Web download
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.click();
            URL.revokeObjectURL(url);
        } else {
            // Mobile - save and share
            const fileUri = `${FileSystem.documentDirectory}${fileName}`;
            await FileSystem.writeAsStringAsync(fileUri, jsonString);

            if (Platform.OS === 'android') {
                const folderUri = await getFinroFolderUri();
                if (folderUri) {
                    const safUri = await FileSystem.StorageAccessFramework.createFileAsync(
                        folderUri,
                        fileName,
                        'application/json'
                    );
                    await FileSystem.writeAsStringAsync(safUri, jsonString, { encoding: FileSystem.EncodingType.UTF8 });
                } else {
                    await Sharing.shareAsync(fileUri);
                }
            } else {
                await Sharing.shareAsync(fileUri);
            }
        }

        return true;
    } catch (error) {
        console.error('Backup error:', error);
        return false;
    }
};

export const restoreBackup = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: 'application/json',
            copyToCacheDirectory: true,
        });

        if (result.canceled) {
            return false;
        }

        const fileUri = result.assets[0].uri;
        const fileContent = await FileSystem.readAsStringAsync(fileUri);
        const backupData = JSON.parse(fileContent);

        // Validate backup structure
        if (!backupData.accounts || !backupData.transactions) {
            Alert.alert('Error', 'Invalid backup file format. Missing core data.');
            return false;
        }

        return new Promise((resolve) => {
            Alert.alert(
                'Restore Backup',
                `This will replace ALL current data with backup from ${new Date(backupData.timestamp || Date.now()).toLocaleDateString()}. \n\nAre you sure completely different data will be lost?`,
                [
                    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                    {
                        text: 'Restore & Replace',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                // 1. Clear existing data
                                wipeDatabase();

                                // 2. Restore Settings
                                if (backupData.settings && Array.isArray(backupData.settings)) {
                                    for (const s of backupData.settings) {
                                        restoreSetting(s.key, s.value);
                                    }
                                }

                                // 3. Restore Accounts (using raw restore to preserve IDs)
                                for (const acc of backupData.accounts) {
                                    restoreAccount(acc);
                                }

                                // 4. Restore Transactions (using raw restore to preserve IDs)
                                for (const trans of backupData.transactions) {
                                    restoreTransaction(trans);
                                }

                                // 5. Restore NAV History
                                if (backupData.navHistory && Array.isArray(backupData.navHistory)) {
                                    for (const h of backupData.navHistory) {
                                        addNAVHistoryEntry(h.accountId, h.nav, h.date);
                                    }
                                }

                                // Alert removed, handled by Settings screen toast
                                resolve(true);
                            } catch (error) {
                                console.error('Restore error:', error);
                                resolve(false);
                            }
                        },
                    },
                ]
            );
        });
    } catch (error) {
        console.error('Restore error:', error);
        return false;
    }
};
