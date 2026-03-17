/**
 * Map screen вЂ” stores on map with chain filter.
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Dimensions,
    Platform,
} from 'react-native';
// react-native-maps is not supported on web — load conditionally
const MapView = Platform.OS !== 'web' ? require('react-native-maps').default : null;
const Marker = Platform.OS !== 'web' ? require('react-native-maps').Marker : null;
const PROVIDER_GOOGLE = Platform.OS !== 'web' ? require('react-native-maps').PROVIDER_GOOGLE : null;
import Icon from '../components/Icon';
import { useGeoStore } from '../stores';
import { useLocation } from '../hooks';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import { CHAINS, getChainColor } from '../constants/stores';

const { width, height } = Dimensions.get('window');
const MAP_HEIGHT = height * 0.55;

export default function MapScreen() {
    const { location, loading: locLoading } = useLocation();
    const { mapStores, nearbyStores, fetchMapStores, fetchNearby } = useGeoStore();
    const [selectedChain, setSelectedChain] = useState(null);

    useEffect(() => {
        fetchMapStores(selectedChain);
    }, [selectedChain]);

    useEffect(() => {
        if (location) {
            fetchNearby(location.latitude, location.longitude);
        }
    }, [location]);

    const initialRegion = location
        ? {
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
        }
        : {
            latitude: 50.4501,
            longitude: 30.5234,
            latitudeDelta: 0.15,
            longitudeDelta: 0.15,
        };

    return (
        <View style={styles.container}>
            {/* Map */}
            <View style={styles.mapContainer}>
                {locLoading ? (
                    <View style={styles.loadingMap}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Р’РёР·РЅР°С‡Р°С”С‚СЊСЃСЏ РјС–СЃС†РµР·РЅР°С…РѕРґР¶РµРЅРЅСЏ...</Text>
                    </View>
                ) : Platform.OS === 'web' ? (
                    <View style={styles.loadingMap}>
                        <Icon name="map-outline" size={48} color={COLORS.primaryLight} />
                        <Text style={styles.loadingText}>РљР°СЂС‚Р° С‚РёРјС‡Р°СЃРѕРІРѕ РЅРµРґРѕСЃС‚СѓРїРЅР° РЅР° РІРµР±-РІРµСЂСЃС–С—</Text>
                        <Text style={[styles.loadingText, { fontSize: 12, marginTop: 4 }]}>
                            Р—Р°РІР°РЅС‚Р°Р¶С‚Рµ Р·Р°СЃС‚РѕСЃСѓРЅРѕРє РЅР° РјРѕР±С–Р»СЊРЅРёР№ РїСЂРёСЃС‚СЂС–Р№ РґР»СЏ РїРµСЂРµРіР»СЏРґСѓ РєР°СЂС‚Рё
                        </Text>
                    </View>
                ) : (
                    <MapView
                        style={styles.map}
                        initialRegion={initialRegion}
                        showsUserLocation
                        showsMyLocationButton
                    >
                        {mapStores.map((store) => (
                            <Marker
                                key={store.id}
                                coordinate={{
                                    latitude: store.latitude,
                                    longitude: store.longitude,
                                }}
                                title={store.name}
                                description={store.address || store.chain}
                                pinColor={getChainColor(store.chain_slug)}
                            />
                        ))}
                    </MapView>
                )}
            </View>

            {/* Chain filter */}
            <FlatList
                horizontal
                data={[{ slug: null, name: 'РЈСЃС–', icon: 'рџ“Ќ' }, ...CHAINS]}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.chainChip,
                            selectedChain === item.slug && styles.chainChipActive,
                        ]}
                        onPress={() => setSelectedChain(item.slug)}
                    >
                        <Text style={styles.chipIcon}>{item.icon}</Text>
                        <Text style={[
                            styles.chipText,
                            selectedChain === item.slug && styles.chipTextActive,
                        ]}>
                            {item.name}
                        </Text>
                    </TouchableOpacity>
                )}
                keyExtractor={(item) => item.slug || 'all'}
                showsHorizontalScrollIndicator={false}
                style={styles.chipList}
                contentContainerStyle={{ paddingHorizontal: SPACING.lg }}
            />

            {/* Nearby stores list */}
            <FlatList
                data={nearbyStores.slice(0, 5)}
                renderItem={({ item }) => (
                    <View style={styles.storeCard}>
                        <View style={styles.storeIcon}>
                            <Icon name="storefront" size={20} color={COLORS.primary} />
                        </View>
                        <View style={styles.storeInfo}>
                            <Text style={styles.storeName}>{item.name}</Text>
                            <Text style={styles.storeChain}>{item.chain}</Text>
                        </View>
                        <View style={styles.storeDistance}>
                            <Text style={styles.distanceText}>
                                {item.distance_km?.toFixed(1)} РєРј
                            </Text>
                        </View>
                    </View>
                )}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.storeList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>РќР°Р№Р±Р»РёР¶С‡С– РјР°РіР°Р·РёРЅРё Р·Р°РІР°РЅС‚Р°Р¶СѓСЋС‚СЊСЃСЏ...</Text>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bgPrimary,
    },
    mapContainer: {
        height: MAP_HEIGHT,
        overflow: 'hidden',
    },
    map: {
        flex: 1,
    },
    loadingMap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.bgSecondary,
    },
    loadingText: {
        ...FONTS.caption,
        marginTop: SPACING.md,
    },
    chipList: {
        marginVertical: SPACING.sm,
        maxHeight: 45,
    },
    chainChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        marginRight: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    chainChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    chipIcon: { fontSize: 14, marginRight: 4 },
    chipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
    chipTextActive: { color: COLORS.white },
    storeList: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.xxl,
    },
    storeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    storeIcon: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    storeInfo: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    storeName: {
        ...FONTS.medium,
        fontSize: 14,
    },
    storeChain: {
        ...FONTS.caption,
        marginTop: 1,
    },
    storeDistance: {
        paddingLeft: SPACING.sm,
    },
    distanceText: {
        color: COLORS.primaryLight,
        fontWeight: '600',
        fontSize: 13,
    },
    emptyText: {
        ...FONTS.caption,
        textAlign: 'center',
        marginTop: SPACING.lg,
    },
});

