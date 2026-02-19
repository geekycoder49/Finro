import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '../hooks/useTheme';

const { width } = Dimensions.get('window');

const CustomSplashScreen = () => {
    const { themeColors, accentColor } = useTheme();

    const logoScale = useRef(new Animated.Value(0.8)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const finroOpacity = useRef(new Animated.Value(0)).current;
    const finroTranslateY = useRef(new Animated.Value(20)).current;
    const sloganOpacity = useRef(new Animated.Value(0)).current;
    const sloganTranslateY = useRef(new Animated.Value(10)).current;

    useEffect(() => {
        Animated.sequence([
            // Logo Animation
            Animated.parallel([
                Animated.spring(logoScale, {
                    toValue: 1,
                    friction: 4,
                    useNativeDriver: true,
                }),
                Animated.timing(logoOpacity, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ]),
            // FINRO Text Animation
            Animated.parallel([
                Animated.timing(finroOpacity, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(finroTranslateY, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ]),
            // Slogan Animation
            Animated.parallel([
                Animated.timing(sloganOpacity, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(sloganTranslateY, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            <Animated.View style={{
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
                alignItems: 'center'
            }}>
                <Image
                    source={require('../../assets/splash-icon.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </Animated.View>

            <Animated.Text style={[
                styles.title,
                {
                    opacity: finroOpacity,
                    transform: [{ translateY: finroTranslateY }],
                    color: themeColors.text
                }
            ]}>
                FINRO
            </Animated.Text>

            <Animated.View style={{
                opacity: sloganOpacity,
                transform: [{ translateY: sloganTranslateY }],
                flexDirection: 'row',
                marginTop: 10
            }}>
                <Text style={[styles.slogan, { color: accentColor }]}>Track</Text>
                <Text style={[styles.sloganDot, { color: themeColors.textSecondary }]}> • </Text>
                <Text style={[styles.slogan, { color: accentColor }]}>Save</Text>
                <Text style={[styles.sloganDot, { color: themeColors.textSecondary }]}> • </Text>
                <Text style={[styles.slogan, { color: accentColor }]}>Grow</Text>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 20
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: 4,
        marginTop: 10
    },
    slogan: {
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.5
    },
    sloganDot: {
        fontSize: 14,
        fontWeight: '900'
    }
});

export default CustomSplashScreen;
