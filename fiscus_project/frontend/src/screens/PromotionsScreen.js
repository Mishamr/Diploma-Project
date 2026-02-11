import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    RefreshControl,
    Dimensions,
    ActivityIndicator,
    Image,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { theme, colors, spacing, typography } from '../theme';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import apiClient from '../api/client'; // Import apiClient directly for now

const { width } = Dimensions.get('window');

/**
 * Promotions Screen Component.
 */
export default function PromotionsScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stores, setStores] = useState([]);
    const [selectedStore, setSelectedStore] = useState('atb');
    const [promotions, setPromotions] = useState([]);
    const [error, setError] = useState(null);

    // Fetch stores list
    const fetchStores = async () => {
        try {
            const response = await apiClient.get('/promotions/stores/');
            if (response.data && response.data.stores) {
                setStores(response.data.stores);
                // Select first store if none selected
                if (!selectedStore && response.data.stores.length > 0) {
                    setSelectedStore(response.data.stores[0].id);
                }
            }
        } catch (err) {
            console.error('Failed to fetch stores:', err);
            // Fallback stores if API fails
            setStores([
                { id: 'atb', name: 'АТБ' },
                { id: 'silpo', name: 'Сільпо' },
            ]);
        }
    };

    // Fetch promotions for selected store
    const fetchPromotions = async (storeId) => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get(`/promotions/${storeId}/`);
            if (response.data && response.data.products) {
                setPromotions(response.data.products);
            } else {
                setPromotions([]);
            }
        } catch (err) {
            console.error('Failed to fetch promotions:', err);
            setError('Не вдалося завантажити акції');
            setPromotions([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchStores();
    }, []);

    // Load promotions when store changes
    useEffect(() => {
        if (selectedStore) {
            fetchPromotions(selectedStore);
        }
    }, [selectedStore]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchStores();
        if (selectedStore) {
            fetchPromotions(selectedStore);
        }
    }, [selectedStore]);

    const renderStoreItem = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.storeChip,
                selectedStore === item.id && styles.storeChipSelected
            ]}
            onPress={() => setSelectedStore(item.id)}
        >
            <Text style={[
                styles.storeChipText,
                selectedStore === item.id && styles.storeChipTextSelected
            ]}>
                {item.name}
            </Text>
        </TouchableOpacity>
    );

    const renderPromotionItem = ({ item }) => (
        <Card style={styles.promoCard}>
            <View style={styles.promoImageContainer}>
                {item.image_url ? (
                    <Image
                        source={{ uri: item.image_url }}
                        style={styles.promoImagePlaceholder}
                        resizeMode="contain"
                    />
                ) : (
                    <LinearGradient
                        colors={['#f0f0f0', '#e0e0e0']}
                        style={styles.promoImagePlaceholder}
                    >
                        <Ionicons name="image-outline" size={32} color="#ccc" />
                    </LinearGradient>
                )}
                <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>-{item.discount}%</Text>
                </View>
            </View>

            <View style={styles.promoContent}>
                <Text style={styles.promoTitle} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.promoCategory}>{item.category}</Text>

                <View style={styles.priceRow}>
                    <Text style={styles.currentPrice}>₴{item.price.toFixed(2)}</Text>
                    {item.old_price && (
                        <Text style={styles.oldPrice}>₴{item.old_price.toFixed(2)}</Text>
                    )}
                </View>
            </View>
        </Card>
    );

    return (
        <Layout title="Акції та Знижки">
            <View style={styles.container}>
                {/* Stores Selector */}
                <View style={styles.storesContainer}>
                    <Text style={styles.sectionTitle}>Магазини</Text>
                    <FlatList
                        data={stores}
                        renderItem={renderStoreItem}
                        keyExtractor={item => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.storesList}
                    />
                </View>

                {/* Promotions Grid */}
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={styles.loadingText}>Завантаження акцій...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={promotions}
                        renderItem={renderPromotionItem}
                        keyExtractor={item => item.id}
                        numColumns={2}
                        columnWrapperStyle={styles.promoRow}
                        contentContainerStyle={styles.promoList}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>Немає акцій для цього магазину</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </Layout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    storesContainer: {
        paddingVertical: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: theme.spacing.m,
        marginBottom: theme.spacing.s,
        color: theme.colors.text,
    },
    storesList: {
        paddingHorizontal: theme.spacing.m,
        gap: 10,
    },
    storeChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    storeChipSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    storeChipText: {
        color: theme.colors.text,
        fontWeight: '500',
    },
    storeChipTextSelected: {
        color: theme.colors.textInverse,
        fontWeight: 'bold',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: theme.colors.textMuted,
    },
    promoList: {
        padding: theme.spacing.m,
    },
    promoRow: {
        justifyContent: 'space-between',
    },
    promoCard: {
        width: (width - theme.spacing.m * 3) / 2,
        marginBottom: theme.spacing.m,
        padding: 0,
        overflow: 'hidden',
    },
    promoImageContainer: {
        height: 120,
        position: 'relative',
    },
    promoImagePlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    discountBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: theme.colors.danger,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    discountText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    promoContent: {
        padding: theme.spacing.s,
    },
    promoTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
        height: 40,
        marginBottom: 4,
    },
    promoCategory: {
        fontSize: 12,
        color: theme.colors.textMuted,
        marginBottom: 8,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    currentPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.danger,
    },
    oldPrice: {
        fontSize: 12,
        color: theme.colors.textMuted,
        textDecorationLine: 'line-through',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: theme.colors.textMuted,
        textAlign: 'center',
    },
});

