/**
 * NearbyStoreBanner — живий банер "Найближчий магазин".
 * Використовує watchPosition (useLocation), рахує відстань до магазинів
 * з GeoStore і показує найближчий з кнопкою "Прокласти маршрут".
 */

import React, { useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Linking,
    Platform,
    Animated,
    ActivityIndicator,
} from 'react-native';
import Icon from './Icon';
import { useLocation } from '../hooks';
import { useGeoStore } from '../stores';
import { useSettings } from '../context/SettingsContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { getChainColor } from '../constants/stores';

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
}



function openNavigation(lat, lon, name) {
    const url = Platform.select({
        ios: `maps:0,0?q=${encodeURIComponent(name)}@${lat},${lon}`,
        android: `geo:0,0?q=${lat},${lon}(${encodeURIComponent(name)})`,
        default: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
    });
    Linking.openURL(url).catch(() => {});
}

const CHAIN_EMOJI = { atb: '🔴', silpo: '🟠', auchan: '🟢', metro: '🔵', novus: '🟣', fora: '🟤' };

export default function NearbyStoreBanner({ onPressMap }) {
    const { location, loading: locLoading } = useLocation();
    const { mapStores, fetchMapStores } = useGeoStore();
    const { enabledChains } = useSettings();

    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        fetchMapStores();
    }, []);

    // Pulse animation for the dot
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    // Find nearest store from live location
    const nearest = useMemo(() => {
        if (!location) return null;
        const stores = (mapStores || [])
            .filter((s) => s.latitude && s.longitude && enabledChains[s.chain_slug] !== false);

        if (!stores.length) return null;

        const withDist = stores
            .map((s) => ({
                ...s,
                dist: haversine(location.latitude, location.longitude, s.latitude, s.longitude),
            }))
            .filter((s) => s.dist <= 2.0)
            .sort((a, b) => a.dist - b.dist);

        return withDist[0] || null;
    }, [location, mapStores]);

    // Format distance
    const distText = nearest
        ? nearest.dist < 1
            ? `${Math.round(nearest.dist * 1000)} м`
            : `${nearest.dist.toFixed(1)} км`
        : null;

    const accentColor = nearest ? getChainColor(nearest.chain_slug) || COLORS.primary : COLORS.primary;

    if (locLoading) {
        return (
            <View style={styles.banner}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.locatingText}>Визначаємо місцезнаходження...</Text>
            </View>
        );
    }

    if (!nearest) return null;

    return (
        <TouchableOpacity
            style={styles.banner}
            onPress={onPressMap}
            activeOpacity={0.82}
        >
            {/* Live pulse dot */}
            <View style={styles.dotWrap}>
                <Animated.View
                    style={[
                        styles.dotPulse,
                        { backgroundColor: accentColor + '33', transform: [{ scale: pulseAnim }] },
                    ]}
                />
                <View style={[styles.dot, { backgroundColor: accentColor }]} />
            </View>

            {/* Info */}
            <View style={styles.info}>
                <View style={styles.topRow}>
                    <Text style={styles.emoji}>
                        {CHAIN_EMOJI[nearest.chain_slug] || '🏪'}
                    </Text>
                    <Text style={styles.name} numberOfLines={1}>{nearest.name}</Text>
                </View>
                <Text style={styles.address} numberOfLines={1}>
                    {nearest.address || nearest.chain}
                </Text>
            </View>

            {/* Distance + navigate */}
            <View style={styles.right}>
                <View style={[styles.distBadge, { backgroundColor: accentColor + '18', borderColor: accentColor + '40' }]}>
                    <Icon name="navigate" size={11} color={accentColor} />
                    <Text style={[styles.distText, { color: accentColor }]}>{distText}</Text>
                </View>
                <TouchableOpacity
                    style={styles.navBtn}
                    onPress={() => openNavigation(nearest.latitude, nearest.longitude, nearest.name)}
                    hitSlop={10}
                >
                    <Icon name="map-outline" size={16} color={COLORS.primary} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm + 2,
        marginTop: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: SPACING.sm,
        ...SHADOWS.card,
    },
    locatingText: { ...FONTS.caption, marginLeft: SPACING.sm, color: COLORS.textMuted },

    dotWrap: { width: 20, height: 20, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    dotPulse: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderRadius: 10,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: '#fff',
    },

    info: { flex: 1, minWidth: 0 },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    emoji: { fontSize: 14 },
    name: { ...FONTS.bold, fontSize: 13, flex: 1 },
    address: { ...FONTS.caption, fontSize: 11, marginTop: 1, color: COLORS.textMuted },

    right: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flexShrink: 0 },
    distBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        borderRadius: RADIUS.full,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
    },
    distText: { fontSize: 11, fontWeight: '700' },
    navBtn: {
        width: 30,
        height: 30,
        borderRadius: RADIUS.sm,
        backgroundColor: 'rgba(139,92,246,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(139,92,246,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
