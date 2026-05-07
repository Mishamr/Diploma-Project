/**
 * Promotions screen — minimalist light-purple theme. No LinearGradient, no Icon in content.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Platform } from 'react-native';
import { usePromotionStore } from '../stores';
import { useCart } from '../context/CartContext';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import { CHAINS, getChainName, getChainColor } from '../constants/stores';
import StoreChip from '../components/StoreChip';



export default function PromotionsScreen() {
    const { promotions, loading, fetchPromotions } = usePromotionStore();
    const { addItem } = useCart();
    const [selectedChain, setSelectedChain] = useState(null);

    useEffect(() => { fetchPromotions(30, selectedChain); }, [selectedChain]);

    const rawData = promotions || [];
    const displayData = selectedChain
        ? rawData.filter(p => (p.chain_slug || '').toLowerCase() === selectedChain.toLowerCase())
        : rawData;

    const allChains = [{ slug: null, name: 'Усі', icon: '🔥' }, ...CHAINS];

    const renderPromo = ({ item }) => {
        const discount = item.old_price ? Math.round((1 - item.price / item.old_price) * 100) : 0;
        const productName = item.product_name || item.name || item.title || 'Товар';

        return (
            <View style={styles.card}>
                {/* Product image */}
                {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
                ) : (
                    <View style={[styles.image, { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface }]}>
                        <Text style={{ fontSize: 20 }}>🛒</Text>
                    </View>
                )}

                {/* Info */}
                <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={2}>{productName}</Text>
                    <View style={styles.chainRow}>
                        <View style={[styles.dot, { backgroundColor: getChainColor(item.chain_slug) }]} />
                        <Text style={styles.chainLabel}>{item.chain || getChainName(item.chain_slug)}</Text>
                    </View>
                    <View style={styles.priceRow}>
                        <Text style={styles.price}>{item.price?.toFixed(2)} ₴</Text>
                        {item.old_price && <Text style={styles.oldPrice}>{item.old_price.toFixed(2)} ₴</Text>}
                    </View>
                </View>

                {/* Right: discount badge + add to cart */}
                <View style={styles.actions}>
                    {discount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>-{discount}%</Text>
                        </View>
                    )}
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => addItem({ productId: item.id, name: productName, price: item.price })}
                    >
                        <Text style={styles.addBtnText}>+</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerIcon}>🏷️</Text>
                <Text style={styles.headerTitle}>Топ акції</Text>

            </View>

            {/* Chain filter */}
            <FlatList
                horizontal
                data={allChains}
                renderItem={({ item: c }) => (
                    <StoreChip
                        chain={c}
                        selected={selectedChain === c.slug}
                        onPress={() => setSelectedChain(c.slug)}
                    />
                )}
                keyExtractor={c => c.slug || 'all'}
                showsHorizontalScrollIndicator={false}
                style={styles.chips}
                contentContainerStyle={{ paddingHorizontal: SPACING.md, alignItems: 'center' }}
            />

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={displayData}
                    style={{ flex: 1 }}
                    showsVerticalScrollIndicator={Platform.OS === 'web'}
                    renderItem={renderPromo}
                    keyExtractor={(i, idx) => `${i.id || idx}`}
                    contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: 40 }}
                    ListEmptyComponent={<Text style={styles.empty}>Акції не знайдено</Text>}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: Platform.OS === 'web'
        ? { height: '100vh', backgroundColor: COLORS.bgPrimary, overflow: 'hidden' }
        : { flex: 1, backgroundColor: COLORS.bgPrimary },

    header: {
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        backgroundColor: COLORS.bgCard,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
        flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    },
    headerIcon: { fontSize: 20 },
    headerTitle: { ...FONTS.subtitle, color: COLORS.textPrimary },


    chips: { marginVertical: SPACING.sm, maxHeight: 40 },

    card: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.bgCard,
        borderWidth: 1, borderColor: COLORS.border,
        borderRadius: RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.sm,
    },
    image: { width: 56, height: 56, borderRadius: RADIUS.sm },
    info: { flex: 1, marginLeft: SPACING.sm },
    name: { ...FONTS.medium, fontSize: 13, lineHeight: 18 },
    chainRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
    dot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
    chainLabel: { ...FONTS.caption, fontSize: 11 },
    priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 6 },
    price: { ...FONTS.price, fontSize: 15 },
    oldPrice: { ...FONTS.priceOld, fontSize: 12 },
    actions: { alignItems: 'flex-end', justifyContent: 'space-between', marginLeft: SPACING.xs, gap: SPACING.xs },
    badge: {
        borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2,
        backgroundColor: COLORS.warning,
    },
    badgeText: { color: '#fff', fontWeight: '800', fontSize: 11 },
    addBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: COLORS.primarySoft,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: COLORS.border,
    },
    addBtnText: { fontSize: 22, color: COLORS.primary, fontWeight: '700', lineHeight: 26 },
    empty: { ...FONTS.caption, textAlign: 'center', marginTop: 60, fontSize: 15 },
});
