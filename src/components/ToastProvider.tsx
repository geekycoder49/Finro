import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform, useColorScheme } from 'react-native';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [visible, setVisible] = useState(false);
    const [message, setMessage] = useState('');
    const [type, setType] = useState<ToastType>('success');
    const { theme } = useSettingsStore();
    const systemColorScheme = useColorScheme();
    const isDarkMode = theme === 'system' ? systemColorScheme === 'dark' : theme === 'dark';
    const themeColors = isDarkMode ? DARK_THEME : LIGHT_THEME;

    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    const showToast = (msg: string, t: ToastType = 'success') => {
        setMessage(msg);
        setType(t);
        setVisible(true);

        Animated.parallel([
            Animated.timing(translateY, {
                toValue: 50,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();

        setTimeout(hideToast, 3500);
    };

    const hideToast = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -100,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start(() => setVisible(false));
    };

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle2 size={20} color="#10B981" />;
            case 'error': return <AlertCircle size={20} color="#EF4444" />;
            case 'info': return <Info size={20} color="#3B82F6" />;
        }
    };

    const getBorderColor = () => {
        switch (type) {
            case 'success': return '#10B98140';
            case 'error': return '#EF444440';
            case 'info': return '#3B82F640';
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {visible ? (
                <Animated.View style={[
                    styles.toastContainer,
                    {
                        transform: [{ translateY }],
                        opacity,
                        backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
                        borderColor: getBorderColor(),
                        shadowColor: "#000",
                    }
                ]}>
                    <View style={styles.content}>
                        <View style={styles.iconWrapper}>
                            {getIcon()}
                        </View>
                        <Text style={[styles.message, { color: themeColors.text }]}>{message}</Text>
                    </View>
                </Animated.View>
            ) : null}
        </ToastContext.Provider>
    );
};

const styles = StyleSheet.create({
    toastContainer: {
        position: 'absolute',
        top: 0,
        left: 20,
        right: 20,
        zIndex: 9999,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconWrapper: {
        marginRight: 12,
    },
    message: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
        lineHeight: 20,
    },
});
