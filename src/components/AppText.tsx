import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';

export const AppText: React.FC<TextProps> = (props) => {
    const { fontFamily } = useSettingsStore();

    // Merge provided style with font family
    const fontStyle = fontFamily === 'System' ? {} : { fontFamily };

    return (
        <Text
            {...props}
            style={[fontStyle, props.style]}
        >
            {props.children}
        </Text>
    );
};
