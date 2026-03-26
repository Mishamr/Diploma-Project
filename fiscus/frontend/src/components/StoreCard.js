import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from './Icon';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { getChainColor } from '../constants/stores';

export default function StoreCard({ store, onPress }) {
    const chainColor = getChainColor(store.chain_slug);
    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
            <View style={[styles.accent, { backgroundColor: chainColor }]} />
            <View style={styles.icon}>
                <Icon name="storefront" size={22} color={chainColor} />
            </View>
            <View style={styles.info}>
                <Text style={styles.name}>{store.name}</Text>
                <Text style={styles.chain}>{store.chain}</Text>
                {store.address && <Text style={styles.address} numberOfLines={1}>{store.address}</Text>}
            </View>
            {store.distance_km != null && (
                <View style={styles.distance}>
                    <Text style={styles.distText}>{store.distance_km.toFixed(1)}</Text>
                    <Text style={styles.distUnit}>РєРј</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.borderLight, overflow: 'hidden', ...SHADOWS.card },
    accent: { width: 4, alignSelf: 'stretch' },
    icon: { width: 44, height: 44, borderRadius: RADIUS.sm, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginLeft: SPACING.md },
    info: { flex: 1, paddingVertical: SPACING.md, paddingLeft: SPACING.md },
    name: { ...FONTS.medium, fontSize: 14 },
    chain: { ...FONTS.caption, marginTop: 1 },
    address: { ...FONTS.caption, color: COLORS.textDark, marginTop: 2, fontSize: 11 },
    distance: { alignItems: 'center', paddingRight: SPACING.md },
    distText: { color: COLORS.primaryLight, fontWeight: '700', fontSize: 16 },
    distUnit: { ...FONTS.caption, fontSize: 10 },
});

