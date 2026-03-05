import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import Icon from './Icon';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

const TYPES = {
    success: { bg: COLORS.accent, icon: 'checkmark-circle' },
    error: { bg: COLORS.error, icon: 'alert-circle' },
    warning: { bg: COLORS.warning, icon: 'warning' },
    info: { bg: COLORS.info, icon: 'information-circle' },
};

export default function StatusBanner({ message, type = 'info', visible = false, duration = 3000, onHide }) {
    const translateY = useRef(new Animated.Value(-80)).current;

    useEffect(() => {
        if (visible) {
            Animated.sequence([
                Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
                Animated.delay(duration),
                Animated.timing(translateY, { toValue: -80, duration: 300, useNativeDriver: true }),
            ]).start(() => onHide?.());
        }
    }, [visible]);

    const config = TYPES[type] || TYPES.info;
    return (
        <Animated.View style={[styles.container, { backgroundColor: config.bg, transform: [{ translateY }] }]}>
            <Icon name={config.icon} size={20} color="#fff" />
            <Text style={styles.text}>{message}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingTop: 48, paddingBottom: SPACING.md, paddingHorizontal: SPACING.lg, gap: SPACING.sm, zIndex: 999 },
    text: { color: '#fff', fontWeight: '600', fontSize: 14, flex: 1 },
});

