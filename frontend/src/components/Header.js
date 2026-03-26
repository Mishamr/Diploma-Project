import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from './Icon';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function Header({ title, showBack, onBack, rightIcon, onRight }) {
    const { user } = useAuth();
    return (
        <LinearGradient colors={[COLORS.bgSecondary, COLORS.bgPrimary]} style={styles.container}>
            <View style={styles.row}>
                {showBack ? (
                    <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
                        <Icon name="arrow-back" size={22} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.iconBtn} />
                )}
                <Text style={styles.title}>{title}</Text>
                {rightIcon ? (
                    <TouchableOpacity onPress={onRight} style={styles.iconBtn}>
                        <Icon name={rightIcon} size={22} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.iconBtn} />
                )}
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { paddingTop: 48, paddingBottom: SPACING.md, paddingHorizontal: SPACING.lg },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { ...FONTS.subtitle, fontSize: 18, flex: 1, textAlign: 'center' },
    iconBtn: { width: 36, alignItems: 'center' },
});

