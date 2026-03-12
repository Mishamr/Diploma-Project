/**
 * GlassCard — reusable glassmorphism card container.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';

export default function GlassCard({ children, style, glow = false }) {
    return (
        <View style={[styles.card, glow && SHADOWS.glow, style]}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.glass,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        borderRadius: RADIUS.lg,
        padding: 16,
        ...SHADOWS.card,
    },
});
