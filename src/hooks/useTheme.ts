import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';

export const useTheme = () => {
    const { theme, accentColor } = useSettingsStore();
    const systemColorScheme = useColorScheme();

    const isDarkMode = theme === 'system'
        ? (systemColorScheme === 'dark')
        : theme === 'dark';
    const themeColors = isDarkMode ? DARK_THEME : LIGHT_THEME;

    return {
        theme,
        isDarkMode,
        themeColors,
        accentColor,
    };
};
