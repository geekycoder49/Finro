import React, { useRef } from 'react';
import { View, StyleSheet, ScrollView, Platform, StatusBar, Animated, Easing } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';

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
    const { animationType } = useSettingsStore();
    const { themeColors } = useTheme();

    // Animation values
    const animValue = useRef(new Animated.Value(0)).current;

    useFocusEffect(
        React.useCallback(() => {
            // Reset to state 0 (hidden/start)
            animValue.setValue(0);

            // Animate to state 1 (visible/end)
            Animated.timing(animValue, {
                toValue: 1,
                duration: 300,
                easing: Easing.out(Easing.poly(4)),
                useNativeDriver: true,
            }).start();
        }, [animationType]) // re-run if type changes, though unlikely during focus
    );

    // Dynamic Interpolations based on Type
    const getAnimatedStyle = () => {
        const opacity = animValue.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

        switch (animationType) {
            case 'Slide Up':
                return {
                    opacity,
                    transform: [{
                        translateY: animValue.interpolate({ inputRange: [0, 1], outputRange: [50, 0] })
                    }]
                };
            case 'Slide Down':
                return {
                    opacity,
                    transform: [{
                        translateY: animValue.interpolate({ inputRange: [0, 1], outputRange: [-50, 0] })
                    }]
                };
            case 'Slide Left': // Comes FROM right
                return {
                    opacity,
                    transform: [{
                        translateX: animValue.interpolate({ inputRange: [0, 1], outputRange: [50, 0] })
                    }]
                };
            case 'Slide Right': // Comes FROM left
                return {
                    opacity,
                    transform: [{
                        translateX: animValue.interpolate({ inputRange: [0, 1], outputRange: [-50, 0] })
                    }]
                };
            case 'Zoom In':
                return {
                    opacity,
                    transform: [{
                        scale: animValue.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] })
                    }]
                };
            case 'Zoom Out':
                return {
                    opacity,
                    transform: [{
                        scale: animValue.interpolate({ inputRange: [0, 1], outputRange: [1.1, 1] })
                    }]
                };
            case 'Rotate':
                return {
                    opacity,
                    transform: [{
                        rotate: animValue.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '0deg'] }),
                        scale: animValue.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] })
                    }]
                };
            case 'Bounce':
                // Simulating bounce with a simple spring-like oversized scale if using timing
                // Or separate easing. For now, just Zoom In logic.
                return {
                    opacity,
                    transform: [{
                        scale: animValue.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] })
                    }]
                };
            case 'Fade':
            default:
                return { opacity };
        }
    };

    const Content = scroll ? ScrollView : View;
    const contentProps = scroll ? {
        showsVerticalScrollIndicator: false,
        contentContainerStyle: [styles.scrollContent, noPadding ? { paddingHorizontal: 0 } : {}]
    } : {};

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            {!fullScreen ? <View style={{ height: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 60 }} /> : null}
            <Animated.View style={[{ flex: 1 }, getAnimatedStyle()]}>
                <Content
                    style={[styles.content, noPadding ? { paddingHorizontal: 0 } : {}]}
                    {...contentProps}
                >
                    {children}
                    {scroll ? <View style={{ height: 4 }} /> : null}
                </Content>
            </Animated.View>
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
        paddingBottom: 4,
    },
});
