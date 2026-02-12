/**
 * @fileoverview Product Feed Screen.
 * 
 * Main screen displaying list of products with search and filtering.
 * Features:
 * - Pull-to-refresh
 * - Infinite scrolling (pagination)
 * - Real-time search
 * - Add to cart functionality
 * 
 * @module screens/ProductFeed
 */

import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
    View,
    Text,
    FlatList,
    TextInput,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl,
    SafeAreaView,
    Platform,
    Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

// API & Context
import { getProducts } from '../api/client';
import { CartContext } from '../context/CartContext';

// Components & Theme
import Card from '../components/Card';
import PriceTag from '../components/PriceTag';
import StatusBanner from '../components/StatusBanner';
import OnboardingGuide from '../components/OnboardingGuide';
import { theme, colors, spacing, typography, getShadow } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

/**
 * Category icon and color mapping for visual product display.
 */
const getCategoryVisuals = (category) => {
    const categoryMap = {
        'Молочні продукти': { icon: 'water', colors: ['#00b4d8', '#0077b6'], emoji: '🥛' },
        'Хлібобулочні': { icon: 'nutrition', colors: ['#e9c46a', '#f4a261'], emoji: '🍞' },
        'М\'ясо': { icon: 'fast-food', colors: ['#ef476f', '#d62828'], emoji: '🥩' },
        'Овочі': { icon: 'leaf', colors: ['#52b788', '#40916c'], emoji: '🥬' },
        'Фрукти': { icon: 'nutrition-outline', colors: ['#ffb703', '#fb8500'], emoji: '🍎' },
        'Напої': { icon: 'cafe', colors: ['#8338ec', '#9d4edd'], emoji: '🥤' },
        'Крупи': { icon: 'grid', colors: ['#bc6c25', '#dda15e'], emoji: '🌾' },
        'Солодощі': { icon: 'heart', colors: ['#f72585', '#b5179e'], emoji: '🍫' },
        'Заморожені': { icon: 'snow', colors: ['#48cae4', '#00b4d8'], emoji: '❄️' },
        'Консерви': { icon: 'archive', colors: ['#718c9e', '#adb5bd'], emoji: '🥫' },
    };

    return categoryMap[category] || {
        icon: 'cube',
        colors: ['#9d4edd', '#7b2cbf'],
        emoji: '📦'
    };
};

/**
 * Product Item Component (Memoized for performance).
 */
const ProductItem = React.memo(({ item, onAdd }) => {
    const visuals = getCategoryVisuals(item.category);

    return (
        <Card style={styles.productCard}>
            <View style={styles.productInfo}>
                {item.image_url ? (
                    <Image
                        source={{ uri: item.image_url }}
                        style={styles.productImage}
                        resizeMode="contain"
                    />
                ) : (
                    <LinearGradient
                        colors={visuals.colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.productImage}
                    >
                        <Ionicons name={visuals.icon} size={32} color="rgba(255,255,255,0.95)" />
                        {item.cheapest_option && (
                            <View style={styles.priceBadge}>
                                <Text style={styles.priceBadgeText}>₴{item.cheapest_option.price}</Text>
                            </View>
                        )}
                    </LinearGradient>
                )}

                <View style={styles.textContainer}>
                    <Text style={styles.productName} numberOfLines={2}>
                        {item.name}
                    </Text>
                    <Text style={styles.productCategory}>
                        {visuals.emoji} {item.category || 'Без категорії'}
                    </Text>

                    {item.cheapest_option ? (
                        <View style={styles.priceContainer}>
                            <PriceTag
                                amount={item.cheapest_option.price}
                                size="medium"
                                variant="success"
                            />
                            <Text style={styles.storeName}>
                                @ {item.cheapest_option.store_name}
                            </Text>
                        </View>
                    ) : (
                        <Text style={styles.noPrice}>Немає в наявності</Text>
                    )}
                </View>
            </View>

            <TouchableOpacity
                style={styles.addButton}
                activeOpacity={0.7}
                onPress={() => onAdd(item)}
            >
                <LinearGradient
                    colors={['#52b788', '#40916c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.addButtonGradient}
                >
                    <Ionicons name="cart" size={16} color="#fff" />
                    <Text style={styles.addButtonText}>В кошик</Text>
                </LinearGradient>
            </TouchableOpacity>
        </Card>
    );
});

/**
 * Product Feed Screen Component.
 */
export default function ProductFeed() {
    const navigation = useNavigation();
    const { addToCart, total, itemCount } = useContext(CartContext);

    // State
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [error, setError] = useState(null);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    /**
     * Load products from API.
     * @param {boolean} isRefresh - Whether this is a pull-to-refresh action.
     */
    const loadProducts = useCallback(async (isRefresh = false, query = '') => {
        if (!isRefresh && !products.length) setLoading(true);
        setError(null);

        try {
            const response = await getProducts(query);
            const apiProducts = response.data.results || response.data || [];
            setProducts(apiProducts);
        } catch (err) {
            console.warn('API unavailable:', err.message);
            setError('Сервер недоступний. Запустіть бекенд (fiscus.bat → [8])');
            setProducts([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [products.length]);

    // Load when debouncedQuery changes
    useEffect(() => {
        loadProducts(false, debouncedQuery);
    }, [debouncedQuery]);

    // Refresh handler
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadProducts(true);
    }, [loadProducts]);

    // Add to cart handler
    const handleAddToCart = useCallback((item) => {
        if (item.cheapest_option) {
            addToCart({
                id: item.id,
                name: item.name,
                price: item.cheapest_option.price,
                store: item.cheapest_option.store_name,
            });
        } else {
            // Fallback if no price available
            addToCart({
                id: item.id,
                name: item.name,
                price: 0,
                store: 'Unknown',
            });
        }
    }, [addToCart]);

    // Header Component (Search + Status + Quick Nav)
    const ListHeader = useCallback(() => (
        <View style={styles.header}>
            <StatusBanner />

            {/* Quick Navigation Buttons */}
            <View style={styles.quickNav}>
                <TouchableOpacity
                    style={[styles.quickNavButton, styles.quickNavPromo]}
                    onPress={() => navigation.navigate('Promotions')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.quickNavEmoji}>🔥</Text>
                    <Text style={styles.quickNavText}>Акції</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.quickNavButton}
                    onPress={() => navigation.navigate('Comparison')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.quickNavEmoji}>📊</Text>
                    <Text style={styles.quickNavText}>Порівняти</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.quickNavButton}
                    onPress={() => navigation.navigate('Map')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.quickNavEmoji}>🗺️</Text>
                    <Text style={styles.quickNavText}>Карта</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.quickNavButton}
                    onPress={() => navigation.navigate('Survival')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.quickNavEmoji}>🎯</Text>
                    <Text style={styles.quickNavText}>Survival</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="🔍 Пошук товарів..."
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                />
            </View>
        </View>
    ), [searchQuery, navigation]);

    // Setup header right button (Cart icon)
    React.useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => navigation.navigate('Cart')}
                >
                    <Text style={styles.headerEmoji}>🛒</Text>
                    {itemCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                                {itemCount > 99 ? '99+' : itemCount}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            ),
        });
    }, [navigation, itemCount]);

    if (loading && !refreshing) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Tutorial Modal */}
            <OnboardingGuide />

            <FlatList
                data={products}
                renderItem={({ item }) => (
                    <ProductItem item={item} onAdd={handleAddToCart} />
                )}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
                ListHeaderComponent={ListHeader}
                ListEmptyComponent={
                    !loading && (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyEmoji}>😕</Text>
                            <Text style={styles.emptyText}>
                                {error || 'Товарів не знайдено'}
                            </Text>
                            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
                                <Text style={styles.retryText}>Оновити</Text>
                            </TouchableOpacity>
                        </View>
                    )
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    header: {
        marginBottom: spacing.m,
    },
    searchContainer: {
        padding: spacing.m,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    searchInput: {
        backgroundColor: colors.background,
        color: colors.text,
        padding: spacing.m,
        borderRadius: theme.borderRadius.m,
        fontSize: 16,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    listContent: {
        paddingBottom: spacing.xxl,
    },
    productCard: {
        marginHorizontal: spacing.m,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    productInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    productImage: {
        width: 70,
        height: 70,
        borderRadius: theme.borderRadius.l,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.m,
        position: 'relative',
    },
    priceBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: colors.success,
        paddingHorizontal: spacing.xs,
        paddingVertical: 2,
        borderRadius: 8,
    },
    priceBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    textContainer: {
        flex: 1,
        marginRight: spacing.s,
    },
    productName: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    productCategory: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    storeName: {
        ...typography.small,
        color: colors.textMuted,
        marginLeft: spacing.s,
    },
    noPrice: {
        ...typography.caption,
        color: colors.danger,
    },
    addButton: {
        borderRadius: theme.borderRadius.m,
        overflow: 'hidden',
        ...getShadow('small'),
    },
    addButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.s,
        paddingHorizontal: spacing.m,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 12,
    },
    headerButton: {
        marginRight: spacing.m,
        position: 'relative',
        padding: 4,
    },
    headerEmoji: {
        fontSize: 24,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: colors.danger,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: spacing.xxl,
        padding: spacing.l,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: spacing.m,
    },
    emptyText: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.l,
    },
    retryButton: {
        paddingVertical: spacing.s,
        paddingHorizontal: spacing.l,
        backgroundColor: colors.surface,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    retryText: {
        color: colors.primary,
        fontWeight: '600',
    },
    quickNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.m,
        paddingHorizontal: spacing.s,
    },
    quickNavButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.s,
        marginHorizontal: 4,
        backgroundColor: colors.surface,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        borderColor: colors.border,
    },
    quickNavPromo: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: colors.danger,
    },
    quickNavEmoji: {
        fontSize: 20,
        marginBottom: 2,
    },
    quickNavText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textSecondary,
    },
});
