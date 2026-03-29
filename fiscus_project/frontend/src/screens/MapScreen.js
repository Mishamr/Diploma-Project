/**
 * MapScreen — інтерактивна карта магазинів.
 * На веб: Leaflet.js через iframe (OpenStreetMap).
 * На мобайл: react-native-maps.
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ScrollView,
    ActivityIndicator,
    Platform,
    Linking,
} from 'react-native';

const MapView = Platform.OS !== 'web' ? require('react-native-maps').default : null;
const Marker  = Platform.OS !== 'web' ? require('react-native-maps').Marker  : null;

import Icon from '../components/Icon';
import { useGeoStore } from '../stores';
import { useLocation } from '../hooks';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import { CHAINS, getChainColor } from '../constants/stores';

// ── Demo магазини (показуємо якщо БД порожня) ─────────────────────────────────
const DEMO_STORES = [
    { id: 1, name: 'АТБ Центральний',    chain: 'АТБ',    chain_slug: 'atb',    latitude: 50.4501, longitude: 30.5234, address: 'вул. Хрещатик, 1',              distance_km: 0.3 },
    { id: 2, name: 'Сільпо Олімпійська', chain: 'Сільпо', chain_slug: 'silpo',  latitude: 50.4398, longitude: 30.5179, address: 'вул. Велика Васильківська, 55',  distance_km: 0.8 },
    { id: 3, name: 'Ашан Блокбастер',    chain: 'Ашан',   chain_slug: 'auchan', latitude: 50.4611, longitude: 30.4864, address: 'просп. Перемоги, 42',            distance_km: 1.5 },
    { id: 4, name: 'АТБ Шевченківський', chain: 'АТБ',    chain_slug: 'atb',    latitude: 50.4587, longitude: 30.5095, address: 'вул. Шевченка, 24',              distance_km: 1.8 },
    { id: 5, name: 'Сільпо Ocean Plaza', chain: 'Сільпо', chain_slug: 'silpo',  latitude: 50.4271, longitude: 30.5076, address: 'вул. Антоновича, 176',           distance_km: 2.3 },
    { id: 6, name: 'Ашан Ретровіль',     chain: 'Ашан',   chain_slug: 'auchan', latitude: 50.4450, longitude: 30.5700, address: 'вул. Братиславська, 12',         distance_km: 3.1 },
];

const CHAIN_ICONS = { atb: '🔴', silpo: '🟠', auchan: '🟢' };

// ── Відкрити Google Maps навігацію ────────────────────────────────────────────
function openNavigation(lat, lon, name) {
    const url = Platform.select({
        ios:     `maps:0,0?q=${encodeURIComponent(name)}@${lat},${lon}`,
        android: `geo:0,0?q=${lat},${lon}(${encodeURIComponent(name)})`,
        default: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}&query_place_id=${encodeURIComponent(name)}`,
    });
    Linking.openURL(url).catch(() => {});
}

// ── Leaflet HTML для iframe (веб карта) ───────────────────────────────────────
function buildLeafletHTML(stores, centerLat = 50.4501, centerLon = 30.5234) {
    const markers = stores.map(s => {
        const color = s.chain_slug === 'atb' ? '#ef4444'
            : s.chain_slug === 'silpo' ? '#f97316'
            : s.chain_slug === 'auchan' ? '#22c55e'
            : '#6366f1';
        const dist = s.distance_km != null ? `${s.distance_km.toFixed(1)} км` : '';
        const addr = s.address || s.chain;
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${s.latitude},${s.longitude}`;
        return `
L.marker([${s.latitude}, ${s.longitude}], {
  icon: L.divIcon({
    className: '',
    html: '<div style="background:${color};width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>',
    iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -10]
  })
}).addTo(map).bindPopup(
  '<div style="font-family:sans-serif;min-width:160px;">' +
  '<b style="font-size:14px;">${s.name}</b>' +
  '<br><span style="color:#888;font-size:12px;">${addr}</span>' +
  (${dist ? `'<br><span style="color:#22c55e;font-size:12px;font-weight:600;">📍 ${dist}</span>'` : "''"}) +
  '<br><a href="${mapsUrl}" target="_blank" style="display:inline-block;margin-top:6px;padding:4px 10px;background:#3b82f6;color:#fff;border-radius:6px;font-size:12px;text-decoration:none;">🗺 Прокласти маршрут</a>' +
  '</div>'
);`;
    }).join('\n');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html,body,#map { margin:0;padding:0;width:100%;height:100%;background:#0f172a; }
  .leaflet-popup-content-wrapper { border-radius: 10px; }
  .leaflet-tile { filter: brightness(0.88) saturate(0.75); }
</style>
</head>
<body>
<div id="map"></div>
<script>
var map = L.map('map', { zoomControl: true }).setView([${centerLat}, ${centerLon}], 13);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap &copy; CartoCDN',
  maxZoom: 19
}).addTo(map);
${markers}
</script>
</body>
</html>`;
}

export default function MapScreen() {
    const { location, loading: locLoading } = useLocation();
    const { mapStores, nearbyStores, fetchMapStores, fetchNearby } = useGeoStore();
    const [selectedChain, setSelectedChain] = useState(null);

    useEffect(() => { fetchMapStores(selectedChain); }, [selectedChain]);

    useEffect(() => {
        if (location) fetchNearby(location.latitude, location.longitude);
    }, [location]);

    const displayStores = (nearbyStores && nearbyStores.length > 0) ? nearbyStores : DEMO_STORES;
    const filteredStores = selectedChain
        ? displayStores.filter(s => (s.chain_slug || '').toLowerCase() === selectedChain)
        : displayStores;

    const centerLat = location?.latitude  || 50.4501;
    const centerLon = location?.longitude || 30.5234;
    const leafletHTML = buildLeafletHTML(filteredStores, centerLat, centerLon);

    const initialRegion = {
        latitude: centerLat, longitude: centerLon,
        latitudeDelta: 0.08, longitudeDelta: 0.08,
    };

    return (
        <View style={styles.container}>
            {/* Map */}
            <View style={styles.mapContainer}>
                {locLoading ? (
                    <View style={styles.mapCenter}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.mapCenterText}>Визначається місцезнаходження...</Text>
                    </View>
                ) : Platform.OS === 'web' ? (
                    <iframe
                        srcDoc={leafletHTML}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        title="Карта магазинів"
                        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                    />
                ) : (
                    <MapView
                        style={styles.map}
                        initialRegion={initialRegion}
                        showsUserLocation
                        showsMyLocationButton
                    >
                        {filteredStores.map(store => (
                            <Marker
                                key={store.id}
                                coordinate={{ latitude: store.latitude, longitude: store.longitude }}
                                title={store.name}
                                description={store.address || store.chain}
                                pinColor={getChainColor(store.chain_slug)}
                                onCalloutPress={() => openNavigation(store.latitude, store.longitude, store.name)}
                            />
                        ))}
                    </MapView>
                )}
            </View>

            {/* Chain filter */}
            <FlatList
                horizontal
                data={[{ slug: null, name: 'Усі', icon: '📍' }, ...CHAINS]}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.chainChip, selectedChain === item.slug && styles.chainChipActive]}
                        onPress={() => setSelectedChain(item.slug)}
                    >
                        <Text style={styles.chipIcon}>{item.icon}</Text>
                        <Text style={[styles.chipText, selectedChain === item.slug && styles.chipTextActive]}>
                            {item.name}
                        </Text>
                    </TouchableOpacity>
                )}
                keyExtractor={item => item.slug || 'all'}
                showsHorizontalScrollIndicator={false}
                style={styles.chipList}
                contentContainerStyle={{ paddingHorizontal: SPACING.lg }}
            />

            {/* Nearby stores list — scrollable */}
            <View style={styles.storeListWrapper}>
                <Text style={styles.sectionTitle}>
                    🏪 Найближчі магазини ({filteredStores.length})
                </Text>
                <ScrollView
                    showsVerticalScrollIndicator={Platform.OS === 'web'}
                    contentContainerStyle={styles.storeList}
                >
                    {filteredStores.length === 0 ? (
                        <Text style={styles.emptyText}>Магазини завантажуються...</Text>
                    ) : (
                        filteredStores.map(item => (
                            <TouchableOpacity
                                key={String(item.id)}
                                style={styles.storeCard}
                                onPress={() => openNavigation(item.latitude, item.longitude, item.name)}
                                activeOpacity={0.75}
                            >
                                <View style={[styles.storeIcon, { backgroundColor: (getChainColor(item.chain_slug) || '#6366f1') + '22' }]}>
                                    <Text style={{ fontSize: 20 }}>{CHAIN_ICONS[item.chain_slug] || '🏪'}</Text>
                                </View>
                                <View style={styles.storeInfo}>
                                    <Text style={styles.storeName}>{item.name}</Text>
                                    <Text style={styles.storeAddress}>{item.address || item.chain}</Text>
                                </View>
                                <View style={styles.storeRight}>
                                    {item.distance_km != null && (
                                        <View style={styles.distanceBadge}>
                                            <Icon name="navigate-outline" size={12} color={COLORS.accent} />
                                            <Text style={styles.distanceText}>{item.distance_km.toFixed(1)} км</Text>
                                        </View>
                                    )}
                                    <Icon name="chevron-forward" size={16} color={COLORS.textMuted} style={{ marginTop: 4 }} />
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                    <View style={{ height: 30 }} />
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: Platform.OS === 'web'
        ? { height: '100vh', backgroundColor: COLORS.bgPrimary, overflow: 'hidden', display: 'flex', flexDirection: 'column' }
        : { flex: 1, backgroundColor: COLORS.bgPrimary },
    mapContainer: Platform.OS === 'web'
        ? { height: '40%', overflow: 'hidden' }
        : { height: 280, overflow: 'hidden' },
    map: { flex: 1 },
    mapCenter: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        backgroundColor: COLORS.bgSecondary,
    },
    mapCenterText: { ...FONTS.caption, marginTop: SPACING.md },

    chipList: { marginVertical: SPACING.sm, maxHeight: 48, flexShrink: 0 },
    chainChip: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.bgCard, borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
        marginRight: SPACING.sm, borderWidth: 1, borderColor: COLORS.borderLight,
    },
    chainChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipIcon: { fontSize: 14, marginRight: 4 },
    chipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
    chipTextActive: { color: '#fff' },

    storeListWrapper: { flex: 1, overflow: 'hidden' },
    sectionTitle: {
        ...FONTS.sectionTitle,
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.sm,
        paddingBottom: SPACING.xs,
        flexShrink: 0,
    },
    storeList: { paddingHorizontal: SPACING.lg },
    storeCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
        padding: SPACING.md, marginBottom: SPACING.sm,
        borderWidth: 1, borderColor: COLORS.borderLight,
    },
    storeIcon: {
        width: 44, height: 44, borderRadius: RADIUS.sm,
        justifyContent: 'center', alignItems: 'center', flexShrink: 0,
    },
    storeInfo: { flex: 1, marginLeft: SPACING.md },
    storeName: { ...FONTS.medium, fontSize: 14 },
    storeAddress: { ...FONTS.caption, marginTop: 2, fontSize: 12 },
    storeRight: { alignItems: 'flex-end', paddingLeft: SPACING.sm },
    distanceBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        backgroundColor: COLORS.accent + '22', borderRadius: RADIUS.full,
        paddingHorizontal: 8, paddingVertical: 3,
    },
    distanceText: { color: COLORS.accent, fontWeight: '700', fontSize: 11 },
    emptyText: { ...FONTS.caption, textAlign: 'center', marginTop: SPACING.lg },
});
