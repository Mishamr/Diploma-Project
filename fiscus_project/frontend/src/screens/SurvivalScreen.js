import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Animated, Platform, Linking, Alert } from 'react-native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../components/Icon';
import { useSurvivalStore } from '../stores';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import MapView, { Marker } from 'react-native-maps';

// Component for bouncing marker
const BouncingMarker = ({ store }) => {
    const bounceValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(bounceValue, {
                    toValue: -15,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(bounceValue, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const handlePress = () => {
        const url = Platform.select({
            ios: `maps:0,0?q=${store.name}@${store.lat},${store.lon}`,
            android: `geo:0,0?q=${store.lat},${store.lon}(${store.name})`,
            web: `https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lon}`
        });
        if (url) {
            Linking.openURL(url).catch(err => console.error('Error opening maps', err));
        }
    };

    return (
        <Marker coordinate={{ latitude: store.lat, longitude: store.lon }} onPress={handlePress}>
            <Animated.View style={{ transform: [{ translateY: bounceValue }] }}>
                <Icon name="location" size={40} color={COLORS.error} />
            </Animated.View>
        </Marker>
    );
};

export default function SurvivalScreen() {
    const { basket, loading, fetchSurvival } = useSurvivalStore();
    const [budget, setBudget] = useState(5000);
    const [days, setDays] = useState(7);
    const [showMap, setShowMap] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    fetchSurvival(budget, days);
                    return;
                }

                let location = await Location.getCurrentPositionAsync({});
                fetchSurvival(budget, days, location.coords.latitude, location.coords.longitude);
            } catch (err) {
                console.warn('Geolocation error:', err);
                fetchSurvival(budget, days);
            }
        })();
    }, [budget, days]);

    const mapStores = [];
    if (basket && basket.items) {
        const seen = new Set();
        basket.items.forEach(item => {
            if (item.lat && item.lon && !seen.has(item.store_id)) {
                seen.add(item.store_id);
                mapStores.push({
                    id: item.store_id,
                    name: item.store,
                    lat: item.lat,
                    lon: item.lon,
                });
            }
        });
    }

    const region = mapStores.length > 0 ? {
        latitude: mapStores[0].lat,
        longitude: mapStores[0].lon,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    } : null;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <LinearGradient colors={[COLORS.accent, COLORS.accentDark, '#064e3b']} style={styles.header}>
                <Icon name="shield-checkmark" size={32} color="#fff" />
                <Text style={styles.headerTitle}>Режим виживання</Text>
                <Text style={styles.headerSub}>Мінімальний бюджет на тиждень</Text>
            </LinearGradient>

            {/* Controls */}
            <View style={styles.controls}>
                <View style={styles.controlGroup}>
                    <Text style={styles.controlLabel}>Бюджет (₴)</Text>
                    <View style={styles.stepper}>
                        <TouchableOpacity onPress={() => setBudget(Math.max(500, budget - 500))} style={styles.stepBtn}>
                            <Icon name="remove" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                        <Text style={styles.stepValue}>{budget}</Text>
                        <TouchableOpacity onPress={() => setBudget(budget + 500)} style={styles.stepBtn}>
                            <Icon name="add" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.controlGroup}>
                    <Text style={styles.controlLabel}>Днів</Text>
                    <View style={styles.stepper}>
                        <TouchableOpacity onPress={() => setDays(Math.max(1, days - 1))} style={styles.stepBtn}>
                            <Icon name="remove" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                        <Text style={styles.stepValue}>{days}</Text>
                        <TouchableOpacity onPress={() => setDays(days + 1)} style={styles.stepBtn}>
                            <Icon name="add" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 40 }} />
            ) : basket ? (
                <>
                    {/* Total */}
                    <View style={styles.totalCard}>
                        <Text style={styles.totalLabel}>Загальна вартість</Text>
                        <Text style={styles.totalValue}>{basket.total_cost?.toFixed(2) || '0'} ₴</Text>
                        <Text style={styles.totalSub}>Бюджет: {budget} ₴ / {days} днів</Text>
                    </View>

                    {/* Items */}
                    {(basket.items || []).map((item, idx) => (
                        <View key={idx} style={styles.itemCard}>
                            <View style={styles.itemIcon}>
                                <Icon name="nutrition" size={20} color={COLORS.accent} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.itemName}>{item.name || item.product_name}</Text>
                                <Text style={styles.itemChain}>
                                    {item.chain || item.store}
                                    {item.distance_km ? ` • ${item.distance_km} км (~${Math.ceil(item.distance_km * 12)} хв пішки)` : ''}
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.itemPrice}>{item.price_per_unit?.toFixed(2)} ₴</Text>
                                {item.quantity && <Text style={styles.itemQty}>×{item.quantity}</Text>}
                            </View>
                        </View>
                    ))}

                    {/* Tips */}
                    {basket.tips && basket.tips.length > 0 && (
                        <View style={styles.tipsSection}>
                            <Text style={styles.tipsTitle}>🤖 AI Аналіз кошика</Text>
                            {basket.tips.map((tip, idx) => (
                                <Text key={idx} style={styles.tipText}>{tip}</Text>
                            ))}
                        </View>
                    )}

                    {/* Map Toggle & View */}
                    {mapStores.length > 0 && (
                        <View style={styles.mapSection}>
                            <TouchableOpacity
                                style={styles.mapToggle}
                                onPress={() => setShowMap(!showMap)}
                            >
                                <Icon name="map-outline" size={20} color={COLORS.primary} />
                                <Text style={styles.mapToggleText}>
                                    {showMap ? 'Сховати карту магазинів' : 'Показати магазини на карті'}
                                </Text>
                            </TouchableOpacity>

                            {showMap && (
                                <View style={styles.mapContainer}>
                                    {Platform.OS === 'web' ? (
                                        <View style={styles.loadingMap}>
                                            <Icon name="map-outline" size={48} color={COLORS.primaryLight} />
                                            <Text style={styles.loadingText}>Карта тимчасово недоступна на веб-версії</Text>
                                        </View>
                                    ) : (
                                        <MapView style={styles.map} initialRegion={region}>
                                            {mapStores.map((store) => (
                                                <BouncingMarker key={store.id} store={store} />
                                            ))}
                                        </MapView>
                                    )}
                                    <Text style={styles.mapHint}>📌 Натисніть на маркер (який скаче), щоб прокласти шлях в Google Maps</Text>
                                </View>
                            )}
                        </View>
                    )}
                </>
            ) : (
                <Text style={styles.emptyText}>Натисніть для генерації кошика</Text>
            )}
            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bgPrimary },
    header: { padding: SPACING.lg, alignItems: 'center' },
    headerTitle: { ...FONTS.title, color: '#fff', marginTop: SPACING.sm },
    headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
    controls: { flexDirection: 'row', paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, gap: SPACING.md },
    controlGroup: { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.borderLight },
    controlLabel: { ...FONTS.caption, marginBottom: 8 },
    stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
    stepBtn: { padding: 8, backgroundColor: COLORS.bgInput, borderRadius: RADIUS.sm },
    stepValue: { ...FONTS.bold, fontSize: 18, minWidth: 40, textAlign: 'center' },
    totalCard: { backgroundColor: COLORS.bgCard, margin: SPACING.lg, borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card },
    totalLabel: { ...FONTS.caption },
    totalValue: { fontSize: 36, fontWeight: '800', color: COLORS.accent, marginVertical: 4 },
    totalSub: { ...FONTS.caption, fontSize: 12 },
    itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.borderLight },
    itemIcon: { width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
    itemName: { ...FONTS.medium, fontSize: 14 },
    itemChain: { ...FONTS.caption, marginTop: 2 },
    itemPrice: { ...FONTS.price, fontSize: 14 },
    itemQty: { ...FONTS.caption, fontSize: 11 },
    tipsSection: { marginHorizontal: SPACING.lg, marginTop: SPACING.md, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.borderLight },
    tipsTitle: { ...FONTS.bold, marginBottom: 8 },
    tipText: { ...FONTS.regular, color: COLORS.textSecondary, marginBottom: 4, lineHeight: 20 },
    emptyText: { ...FONTS.caption, textAlign: 'center', marginTop: 60 },
    mapSection: { marginHorizontal: SPACING.lg, marginTop: SPACING.md, marginBottom: SPACING.lg },
    mapToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: SPACING.md, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.primaryLight, gap: SPACING.sm },
    mapToggleText: { ...FONTS.medium, color: COLORS.primary },
    mapContainer: { height: 300, marginTop: SPACING.sm, borderRadius: RADIUS.md, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.borderLight },
    map: { flex: 1 },
    loadingMap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgSecondary },
    loadingText: { ...FONTS.caption, marginTop: SPACING.md },
    mapHint: { ...FONTS.caption, textAlign: 'center', padding: 8, backgroundColor: COLORS.bgSecondary }
});

