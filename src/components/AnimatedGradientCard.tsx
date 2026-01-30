import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AnimatedGradientCardProps {
    children: React.ReactNode;
    primaryColor: string;
    style?: ViewStyle;
}

export const AnimatedGradientCard: React.FC<AnimatedGradientCardProps> = ({ children, primaryColor, style }) => {
    // Fallback to static gradient to prevent native crashes
    const color1 = primaryColor;
    // Calculate a secondary color (simple shift) or just use a fixed one
    // A nice darker shade for any accent color is usually good.
    // Or just use the transparent trick I used before.
    const color2 = primaryColor + 'CC'; // 80% opacity

    return (
        <LinearGradient
            colors={[color1, '#1e1b4b']} // Mixing with dark blue/indigo for depth
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.card, style]}
        >
            {children}
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        padding: 24,
        minHeight: 180,
    }
});
