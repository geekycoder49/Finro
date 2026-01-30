import React from 'react';
import { View, StyleSheet, ScrollView, Platform, StatusBar } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';

interface ScreenWrapperProps {
    children: React.ReactNode;
    scroll?: boolean;
    fullScreen?: boolean;
    noPadding?: boolean;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
    children,
    scroll = true,
    fullScreen = false,
    noPadding = false
}) => {
    const { theme } = useSettingsStore();
    const themeColors = theme === 'dark' ? DARK_THEME : LIGHT_THEME;

    const Content = scroll ? ScrollView : View;
    const contentProps = scroll ? {
        showsVerticalScrollIndicator: false,
        contentContainerStyle: [styles.scrollContent, noPadding ? { paddingHorizontal: 0 } : {}]
    } : {};

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            {!fullScreen && <View style={{ height: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 40 : 60 }} />}
            <Content
                style={[styles.content, noPadding ? { paddingHorizontal: 0 } : {}]}
                {...contentProps}
            >
                {children}
                {scroll ? <View style={{ height: 20 }} /> : null}
            </Content>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    scrollContent: {
        paddingBottom: 20,
    },
});
