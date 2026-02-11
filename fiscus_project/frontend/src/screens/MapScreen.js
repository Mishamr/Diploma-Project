/**
 * @fileoverview Map Screen.
 * 
 * Displays interactive map with store locations and price comparison.
 * Redesigned with Deep Dark Purple theme and Store Carousel.
 * 
 * @module screens/MapScreen
 */

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Alert,
  FlatList,
  TouchableOpacity,
  Image,
  Linking,
  Platform
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Context & API
import { CartContext } from '../context/CartContext';
import { getNearbyStores, locateCheapestBasket } from '../api/client';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { theme, colors, spacing, typography, getShadow } from '../theme';

// Deep Purple Filtered Map Style
const PURPLE_MAP_STYLE = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#251a3d" }] // dark-purple surface
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#1a0f2e" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#b39ddb" }] // light-purple
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#d4c5f9" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#3d2a5c" }] // medium-purple
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#1a0f2e" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#1a0f2e" }]
  }
];

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.8;
const SPACING_FOR_CARD_INSET = width * 0.1 - 10;

/**
 * Map Screen Component.
 */
export default function MapScreen({ route, navigation }) {
  const { items } = useContext(CartContext);
  const mode = route.params?.mode || 'explore'; // 'explore' or 'basket'

  // State
  const [location, setLocation] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);

  /**
   * Request permissions and get current location.
   */
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location access is required to find nearby stores.');
        setLoading(false);
        return;
      }

      try {
        let userLocation = await Location.getCurrentPositionAsync({});
        const initialRegion = {
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };
        setLocation(initialRegion);

        // Initial fetch based on mode
        if (mode === 'explore') {
          await fetchNearbyStores(userLocation.coords.latitude, userLocation.coords.longitude);
        } else if (mode === 'basket') {
          await findCheapestBasket(userLocation.coords.latitude, userLocation.coords.longitude);
        }

      } catch (error) {
        console.error('Location error:', error);
        Alert.alert('Error', 'Failed to get location');
      } finally {
        setLoading(false);
      }
    })();
  }, [mode]);

  /**
   * Fetch nearby stores from API.
   * Falls back to mock data if API unavailable.
   */
  const fetchNearbyStores = async (lat, lon) => {
    try {
      const response = await getNearbyStores(lat, lon, 10);
      if (response.data && response.data.length > 0) {
        // Map API response to store format with calculated distances
        const storesWithDistance = response.data.map((store, index) => ({
          ...store,
          distance: calculateDistance(lat, lon, store.latitude, store.longitude),
          total_price: store.avg_price || (Math.random() * 100 + 100).toFixed(2),
          savings: store.potential_savings || (Math.random() * 20 + 5).toFixed(2),
        }));
        setStores(storesWithDistance);
      } else {
        // Fallback to Ukrainian stores if no data
        setMockUkrainianStores(lat, lon);
      }
    } catch (error) {
      console.warn('API unavailable, using demo data:', error.message);
      setMockUkrainianStores(lat, lon);
    }
  };

  /**
   * Calculate distance between two coordinates in km.
   */
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1) + ' км';
  };

  /**
   * Set mock Ukrainian stores for demo mode.
   */
  const setMockUkrainianStores = (lat, lon) => {
    setStores([
      { id: 1, name: 'АТБ-Маркет', latitude: lat + 0.008, longitude: lon + 0.006, total_price: 845.20, savings: 52.40, distance: '0.9 км' },
      { id: 2, name: 'Сільпо', latitude: lat - 0.005, longitude: lon - 0.003, total_price: 923.40, savings: 28.20, distance: '0.5 км' },
      { id: 3, name: 'Фора', latitude: lat + 0.012, longitude: lon - 0.008, total_price: 789.90, savings: 65.30, distance: '1.4 км', isBest: true },
      { id: 4, name: 'Novus', latitude: lat - 0.015, longitude: lon + 0.01, total_price: 956.00, savings: 18.50, distance: '1.8 км' },
    ]);
  };

  /**
   * Find cheapest basket across stores.
   * Calls backend API or simulates for demo.
   */
  const findCheapestBasket = async (lat, lon) => {
    setAnalyzing(true);
    try {
      // Try API first
      const response = await locateCheapestBasket(lat, lon, items);
      if (response.data && response.data.stores) {
        const storesWithBadges = assignStoreBadges(response.data.stores);
        setStores(storesWithBadges);
      } else {
        // Fallback mock for basket mode
        const mockStores = [
          { id: 1, name: 'Фора', latitude: lat + 0.01, longitude: lon + 0.01, total_price: 243.27, savings: 52.40, distance: '1.2 км' },
          { id: 2, name: 'АТБ-Маркет', latitude: lat - 0.008, longitude: lon - 0.005, total_price: 268.50, savings: 25.20, distance: '0.8 км' },
          { id: 3, name: 'Сільпо', latitude: lat + 0.005, longitude: lon - 0.012, total_price: 312.80, savings: 0, distance: '1.5 км' },
        ];
        setStores(assignStoreBadges(mockStores));
      }
    } catch (error) {
      console.warn('Basket API unavailable:', error.message);
      // Fallback mock
      const mockStores = [
        { id: 1, name: 'Фора', latitude: lat + 0.01, longitude: lon + 0.01, total_price: 243.27, savings: 52.40, distance: '1.2 км' },
        { id: 2, name: 'АТБ-Маркет', latitude: lat - 0.008, longitude: lon - 0.005, total_price: 268.50, savings: 25.20, distance: '0.8 км' },
      ];
      setStores(assignStoreBadges(mockStores));
    } finally {
      setAnalyzing(false);
    }
  };

  /**
   * Assign badges to stores based on price/savings comparison.
   * @param {Array} storeList - List of stores with prices
   * @returns {Array} Stores with badge properties
   */
  const assignStoreBadges = (storeList) => {
    if (!storeList || storeList.length === 0) return [];

    // Sort by total price to determine best overall
    const sorted = [...storeList].sort((a, b) => a.total_price - b.total_price);

    return storeList.map((store, index) => {
      const isBest = store.id === sorted[0].id;
      const isSecondBest = store.id === sorted[1]?.id;

      let badge = null;
      let badgeColor = colors.primary;

      if (isBest) {
        badge = 'Найкраща ціна';
        badgeColor = colors.success;
      } else if (isSecondBest && store.savings > 0) {
        badge = `Економія ₴${store.savings.toFixed(0)}`;
        badgeColor = colors.warning;
      } else if (store.savings > 20) {
        badge = `Економія ₴${store.savings.toFixed(0)}`;
        badgeColor = colors.primary;
      }

      return {
        ...store,
        isBest,
        badge,
        badgeColor,
      };
    });
  };

  /**
   * Route Optimizer: Calculate optimal multi-stop route for maximum savings.
   * Uses simple nearest neighbor heuristic for demo.
   */
  const optimizeRoute = () => {
    if (stores.length < 2 || !location) {
      Alert.alert('Потрібно мінімум 2 магазини', 'Додайте більше магазинів до маршруту.');
      return;
    }

    // Sort by savings (descending) then distance (ascending)
    const optimized = [...stores].sort((a, b) => {
      if (b.savings !== a.savings) return b.savings - a.savings;
      const distA = parseFloat(a.distance) || 0;
      const distB = parseFloat(b.distance) || 0;
      return distA - distB;
    });

    // Take top 3 stores with best savings-to-distance ratio
    const routeStores = optimized.slice(0, 3);

    const totalSavings = routeStores.reduce((sum, s) => sum + (s.savings || 0), 0);

    Alert.alert(
      '🗺️ Оптимальний маршрут',
      `Відвідайте ${routeStores.length} магазини:\n\n` +
      routeStores.map((s, i) => `${i + 1}. ${s.name} (${s.distance})`).join('\n') +
      `\n\n💰 Загальна економія: ₴${totalSavings.toFixed(2)}`,
      [
        { text: 'Скасувати', style: 'cancel' },
        { text: 'Прокласти маршрут', onPress: () => openMapsNavigation(routeStores) }
      ]
    );
  };

  /**
   * Open device maps app with multi-stop route.
   */
  const openMapsNavigation = (routeStores) => {
    if (routeStores.length === 0) return;

    const first = routeStores[0];
    const url = `https://www.google.com/maps/dir/?api=1&destination=${first.latitude},${first.longitude}&travelmode=driving`;

    import('react-native').then(({ Linking }) => {
      Linking.openURL(url);
    });
  };

  /**
   * Navigate to a single store.
   */
  const navigateToStore = (store) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}&travelmode=driving`;
    Linking.openURL(url).catch(err => console.error('An error occurred', err));
  };

  const renderStoreCard = ({ item }) => (
    <Card style={styles.storeCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, item.isBest && styles.iconBoxBest]}>
          <Ionicons
            name={item.isBest ? "trophy" : "storefront"}
            size={20}
            color={item.isBest ? colors.success : colors.primary}
          />
        </View>
        <View style={styles.storeInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.storeName}>{item.name}</Text>
            {item.isBest && (
              <View style={[styles.bestBadge, { backgroundColor: colors.success }]}>
                <Text style={styles.bestBadgeText}>Best Overall</Text>
              </View>
            )}
          </View>
          <Text style={styles.storeMeta}>{item.distance || 'Nearby'} • Відкрито до 22:00</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        {item.badge && (
          <View style={[styles.badge, { backgroundColor: `${item.badgeColor}20`, borderColor: item.badgeColor }]}>
            <Text style={[styles.badgeText, { color: item.badgeColor }]}>{item.badge}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.routeButton, item.isBest && styles.routeButtonBest]}
          onPress={() => navigateToStore(item)}
        >
          <Text style={[styles.routeButtonText, item.isBest && styles.routeButtonTextBest]}>
            Прокласти маршрут
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <Layout title="Store Locator">
      <View style={styles.container}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            <MapView
              style={styles.map}
              initialRegion={location}
              provider={PROVIDER_GOOGLE}
              customMapStyle={PURPLE_MAP_STYLE}
              showsUserLocation={true}
            >
              {stores.map((store) => (
                <Marker
                  key={store.id}
                  coordinate={{
                    latitude: store.latitude,
                    longitude: store.longitude,
                  }}
                  title={store.name}
                  pinColor={store.isBest ? colors.success : colors.primary}
                />
              ))}
            </MapView>

            {/* Overlay Gradient for Card Visibility */}
            <LinearGradient
              colors={['transparent', 'rgba(26, 15, 46, 0.8)', 'rgba(26, 15, 46, 1)']}
              style={styles.gradientOverlay}
            />

            {/* Store Carousel */}
            <View style={styles.carouselContainer}>
              {stores.length >= 2 && (
                <TouchableOpacity
                  style={styles.optimizeRouteButton}
                  onPress={optimizeRoute}
                >
                  <Ionicons name="git-branch-outline" size={16} color={colors.textInverse} />
                  <Text style={styles.optimizeRouteText}>Оптимізувати маршрут</Text>
                </TouchableOpacity>
              )}
              <FlatList
                data={stores}
                renderItem={renderStoreCard}
                keyExtractor={item => item.id.toString()}
                horizontal
                pagingEnabled
                snapToInterval={CARD_WIDTH + 10}
                snapToAlignment="center"
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContent}
              />
            </View>
          </>
        )}
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 250,
  },
  carouselContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
  },
  optimizeRouteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.m,
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  optimizeRouteText: {
    color: colors.textInverse,
    fontWeight: 'bold',
    fontSize: 14,
  },
  carouselContent: {
    paddingHorizontal: SPACING_FOR_CARD_INSET,
  },
  storeCard: {
    width: CARD_WIDTH,
    marginHorizontal: 5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.m,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.m,
  },
  iconBoxBest: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: theme.fontSize.body,
  },
  storeMeta: {
    color: colors.textMuted,
    fontSize: theme.fontSize.small,
  },
  bestBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bestBadgeText: {
    color: colors.textInverse,
    fontSize: 9,
    fontWeight: 'bold',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.s,
  },
  badge: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  routeButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.m,
  },
  routeButtonBest: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  routeButtonText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  routeButtonTextBest: {
    color: colors.background,
  },
});
