import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

export default function Header({ title, showBack, onBack, rightIcon, onRight }) {
    return (
        <View style={styles.container}>
            <View style={styles.row}>
                {showBack ? (
                    <TouchableOpacity onPress={onBack} style={styles.sideBtn}>
                        <Text style={styles.backText}>← Назад</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.sideBtn} />
                )}
                <Text style={styles.title}>{title}</Text>
                {rightIcon ? (
                    <TouchableOpacity onPress={onRight} style={styles.sideBtn}>
                        <Text style={styles.rightText}>···</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.sideBtn} />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: 48,
        paddingBottom: SPACING.md,
        paddingHorizontal: SPACING.lg,
        backgroundColor: COLORS.bgPrimary,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { ...FONTS.subtitle, fontSize: 18, flex: 1, textAlign: 'center', color: COLORS.textPrimary },
    sideBtn: { width: 60, alignItems: 'flex-start' },
    backText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
    rightText: { fontSize: 20, color: COLORS.textSecondary, letterSpacing: 2 },
});
