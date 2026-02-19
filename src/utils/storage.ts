import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { useSettingsStore } from '../store/useSettingsStore';

/**
 * Robust SAF Folder Management
 * Ensures a persistent "Finro" folder exists and reuses permissions.
 */
export const getFinroFolderUri = async () => {
    if (Platform.OS !== 'android') return null;

    const { storageUri, setStorageUri } = useSettingsStore.getState();

    let baseDirUri = storageUri;

    // 1. If we don't have a saved URI, ask the user to pick a base directory (e.g., Documents)
    if (!baseDirUri) {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) return null;
        baseDirUri = permissions.directoryUri;
        setStorageUri(baseDirUri);
    }

    try {
        // 2. See if "Finro" folder already exists within that base directory
        const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(baseDirUri);

        // Improved detection for existing Finro folder
        const existingFolder = files.find(f => {
            const decoded = decodeURIComponent(f);
            return decoded.endsWith('/Finro') || decoded.endsWith(':Finro') || decoded.endsWith('%2FFinro');
        });

        if (existingFolder) {
            return existingFolder;
        }

        // 3. If not found, create the "Finro" folder once
        const newFolderUri = await FileSystem.StorageAccessFramework.makeDirectoryAsync(baseDirUri, 'Finro');
        return newFolderUri;
    } catch (error) {
        console.warn('SAF Access Error (possibly revoked):', error);
        // If access fails (maybe user uninstalled/cleared), reset and try one more permission request
        setStorageUri(null);
        return null;
    }
};
