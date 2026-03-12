/**
 * StoreChip — compact horizontal chip for store/category selection.
 */

import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

export default function StoreChip({ chain, selected, onPress }) {
    return (
        <TouchableOpacity
            style={[styles.chip, selected && styles.chipActive]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {chain.icon ? (
                <Text style={styles.icon}>{chain.icon}</Text>
            ) : null}
            <Text style={[styles.name, selected && styles.nameActive]}>
                {chain.name}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.glass,
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.md,
        paddingVertical: 6,
        marginRight: SPACING.xs,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        gap: 4,
    },
    chipActive: {
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        borderColor: COLORS.primary,
    },
    icon: {
        fontSize: 14,
    },
    name: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    nameActive: {
        color: COLORS.primary,
    },
});
