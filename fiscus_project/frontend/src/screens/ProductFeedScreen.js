/**
 * Product feed — search, filter by category, browse with pagination.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    TextInput,
    TouchableOpacity,
    Pressable,
    Platform,
    StyleSheet,
    ActivityIndicator,
    Animated,
    Image,
} from 'react-native';
import Icon from '../components/Icon';
import { ProductFeedSkeleton } from '../components/SkeletonLoader';
import { useProductStore, useCategoryStore } from '../stores';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import GlassCard from '../components/GlassCard';

// Simple debounce hook
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}

// Add-to-cart button with checkmark animation
function AddButton({ onPress }) {
    const [added, setAdded] = useState(false);
    const scale = useRef(new Animated.Value(1)).current;

    const handlePress = () => {
        if (added) return;
        onPress();
        setAdded(true);
        Animated.sequence([
            Animated.spring(scale, { toValue: 1.35, useNativeDriver: false, tension: 200 }),
            Animated.spring(scale, { toValue: 1, useNativeDriver: false, tension: 120 }),
        ]).start();
        setTimeout(() => setAdded(false), 1200);
    };

    return (
        <Pressable
            onPress={handlePress}
            style={({ pressed }) => [
                styles.addBtn,
                pressed && { opacity: 0.8 },
                Platform.OS === 'web' && { cursor: 'pointer' },
            ]}
            hitSlop={8}
        >
            <Animated.View style={{ transform: [{ scale }] }}>
                {added
                    ? <View style={styles.addedCircle}>
                        <Icon name="checkmark-circle" size={28} color={COLORS.accent} />
                    </View>
                    : <Icon name="add-circle" size={28} color={COLORS.primary} />
                }
            </Animated.View>
        </Pressable>
    );
}

export default function ProductFeedScreen({ route }) {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const debouncedSearch = useDebounce(search, 400);

    const { products, loading: productsLoading, loadingMore, fetchProducts, searchProducts, loadMoreProducts } = useProductStore();
    const { categories, fetchCategories } = useCategoryStore();
    const { addItem } = useCart();
    const { logout } = useAuth();
    const { viewMode, enabledChains } = useSettings();

    useEffect(() => {
        fetchCategories(route?.params?.chain);
    }, [route?.params?.chain]);

    useEffect(() => {
        if (debouncedSearch) {
            searchProducts(debouncedSearch);
        } else {
            const params = {};
            if (selectedCategory) params.category = selectedCategory;
            fetchProducts(params);
        }
    }, [debouncedSearch, selectedCategory]);

    const handleAddToCart = useCallback((item) => {
        const price = item.prices?.[0]?.price || 0;
        addItem({
            productId: item.id,
            name: item.name,
            price: item.latest_price || 0,
            image_url: item.image_url,
        });
    }, [addItem]);

    const renderProduct = useCallback(({ item }) => (
        <GlassCard style={viewMode === 'grid' ? styles.productCardGrid : styles.productCardList}>
            {item.image_url ? (
                <Image
                    source={{ uri: item.image_url }}
                    style={viewMode === 'grid' ? styles.productImageGrid : styles.productImage}
                    resizeMode="cover"
                />
            ) : (
                <View style={[viewMode === 'grid' ? styles.productImageGrid : styles.productImage, styles.productImagePlaceholder, {justifyContent: 'center', alignItems: 'center'}]}>
                    <Text style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 'bold' }}>немає ФОТО</Text>
                </View>
            )}

            <View style={viewMode === 'grid' ? styles.productInfoGrid : styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                {item.brand ? <Text style={styles.productBrand}>{item.brand}</Text> : null}
                {item.weight ? <Text style={styles.productWeight}>{item.weight}</Text> : null}
                {item.category_name ? <Text style={styles.categoryLabel}>{item.category_name}</Text> : null}

                <View style={styles.priceRow}>
                    {item.latest_price ? (
                        <>
                            <Text style={styles.priceRange}>
                                {Number(item.latest_price).toFixed(2)} ₴
                            </Text>
                            {item.latest_old_price != null && item.latest_old_price > item.latest_price && (
                                <Text style={styles.oldPrice}>
                                    {Number(item.latest_old_price).toFixed(2)} ₴
                                </Text>
                            )}
                        </>
                    ) : (
                        <Text style={styles.noPrice}>Ціна недоступна</Text>
                    )}
                </View>
                {viewMode === 'grid' && (
                    <View style={styles.addToCartGrid}>
                        <AddButton onPress={() => handleAddToCart(item)} />
                    </View>
                )}
            </View>

            {viewMode !== 'grid' && <AddButton onPress={() => handleAddToCart(item)} />}
        </GlassCard>
    ), [handleAddToCart, viewMode]);

    // Build category list from API
    const allCategories = [{ slug: null, name: 'Усі' }, ...(categories || [])];

    const renderCategoryChip = ({ item }) => {
        const isSelected = selectedCategory === item.slug;
        return (
            <TouchableOpacity
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(item.slug)}
            >
                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                    {item.name}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Sticky header: title + search + filters */}
            <View style={styles.stickyHeader}>
                <Text style={styles.screenTitle}>Продукти</Text>

                {/* Search bar */}
                <View style={styles.topBar}>
                    <View style={styles.searchBar}>
                        <Icon name="search" size={18} color={COLORS.textMuted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Пошук продуктів..."
                            placeholderTextColor={COLORS.textDark}
                            value={search}
                            onChangeText={setSearch}
                            returnKeyType="search"
                        />
                        {search.length > 0 && (
                            <TouchableOpacity onPress={() => setSearch('')}>
                                <Icon name="close-circle" size={18} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                        <Icon name="log-out-outline" size={18} color={COLORS.error} />
                    </TouchableOpacity>
                </View>

                {/* Category chips */}
                <FlatList
                    horizontal
                    data={allCategories}
                    renderItem={renderCategoryChip}
                    keyExtractor={(item) => item.slug || 'all'}
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoryList}
                    contentContainerStyle={{ paddingHorizontal: SPACING.md }}
                />

                {/* Chain toggles */}
                <View style={styles.chainTogglesContainer}>
                    <TouchableOpacity
                        style={[styles.chainToggle, !route?.params?.chain && styles.chainToggleActive]}
                        onPress={() => {
                            if (route && route.params) route.params.chain = null;
                            const params = { ...(selectedCategory ? { category: selectedCategory } : {}) };
                            fetchProducts(params);
                        }}
                    >
                        <Text style={[styles.chainToggleText, !route?.params?.chain && styles.chainToggleTextActive]}>Всі магазини</Text>
                    </TouchableOpacity>
                    {enabledChains?.atb !== false && (
                        <TouchableOpacity
                            style={[styles.chainToggle, route?.params?.chain === 'atb' && styles.chainToggleActive]}
                            onPress={() => {
                                if (!route) route = { params: {} };
                                else if (!route.params) route.params = {};
                                route.params.chain = 'atb';
                                const params = { chain: 'atb', ...(selectedCategory ? { category: selectedCategory } : {}) };
                                fetchProducts(params);
                            }}
                        >
                            <Text style={[styles.chainToggleText, route?.params?.chain === 'atb' && styles.chainToggleTextActive]}>АТБ</Text>
                        </TouchableOpacity>
                    )}
                    {enabledChains?.silpo !== false && (
                        <TouchableOpacity
                            style={[styles.chainToggle, route?.params?.chain === 'silpo' && styles.chainToggleActive]}
                            onPress={() => {
                                if (!route) route = { params: {} };
                                else if (!route.params) route.params = {};
                                route.params.chain = 'silpo';
                                const params = { chain: 'silpo', ...(selectedCategory ? { category: selectedCategory } : {}) };
                                fetchProducts(params);
                            }}
                        >
                            <Text style={[styles.chainToggleText, route?.params?.chain === 'silpo' && styles.chainToggleTextActive]}>Сільпо</Text>
                        </TouchableOpacity>
                    )}
                    {enabledChains?.auchan !== false && (
                        <TouchableOpacity
                            style={[styles.chainToggle, route?.params?.chain === 'auchan' && styles.chainToggleActive]}
                            onPress={() => {
                                if (!route) route = { params: {} };
                                else if (!route.params) route.params = {};
                                route.params.chain = 'auchan';
                                const params = { chain: 'auchan', ...(selectedCategory ? { category: selectedCategory } : {}) };
                                fetchProducts(params);
                            }}
                        >
                            <Text style={[styles.chainToggleText, route?.params?.chain === 'auchan' && styles.chainToggleTextActive]}>Ашан</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Products list */}
            {productsLoading ? (
                <ProductFeedSkeleton count={6} mode={viewMode} />
            ) : (
                <FlatList
                    key={viewMode}
                    numColumns={viewMode === 'grid' ? 2 : 1}
                    data={Array.isArray(products) ? products : products?.results || []}
                    renderItem={renderProduct}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    onEndReached={() => {
                        if (!productsLoading && !loadingMore && !debouncedSearch) {
                            loadMoreProducts();
                        }
                    }}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        loadingMore ? (
                            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: SPACING.md }} />
                        ) : null
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Icon name="search-outline" size={48} color={COLORS.textMuted} />
                            <Text style={styles.emptyText}>Продукти не знайдено</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bgPrimary,
    },
    stickyHeader: {
        backgroundColor: COLORS.bgPrimary,
        paddingTop: SPACING.md,
        paddingBottom: SPACING.xs,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.glassBorder,
        zIndex: 100, // Increased zIndex to ensure it stays above scrolling content
        ...Platform.select({
            web: { position: 'sticky', top: 0 },
            default: {},
        }),
    },
    screenTitle: {
        ...FONTS.title,
        paddingHorizontal: SPACING.md,
        marginBottom: SPACING.sm,
        display: 'none', // Hide our custom title if the Navigator is already showing one, or keep it if you want it here instead of the Navigator. I'll hide it to prevent duplicates based on the screenshot showing two "Продукти".
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        gap: SPACING.sm,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bgInput,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.sm,
        height: 40,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    searchInput: {
        flex: 1,
        marginLeft: SPACING.xs,
        color: COLORS.textPrimary,
        fontSize: 14,
    },
    logoutBtn: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.md,
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(244, 63, 94, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryList: {
        marginVertical: SPACING.sm,
        maxHeight: 36,
    },
    categoryChip: {
        paddingHorizontal: SPACING.md,
        paddingVertical: 6,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.glass,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        marginRight: SPACING.xs,
    },
    categoryChipActive: {
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        borderColor: COLORS.primary,
    },
    categoryChipText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    categoryChipTextActive: {
        color: COLORS.primary,
    },
    chainTogglesContainer: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.xs,
        gap: SPACING.sm,
    },
    chainToggle: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.glassLight,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    chainToggleActive: {
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        borderColor: COLORS.accent,
    },
    chainToggleText: {
        ...FONTS.medium,
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    chainToggleTextActive: {
        color: COLORS.accent,
    },
    listContent: {
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.sm,
        paddingBottom: 120,
    },
    productCardList: {
        flexDirection: 'row',
        marginBottom: SPACING.sm,
        alignItems: 'center',
    },
    productCardGrid: {
        flex: 1,
        margin: SPACING.xs,
        padding: SPACING.sm,
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    productImage: {
        width: 64,
        height: 64,
        borderRadius: RADIUS.md,
    },
    productImageGrid: {
        width: '100%',
        height: 120,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.sm,
    },
    productImagePlaceholder: {
        backgroundColor: COLORS.glassLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    productInfo: {
        flex: 1,
        marginLeft: SPACING.sm,
    },
    productInfoGrid: {
        flex: 1,
        width: '100%',
    },
    productName: {
        ...FONTS.medium,
        fontSize: 13,
        lineHeight: 18,
    },
    productBrand: {
        ...FONTS.caption,
        marginTop: 1,
    },
    productWeight: {
        ...FONTS.caption,
        color: COLORS.textDark,
        marginTop: 1,
    },
    categoryLabel: {
        color: COLORS.primaryLight,
        fontSize: 10,
        marginTop: 2,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.xs,
        gap: SPACING.xs,
    },
    priceRange: {
        ...FONTS.price,
        fontSize: 15,
    },
    priceChains: {
        ...FONTS.caption,
        color: COLORS.textMuted,
        fontSize: 10,
    },
    noPrice: {
        ...FONTS.caption,
        color: COLORS.textDark,
    },
    oldPrice: {
        ...FONTS.priceOld,
        fontSize: 12,
    },
    addBtn: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: SPACING.sm,
        minWidth: 36,
        minHeight: 36,
    },
    addToCartGrid: {
        position: 'absolute',
        bottom: 0,
        right: -8,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: SPACING.xxl * 2,
    },
    emptyText: {
        ...FONTS.caption,
        marginTop: SPACING.md,
        fontSize: 14,
    },
    addedCircle: {
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
